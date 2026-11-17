import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
const shots=resolve('screenshots');
const password='browser-test-qidu-password';
async function login(page){await page.goto('/');await page.locator('#entry-password').fill(password);await page.locator('.entry-submit').click();await expect(page.locator('.book-card')).toHaveCount(6);}
async function close(page){await page.locator('[data-action="close-reader"]').click();await expect(page.locator('.reader')).toHaveCount(0);}
test('independent entry, mobile, demo separation and login validation',async({page})=>{
 await mkdir(shots,{recursive:true});await page.goto('/');
 await expect(page.locator('.portal')).toBeVisible();
 await expect(page.locator('.portal-status')).toContainText('尚未部署公网');
 await page.screenshot({path:resolve(shots,'independent-login.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:resolve(shots,'independent-mobile.png'),fullPage:true});
 await page.setViewportSize({width:360,height:800});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#entry-password').fill('wrong');await page.locator('.entry-submit').click();
 await expect(page.locator('#entry-error')).toContainText('口令不正确');
 await page.locator('#entry-demo').click();await expect(page.locator('.book-card')).toHaveCount(6);
 await page.locator('.mobile-nav [data-view="cloud"]').click();
 await expect(page.locator('.quark-card')).toContainText('尚未接入');
 await expect(page.locator('.connection-card').first()).toContainText('未登录');
});
test('real server uploads, three readers, independent devices, progress, bookmarks and logout',async({page,browser})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const csp=[];page.on('console',message=>{if(message.type()==='error'&&/Content Security Policy|Refused to/.test(message.text())) csp.push(message.text());});
 await login(page);
 await page.locator('#file-input').setInputFiles([
  {name:'云端验收.txt',mimeType:'text/plain',buffer:Buffer.from('第一章 初见\n这是放在栖读服务器上的小说。\n\n第二章 远方\n换一台设备也能继续阅读。')},
  {name:'moon.epub',mimeType:'application/epub+zip',buffer:await readFile('public/samples/moon.epub')},{name:'slow.pdf',mimeType:'application/pdf',buffer:await readFile('public/samples/slow.pdf')}]);
 await expect(page.locator('.book-card')).toHaveCount(9);
 await page.screenshot({path:resolve(shots,'independent-library.png'),fullPage:true});
 await page.getByRole('button',{name:'阅读《云端验收》',exact:true}).click();
 await expect(page.locator('.text-article')).toContainText('放在栖读服务器');
 await page.locator('.reader-footer [data-action="next"]').click();
 await expect(page.locator('.text-article')).toContainText('换一台设备');
 await page.locator('[data-action="add-mark"]').click();await expect(page.locator('#toast-region')).toContainText('已留下这一页');await close(page);
 await page.getByRole('button',{name:'阅读《moon》',exact:true}).click();
 await expect(page.frameLocator('.epub-viewport iframe').locator('body')).toContainText('窗');await close(page);
 await page.getByRole('button',{name:'阅读《slow》',exact:true}).click();
 await expect(page.locator('#reader-chapter-label')).toContainText('共 3 页');
 await page.locator('.reader-footer [data-action="next"]').click();await expect(page.locator('#reader-chapter-label')).toContainText('第 2 页');
 await close(page);
 await page.locator('.sidebar [data-view="cloud"]').click();
 await expect(page.locator('.connection-tag.connected')).toContainText('已连接');
 await page.screenshot({path:resolve(shots,'independent-connections.png'),fullPage:true});
 const other=await browser.newContext({viewport:{width:390,height:844}}),mobile=await other.newPage();
 await mobile.goto('/');await mobile.locator('#entry-password').fill(password);await mobile.locator('.entry-submit').click();
 await expect(mobile.locator('.book-card')).toHaveCount(9);
 await mobile.getByRole('button',{name:'阅读《云端验收》',exact:true}).click();
 await expect(mobile.locator('.text-article')).toContainText('换一台设备');
 await mobile.screenshot({path:resolve(shots,'independent-mobile-reader.png')});await close(mobile);
 await mobile.locator('.mobile-nav [data-view="bookmarks"]').click();await expect(mobile.locator('.bookmark-card')).toHaveCount(1);
 // A brand-new browser has never imported these files into IndexedDB.
 const localFiles=await mobile.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('qidu-library');request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('files'))return resolve(0);const count=db.transaction('files').objectStore('files').count();count.onsuccess=()=>resolve(count.result);count.onerror=reject;};request.onerror=reject;}));
 expect(localFiles).toBe(0);await other.close();
 await page.locator('[data-action="account-logout"]').click();await page.locator('[data-action="account-confirm-logout"]').click();
 await expect(page.locator('.portal')).toBeVisible();expect((await page.request.get('/api/books')).status()).toBe(401);
 expect(errors).toEqual([]);expect(csp).toEqual([]);
});

