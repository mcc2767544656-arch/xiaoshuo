import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, mkdir, open, rename, unlink, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, sep, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes, createHash, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { openStore } from './store.mjs';

const scrypt = promisify(scryptCb);
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_FILE = 100 * 1024 * 1024;
const MAX_TOTAL = 500 * 1024 * 1024;
const MAX_BOOKS = 500;
const WEEK = 7 * 86400_000;
const cookieName = 'qidu_session';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.pdf': 'application/pdf', '.epub': 'application/epub+zip', '.png': 'image/png' };
const fail = (status, message) => Object.assign(new Error(message), { status });
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function bodyJson(req, limit = 64 * 1024) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, '需要 JSON 请求');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw fail(413, '请求内容过大'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw fail(400, '请求格式不正确'); }
}
function publicBook(row) {
  return { id: row.id, title: row.name.replace(/\.[^.]+$/, ''), author: '我的云端藏书', format: row.format, size: row.size, added: row.added, style: ({ TXT: 'mountain', EPUB: 'moon', PDF: 'art' })[row.format], category: '私人云端书库', remote: true, ...JSON.parse(row.metadata), cloudVersion: row.version };
}
function checkedMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail(400, '阅读记录格式不正确');
  const output = {};
  for (const key of ['progress', 'lastRead', 'minutes']) if (value[key] !== undefined) {
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0 || (key === 'progress' && value[key] > 100)) throw fail(400, '阅读数值不正确');
    output[key] = value[key];
  }
  if (value.favorite !== undefined) { if (typeof value.favorite !== 'boolean') throw fail(400, '收藏格式不正确'); output.favorite = value.favorite; }
  // Reader locations and bookmarks are opaque JSON, never interpreted as paths or HTML.
  for (const key of ['location', 'bookmarks']) if (value[key] !== undefined) output[key] = value[key];
  if (output.bookmarks && (!Array.isArray(output.bookmarks) || output.bookmarks.length > 200)) throw fail(400, '每本书最多保存 200 个书签');
  if (JSON.stringify(output).length > 48 * 1024) throw fail(413, '阅读记录过大');
  return output;
}

