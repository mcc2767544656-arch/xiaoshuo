import { escapeHtml as esc } from './utils.js';
import './portal.css';

export const account = { available: false, authenticated: false, mode: 'local', csrf: '', lastSync: null, error: '' };
const queues = new Map();
const bookIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5C8 2 3 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1v15"/></svg>';
export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = account.csrf;
  const response = await fetch(path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) account.authenticated = false;
    const error = new Error(result.error || '服务暂时无法连接，请稍后重试'); error.status = response.status; throw error;
  }
  return options.binary ? response.arrayBuffer() : response.json();
}
export async function readStatus() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
    const info = await response.json();
    if (info.version !== '0.2.0') return false;
    Object.assign(account, info, { available: true }); return true;
  } catch { return false; }
}
export async function enterLibrary(app) {
  if (!await readStatus()) return;
  if (account.authenticated || sessionStorage.getItem('qidu-demo') === '1') return;
  await new Promise(resolve => {
    const local = account.mode === 'local';
    app.innerHTML = `<main class="portal"><section class="portal-story"><a class="portal-brand" href="/">${bookIcon}<span>栖读<small>QIDU · YOUR PRIVATE LIBRARY</small></span></a><div class="portal-intro"><span class="portal-kicker">A LITTLE ROOM. AN ENTIRE WORLD.</span><h1>书在云端，<br/>阅读<span>在身边。</span></h1><p>从电脑的一页，到手机的一章。<br/>给自己的故事，留一个随时回来的地方。</p><div class="portal-books" aria-hidden="true"><div class="portal-book portal-book-one"><small>QIDU · PRIVATE COLLECTION</small><b>山野<br/>来信</b><i>山川与日常</i><span class="portal-book-sun"></span><span class="portal-book-hills"></span></div><div class="portal-book portal-book-two"><small>QIDU · READING ROOM</small><b>月亮与<br/>窗台</b><i>每一页，都有微光</i><span class="portal-book-moon"></span><span class="portal-book-window"></span></div><span class="portal-orbit"></span></div><div class="portal-features"><span>01 / 小说与文档</span><span>02 / 手机与电脑</span><span>03 / 私人的时光</span></div></div><footer>把故事，留在身边。<span>EST. 2026</span></footer></section><section class="portal-entry"><div class="portal-status"><i></i>${local ? '本机验收 · 尚未部署公网' : '独立站 · HTTPS 私人访问'}</div><div class="entry-card"><span class="portal-kicker">WELCOME TO YOUR READING ROOM</span><h2>打开你的私人书房</h2><p class="entry-subtitle">一个入口，安放你喜欢的每一本书。</p><form id="entry-form"><label for="entry-password">书房访问口令 <span>不是夸克账号密码</span></label><div class="entry-password-wrap"><input id="entry-password" name="password" type="password" autocomplete="current-password" required maxlength="256" placeholder="输入你设置的私人访问口令"/><button type="button" id="toggle-password" aria-label="显示口令">显示</button></div><p class="entry-error" role="alert" id="entry-error"></p><button type="submit" class="entry-submit">进入书房 <span>→</span></button></form><div class="entry-divider"><span>先看看阅读体验</span></div><button type="button" class="entry-demo" id="entry-demo">浏览示例书房 <span>↗</span></button><p class="entry-note">${local ? '本机访问口令保存在项目 .data/local-access.txt。<br/>当前页面不是公网链接；示例模式无需登录。' : '访问口令由书房主人在部署时设置。<br/>示例模式仅在本浏览器保存，不访问私人云端文件。'}</p><div class="entry-security"><span>◈ 私人登录保护</span><span>TXT · EPUB · PDF</span></div></div><div class="entry-roadmap"><span>夸克网盘</span><strong>接入验证中 · 尚未连接</strong><p>当前支持栖读服务端书库；不收集夸克密码，不展示伪造的授权二维码。</p></div></section></main>`;
    document.querySelector('#toggle-password').onclick = event => {
      const input = document.querySelector('#entry-password'); input.type = input.type === 'password' ? 'text' : 'password'; event.target.textContent = input.type === 'password' ? '显示' : '隐藏';
    };
    document.querySelector('#entry-demo').onclick = () => { sessionStorage.setItem('qidu-demo', '1'); resolve(); };
    document.querySelector('#entry-form').onsubmit = async event => {
      event.preventDefault(); const button = event.target.querySelector('[type=submit]'), error = document.querySelector('#entry-error');
      button.disabled = true; button.textContent = '正在验证…'; error.textContent = '';
      try {
        const result = await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.querySelector('#entry-password').value }) });
        account.csrf = result.csrf; account.authenticated = true; sessionStorage.removeItem('qidu-demo'); resolve();
      } catch (failure) { error.textContent = failure.message; button.disabled = false; button.innerHTML = '进入书房 <span>→</span>'; }
    };
  });
}
export async function fetchCloudBooks() { const result = await api('/api/books'); account.lastSync = Date.now(); account.error = ''; return result.books; }
export async function uploadCloudBook(file) {
  return api('/api/books', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Book-Name': encodeURIComponent(file.name) }, body: file });
}
export function saveCloudBook(book) {
  const metadata = Object.fromEntries(['progress', 'location', 'lastRead', 'minutes', 'favorite', 'bookmarks'].filter(key => book[key] !== undefined).map(key => [key, structuredClone(book[key])]));
  const previous = queues.get(book.id) || Promise.resolve();
  const task = previous.then(async () => {
    if (account.error) throw new Error(account.error);
    try {
      const result = await api(`/api/books/${book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: book.cloudVersion, metadata }) });
      book.cloudVersion = result.version; account.lastSync = Date.now();
    } catch (error) { account.error = error.message; throw error; }
  });
  queues.set(book.id, task.catch(() => {})); return task;
}
export const fetchCloudFile = book => api(`/api/books/${book.id}/file`, { binary: true });
export async function signOut() { await api('/api/logout', { method: 'POST' }); sessionStorage.removeItem('qidu-demo'); location.reload(); }
export function showEntry() { sessionStorage.removeItem('qidu-demo'); location.reload(); }
export function accountBadge() {
  if (!account.available) return '本地阅读 · 无服务端';
  if (!account.authenticated) return '示例模式 · 仅本浏览器';
  return account.error ? '同步失败 · 请刷新书架' : '私人书库 · 已登录';
}
export function hostingBanner() {
  if (!account.available) return '';
  return `<div class="hosting-banner"><span class="hosting-dot"></span><div><strong>${account.mode === 'local' ? '独立站本机验收' : '独立站服务已连接'}</strong><span>${account.mode === 'local' ? '网页与服务端已运行，公网域名尚未发布。' : '手机与电脑可通过此网址访问，不需要连接同一个 Wi-Fi。'} ${account.authenticated ? '云端书籍的进度、收藏和书签随阅读保存；返回书架时刷新。' : '当前浏览示例，不会读取私人云端文件。'}</span></div><button data-action="hosting-info">服务与部署 ↗</button></div>`;
}
export function cloudPage() {
  const signed = account.authenticated;
  return `<div class="section-greeting subpage-greeting"><div><span class="page-eyebrow">YOUR BOOKS, WITHIN REACH</span><h1>书在云端，随时回来<span class="greeting-dot">.</span></h1><p>栖读书库与夸克网盘是两个独立来源，连接状态在这里一目了然。</p></div></div><div class="connection-grid"><section class="connection-card"><div class="connection-heading"><span class="connection-symbol">栖</span><span class="connection-tag ${signed ? 'connected' : ''}">${signed ? '服务已连接' : '未登录'}</span></div><h2>栖读私人书库</h2><p>${signed ? '你上传到栖读的书，保存于自己的服务端。使用同一网址和口令，在另一台设备继续阅读。' : '登录栖读后可上传书籍到自己的服务端。示例模式的本地文件不会自动上传。'}</p><div class="connection-detail"><span>支持格式</span><strong>TXT / EPUB / PDF</strong><span>保存范围</span><strong>书籍 · 进度 · 收藏 · 书签</strong><span>容量限制</span><strong>单本 100 MB · 总计 500 MB</strong></div><button class="button button-dark" data-action="${signed ? 'import' : 'account-entry'}">${signed ? '上传书籍到栖读' : '登录私人书房'} <span>→</span></button>${signed ? '<button class="connection-refresh" data-action="cloud-refresh">刷新云端书架</button>' : ''}</section><section class="connection-card quark-card"><div class="connection-heading"><span class="connection-symbol quark-symbol">Q</span><span class="connection-tag">尚未接入</span></div><h2>夸克网盘</h2><p>目标是扫码授权后，直接浏览网盘小说与漫画。当前尚未完成可验证的授权及文件读取，不能扫描你的网盘。</p><div class="quark-placeholder"><span>◈</span><strong>等待真实授权接入</strong><p>这里不会放一个看似能登录的假二维码</p></div><p class="connection-small">无需在此输入夸克账号密码或 Cookie。栖读书房口令也不会发送给夸克。</p></section></div>${account.error ? `<div class="sync-error" role="alert">同步未完成：${esc(account.error)}。本地未确认的进度不会覆盖另一台设备；请返回书架刷新后继续。</div>` : ''}<section class="deployment-strip"><div><span class="page-eyebrow">ONE LINK, ALL YOUR DEVICES</span><h3>下一次，从另一块屏幕继续。</h3><p>${account.mode === 'local' ? '当前仅在这台电脑验收。部署后，会有一个固定 HTTPS 网址，不再依赖家里的电脑和 Wi-Fi。' : '同一网址，同一私人书房。换设备后刷新书架，即可读取服务端已保存的进度。'}</p></div><button class="button button-outline" data-action="hosting-info">查看服务状态 ↗</button></section>`;
}
export function hostingDetails() {
  return `<div class="deployment-checks"><div><span>01</span><section><h3>独立网页与私人 API</h3><p>已实现。小说阅读、口令登录、云端上传、进度与书签保存均可本机验收。</p></section><b>已完成</b></div><div><span>02</span><section><h3>公网 HTTPS 与持久存储</h3><p>${account.mode === 'local' ? '未部署。已准备 Docker 和 Render 配置，需要你连接云平台账号；付费资源须由你确认后创建。' : '当前为线上服务模式。书籍与数据库应挂载持久磁盘，由部署平台保管。'}</p></section><b>${account.mode === 'local' ? '待部署' : '线上模式'}</b></div><div><span>03</span><section><h3>夸克扫码与网盘读取</h3><p>尚未接入。当前云端上传功能属于栖读服务端，不代表已连接夸克网盘。</p></section><b>待验证</b></div></div><div class="notice-box">${account.mode === 'local' ? '你现在看到的是本机服务，不是公网演示链接。没有创建付费服务器，也没有上传私人书籍到外部平台。' : '这是单人私人书房：持有访问口令的人可访问全部云端书籍。请勿分享口令；请定期备份持久磁盘。'}阅读设置与示例书进度仍只保存在当前浏览器；v0.2 不自动合并两台设备同时离线修改的记录。</div>`;
}
