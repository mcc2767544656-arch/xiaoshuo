import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../server/index.mjs';
const password = 'test-only-qidu-strong-password';
async function start(dataDir, pass = password) {
  const app = await createApp({ dataDir, password: pass, production: false });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  return { ...app, base, call: (path, options={}) => fetch(base+path, options), close: () => new Promise(resolve => { app.server.close(resolve); app.server.closeAllConnections(); }) };
}
async function login(app) {
  const response = await app.call('/api/login', { method:'POST', headers:{Origin:app.base, 'Content-Type':'application/json'}, body:JSON.stringify({password}) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie'); assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=Strict/);
  const {csrf} = await response.json();
  return {Cookie:cookie.split(';')[0], Origin:app.base, 'X-CSRF-Token':csrf};
}
test('private API: auth, CSRF, formats, deduplication, CAS, restart, password rotation, logout', async()=>{
  const dataDir = await mkdtemp(join(tmpdir(),'qidu-api-')); let app;
  try {
    app = await start(dataDir);
    assert.equal((await app.call('/api/health')).status, 200);
    assert.equal((await app.call('/api/status').then(r=>r.json())).authenticated,false);
    assert.equal((await app.call('/api/books')).status,401);
    assert.equal((await app.call('/api/login',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{"password":"abc"}'})).status,403);
    assert.equal((await app.call('/api/login',{method:'POST',headers:{Origin:app.base,'Content-Type':'application/json'},body:'{"password":"wrong"}'})).status,401);
    let headers = await login(app);
    const session = app.db.prepare('SELECT * FROM sessions').get();
    assert.equal(session.hash.length,64); assert.ok(!headers.Cookie.includes(session.hash));
    assert.equal((await app.call('/api/books',{method:'POST',headers:{Cookie:headers.Cookie, Origin:app.base,'X-Book-Name':'x.txt'},body:'abc'})).status,403);
    assert.equal((await app.call('/api/books',{method:'POST',headers:{...headers,Origin:'https://evil.example','X-Book-Name':'x.txt'},body:'abc'})).status,403);
    const ids=[];
    for (const [file,name] of [['public/samples/mountain.txt','跨设备测试.txt'],['public/samples/moon.epub','月亮.epub'],['public/samples/slow.pdf','慢读.pdf']]) {
      const bytes=await readFile(resolve(file));
      const options={method:'POST',headers:{...headers,'X-Book-Name':encodeURIComponent(name),'Content-Type':'application/octet-stream'},body:bytes};
      const response=await app.call('/api/books',options); assert.equal(response.status,201,await response.clone().text());
      const {book}=await response.json();ids.push(book.id);
      assert.equal((await app.call(`/api/books/${book.id}/file`)).status,401);
      const download=await app.call(`/api/books/${book.id}/file`,{headers}); assert.equal(download.headers.get('cache-control'),'no-store');
      assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
      const duplicate=await app.call('/api/books',options); assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).duplicate,true);
    }
    const invalid = await app.call('/api/books',{method:'POST',headers:{...headers,'X-Book-Name':'invalid.epub'},body:'x'});assert.equal(invalid.status,415);
    assert.equal((await app.call('/api/books',{method:'POST',headers:{...headers,'X-Book-Name':'x.exe'},body:'abc'})).status,415);
    assert.equal((await app.call('/api/books',{method:'POST',headers:{...headers,'X-Book-Name':'..%2Fbad.txt'},body:'abc'})).status,400);
    const books=await app.call('/api/books',{headers}).then(r=>r.json());assert.equal(books.books.length,3);
    const patch=(version, metadata)=>app.call(`/api/books/${ids[0]}`,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({version,metadata})});
    assert.equal((await patch(1,{progress:-1})).status,400);
    const concurrent=await Promise.all([patch(1,{progress:42,favorite:true,location:{chapter:1,scroll:.5},bookmarks:[]}),patch(1,{progress:55})]);
    assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
    const winner=(await app.call('/api/books',{headers}).then(r=>r.json())).books.find(b=>b.id===ids[0]);assert.equal(winner.cloudVersion,2);
    assert.equal((await app.call(`/api/books/${ids[0]}`,{method:'DELETE',headers})).status,404);
    await app.close(); app=await start(dataDir); headers.Origin=app.base;
    assert.equal((await app.call('/api/books',{headers}).then(r=>r.json())).books.length,3);
    assert.equal((await app.call('/api/status',{headers}).then(r=>r.json())).authenticated,true);
    assert.equal((await app.call('/api/logout',{method:'POST',headers})).status,200);
    assert.equal((await app.call('/api/books',{headers})).status,401);
    headers=await login(app);
    await app.close(); app=await start(dataDir,'rotated-new-strong-password');
    assert.equal((await app.call('/api/books',{headers})).status,401);
  } finally { if(app?.server.listening) await app.close(); await rm(dataDir,{recursive:true,force:true}); }
});
test('production refuses missing HTTPS origin or weak access password',async()=>{
  await assert.rejects(createApp({production:true,origin:'http://example.com',password}),/HTTPS|APP_ORIGIN/);
  await assert.rejects(createApp({production:true,origin:'https://example.com',password:'short'}),/12/);
});