export async function createApp(options = {}) {
  const production = options.production ?? process.env.NODE_ENV === 'production';
  const dataDir = resolve(options.dataDir || process.env.QIDU_DATA_DIR || join(rootDir, '.data'));
  const dist = resolve(options.dist || join(rootDir, 'dist'));
  let origin = options.origin || process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || '';
  if (production && (!origin || new URL(origin).protocol !== 'https:')) throw new Error('Production requires APP_ORIGIN=https://your-domain (or RENDER_EXTERNAL_URL).');
  if (origin) origin = new URL(origin).origin;
  let password = options.password || process.env.QIDU_ACCESS_PASSWORD;
  if (password && password.length > 256) throw new Error('Access password must be at most 256 characters.');
  if (production && (!password || password.length < 12)) throw new Error('Set QIDU_ACCESS_PASSWORD to a unique password of at least 12 characters.');
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  if (!password) {
    const localPasswordFile = join(dataDir, 'local-access.txt');
    try { password = (await readFile(localPasswordFile, 'utf8')).trim(); }
    catch { password = token(); await writeFile(localPasswordFile, password, { mode: 0o600, flag: 'wx' }); }
  }

  const filesDir = join(dataDir, 'books'); await mkdir(filesDir, { recursive: true, mode: 0o700 });
  const db = openStore(dataDir);
  const savedSalt = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('password_salt');
  const salt = savedSalt ? Buffer.from(savedSalt.value, 'hex') : randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64); password = undefined;
  const previous = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('password_verifier');
  if (previous?.value !== passwordHash.toString('hex')) db.exec('DELETE FROM sessions');
  const putSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  putSetting.run('password_salt', salt.toString('hex'));
  putSetting.run('password_verifier', passwordHash.toString('hex'));
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
  const attempts = new Map(); let passwordJobs = 0, uploadBusy = false;
  function session(req) {
    const raw = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!raw || !/^[\w-]{43}$/.test(raw)) return null;
    return db.prepare('SELECT * FROM sessions WHERE hash = ? AND expires > ?').get(hash(raw), Date.now());
  }
  const setCookie = (res, value, maxAge = WEEK / 1000) => res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production ? '; Secure' : ''}`);
  const currentOrigin = req => origin || `http://${req.headers.host}`;
  const authenticated = req => { const found = session(req); if (!found) throw fail(401, '请先进入私人书房'); return found; };
  function checkWrite(req, auth) {
    if (req.headers.origin !== currentOrigin(req)) throw fail(403, '拒绝跨站请求，请从栖读页面操作');
    if (auth && req.headers['x-csrf-token'] !== auth.csrf) throw fail(403, '页面验证已失效，请刷新');
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    // epub.js uses sandboxed blob frames and local inline styles; no external scripts or connections.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data: blob:; connect-src 'self' blob:; frame-src blob: 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = decodeURIComponent(url.pathname);
      if (req.method === 'GET' && path === '/api/health') return json(res, 200, { ok: true });
      if (origin && req.headers.host !== new URL(origin).host) throw fail(421, '访问域名不匹配');
      if (!origin && !/^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(req.headers.host || '')) throw fail(421, '本地服务不接受这个域名');
      if (path === '/api/status' && req.method === 'GET') {
        const auth = session(req);
        return json(res, 200, { version: '0.2.0', authenticated: Boolean(auth), csrf: auth?.csrf, mode: production ? 'hosted' : 'local', quark: { connected: false, available: false }, limits: { fileBytes: MAX_FILE, totalBytes: MAX_TOTAL, books: MAX_BOOKS } });
      }
      if (path === '/api/login' && req.method === 'POST') {
        checkWrite(req);
        const now = Date.now(), ip = req.socket.remoteAddress || 'unknown';
        for (const [key, entry] of attempts) if (now - entry.start > 15 * 60_000) attempts.delete(key);
        if (attempts.size > 5000) throw fail(429, '服务繁忙，请稍后重试');
        const entry = attempts.get(ip) || { count: 0, start: now }; attempts.set(ip, entry);
        if (entry.count >= 8 || passwordJobs >= 2) throw fail(429, '尝试过于频繁，请 15 分钟后重试');
        entry.count++;
        const input = await bodyJson(req, 2048);
        if (typeof input.password !== 'string' || input.password.length > 256) throw fail(400, '请输入书房访问口令');
        passwordJobs++;
        let match;
        try { match = timingSafeEqual(await scrypt(input.password, salt, 64), passwordHash); } finally { passwordJobs--; }
        if (!match) throw fail(401, '访问口令不正确，请重试');
        attempts.delete(ip);
        const raw = token(), csrf = token();
        const old = session(req); if (old) db.prepare('DELETE FROM sessions WHERE hash = ?').run(old.hash);
        db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
        if (db.prepare('SELECT count(*) AS n FROM sessions').get().n > 100) db.exec('DELETE FROM sessions');
        db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(raw), csrf, now + WEEK);
        setCookie(res, raw); return json(res, 200, { ok: true, csrf });
      }
      if (path.startsWith('/api/')) {
        const auth = authenticated(req);
        if (!['GET', 'HEAD'].includes(req.method)) checkWrite(req, auth);
        if (path === '/api/logout' && req.method === 'POST') { db.prepare('DELETE FROM sessions WHERE hash = ?').run(auth.hash); setCookie(res, '', 0); return json(res, 200, { ok: true }); }
        if (path === '/api/books' && req.method === 'GET') {
          const rows = db.prepare('SELECT * FROM books ORDER BY added DESC').all();
          return json(res, 200, { books: rows.map(publicBook), totalBytes: rows.reduce((n, row) => n + row.size, 0) });
        }
        if (path === '/api/books' && req.method === 'POST') {
          if (uploadBusy) throw fail(429, '正在接收另一本书，请稍后重试');
          let name;
          try { name = decodeURIComponent(req.headers['x-book-name'] || ''); } catch { throw fail(400, '文件名不正确'); }
          if (!name || name.length > 200 || /[\x00-\x1f/\\]/.test(name)) throw fail(400, '文件名不正确');
          const format = extname(name).slice(1).toUpperCase();
          if (!['TXT', 'EPUB', 'PDF'].includes(format)) throw fail(415, '暂时只支持 TXT、EPUB、PDF');
          const length = Number(req.headers['content-length']);
          if (!Number.isInteger(length) || length <= 0 || length > MAX_FILE) throw fail(413, '单本书需小于 100 MB，且不能为空');
          const stats = db.prepare('SELECT count(*) AS n, coalesce(sum(size), 0) AS size FROM books').get();
          if (stats.n >= MAX_BOOKS || stats.size + length > MAX_TOTAL) throw fail(413, '书库已达到 500 MB 或 500 本上限');
          uploadBusy = true;
          const temp = join(filesDir, '.upload-' + token()); let handle;
          try {
            handle = await open(temp, 'wx', 0o600);
            const digest = createHash('sha256'); let size = 0, head = Buffer.alloc(0);
            for await (const chunk of req) {
              size += chunk.length; if (size > MAX_FILE || stats.size + size > MAX_TOTAL) throw fail(413, '书籍文件过大');
              if (head.length < 8) head = Buffer.concat([head, chunk]).subarray(0, 8);
              digest.update(chunk); await handle.writeFile(chunk);
            }
            await handle.close(); handle = null;
            if (!size || size !== length) throw fail(400, '文件传输不完整');
            if ((format === 'PDF' && !head.toString('ascii').startsWith('%PDF-')) || (format === 'EPUB' && (head.length < 2 || head.readUInt16LE(0) !== 0x4b50))) throw fail(415, '文件内容与扩展名不匹配');
            const id = digest.digest('hex');
            const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
            if (existing) return json(res, 200, { book: publicBook(existing), duplicate: true });
            await rename(temp, join(filesDir, id));
            db.prepare('INSERT INTO books (id, name, format, size, added) VALUES (?, ?, ?, ?, ?)').run(id, name, format, size, Date.now());
            return json(res, 201, { book: publicBook(db.prepare('SELECT * FROM books WHERE id = ?').get(id)) });
          } finally { if (handle) await handle.close().catch(() => {}); await unlink(temp).catch(() => {}); uploadBusy = false; }
        }
        const match = path.match(/^\/api\/books\/([a-f0-9]{64})(\/file)?$/);
        if (match) {
          const row = db.prepare('SELECT * FROM books WHERE id = ?').get(match[1]);
          if (!row) throw fail(404, '书籍不存在或已移除');
          if (match[2] && ['GET', 'HEAD'].includes(req.method)) {
            res.writeHead(200, { 'Content-Type': mime['.' + row.format.toLowerCase()], 'Content-Length': row.size, 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}` });
            if (req.method === 'HEAD') return res.end();
            return createReadStream(join(filesDir, row.id)).on('error', () => res.destroy()).pipe(res);
          }
          if (!match[2] && req.method === 'PATCH') {
            const input = await bodyJson(req), metadata = checkedMetadata(input.metadata);
            if (!Number.isInteger(input.version) || input.version !== row.version) throw fail(409, '另一个设备更新了阅读记录，请返回书架刷新后继续');
            const update = db.prepare('UPDATE books SET metadata = ?, version = version + 1 WHERE id = ? AND version = ?').run(JSON.stringify(metadata), row.id, row.version);
            if (update.changes !== 1) throw fail(409, '另一个设备更新了阅读记录，请返回书架刷新后继续');
            return json(res, 200, { version: row.version + 1 });
          }
          // Deliberately no remote delete endpoint in v0.2: avoid accidental cloud data loss.
        }
        throw fail(404, '此接口暂不可用');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, '不支持此操作');
      const file = resolve(dist, '.' + (path === '/' ? '/index.html' : path));
      if (!file.startsWith(dist + sep)) throw fail(403, '禁止访问');
      let info; try { info = await stat(file); } catch { throw fail(404, '页面不存在'); }
      if (!info.isFile()) throw fail(404, '页面不存在');
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch (error) {
      if (res.headersSent) return res.destroy();
      const status = error.status || (error instanceof URIError ? 400 : 500);
      if (status === 500) console.error('Request failed:', error.message);
      json(res, status, { error: status === 500 ? '服务暂时不可用，请稍后重试' : error.message });
    }
  });
  server.requestTimeout = 120_000; server.headersTimeout = 15_000; server.maxHeadersCount = 50;
  server.on('close', () => db.close());
  return { server, db, dataDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { server, dataDir } = await createApp();
  const port = Number(process.env.PORT || 4180), host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, host, () => {
    console.log(`\n  QIDU / 栖读 · 独立站 v0.2\n  Preview: http://localhost:${port}\n  Mode: ${process.env.NODE_ENV === 'production' ? 'production' : 'local preview — not a public URL'}`);
    if (process.env.NODE_ENV !== 'production') console.log(`  Local access password file: ${join(dataDir, 'local-access.txt')}\n  This is the Qidu password, NOT your Quark password.\n`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}


