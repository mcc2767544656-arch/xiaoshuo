import { account, enterLibrary, fetchCloudBooks, uploadCloudBook, saveCloudBook, fetchCloudFile, signOut, showEntry, accountBadge, hostingBanner, cloudPage, hostingDetails } from './account.js';
import { createElement, BookOpen, Library, Clock3, Heart, Bookmark, Cloud, FolderOpen, Settings, Search, Plus, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, X, Check, Upload, LayoutGrid, List, MoreHorizontal, Sun, Moon, Monitor, SlidersHorizontal, Download, FileText, ShieldCheck, WifiOff, Trash2, Maximize, Coffee, Info, LoaderCircle } from 'lucide';
import * as db from './storage.js';
import { samples } from './samples.js';
import { escapeHtml as esc, extension, formatBytes, validateFile, decodeText, splitChapters, filterBooks, fileFingerprint, randomId } from './utils.js';
import './style.css';
const glyphs = { BookOpen, Library, Clock3, Heart, Bookmark, Cloud, FolderOpen, Settings, Search, Plus, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, X, Check, Upload, LayoutGrid, List, MoreHorizontal, Sun, Moon, Monitor, SlidersHorizontal, Download, FileText, ShieldCheck, WifiOff, Trash2, Maximize, Coffee, Info, LoaderCircle };
const icon = (name, cls = '') => createElement(glyphs[name] || BookOpen, { width: 20, height: 20, 'stroke-width': 1.7, 'aria-hidden': 'true', class: cls }).outerHTML;
const app = document.querySelector('#app');
const state = { books: [], view: 'library', tab: '全部', query: '', sort: 'recent', layout: 'grid', reader: null, prefs: { fontSize: 20, theme: 'paper', lineHeight: 1.95 }, loading: false };
let toastTimer, restoreFocus;
const labels = { library: '我的书架', recent: '最近阅读', favorites: '我的收藏', bookmarks: '阅读书签', cloud: '云端与夸克', local: '我的导入', settings: '阅读设置' };
function toast(message) {
  const region = document.querySelector('#toast-region');
  region.innerHTML = `${icon('Check')}<span>${esc(message)}</span>`;
  region.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => region.classList.remove('show'), 3200);
}
function botanical(type = 'mountain') {
  if (type === 'moon') return '<svg viewBox="0 0 200 220" aria-hidden="true"><circle cx="122" cy="62" r="40" fill="currentColor" opacity=".8"/><path d="M25 203V94h150v109M25 109h150M100 95v107M32 183h134" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M125 182c-12-20-3-35 10-39 2 16 7 25-10 39m0 0c-17-1-25-14-23-25 16 1 25 8 23 25" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M116 183h24l-4 19h-16z" fill="currentColor" opacity=".8"/></svg>';
  if (type === 'island') return '<svg viewBox="0 0 200 220" aria-hidden="true"><circle cx="146" cy="54" r="22" fill="currentColor" opacity=".75"/><path d="M-20 150Q40 115 100 150T220 150M-20 164Q40 130 100 164T220 164M-20 178Q40 145 100 178T220 178M-20 192Q40 160 100 192T220 192M-20 206Q40 175 100 206T220 206" fill="none" stroke="currentColor" stroke-width="1"/><path d="M20 135l45-42 38 50 27-18 50 22z" fill="currentColor" opacity=".65"/></svg>';
  if (type === 'art') return '<svg viewBox="0 0 200 220" aria-hidden="true"><path d="M26 170V85a60 60 0 0 1 120 0v85z" fill="currentColor" opacity=".72"/><path d="M87 198V119a48 48 0 0 1 96 0v79z" fill="#f1d7b6"/><circle cx="153" cy="41" r="21" fill="#f4e8cf"/><path d="M9 188h183M9 199h183M9 210h183" stroke="currentColor" opacity=".4"/></svg>';
  if (type === 'space') return '<svg viewBox="0 0 200 220" aria-hidden="true"><circle cx="98" cy="106" r="65" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="98" cy="106" r="44" fill="none" stroke="currentColor" stroke-width="1"/><path d="M98 22v169M15 106h167" stroke="currentColor" stroke-width=".7" opacity=".6"/><rect x="112" y="135" width="52" height="55" fill="currentColor" opacity=".7"/></svg>';
  if (type === 'season') return '<svg viewBox="0 0 200 220" aria-hidden="true"><path d="M100 215C70 153 104 99 111 34M92 179c-38-4-58-31-57-58 35 3 56 24 57 58M99 146c30-7 47-29 46-54-29 6-47 25-46 54M105 109C77 95 68 75 73 51c27 12 35 32 32 58M110 75c27-5 39-26 36-48-25 6-39 26-36 48" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  return '<svg viewBox="0 0 200 220" aria-hidden="true"><circle cx="145" cy="48" r="24" fill="currentColor" opacity=".65"/><path d="M-20 174Q35 73 78 124T155 124T230 175M-20 191Q36 117 89 157T230 159M-20 210Q40 160 110 189T230 186" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M35 219c13-45 22-72 37-110M53 173l-18-24m22 14 23-11m-15-12-9-23" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
}
function cover(book, extra = '') {
  return `<div class="book-cover cover-${esc(book.style || 'mountain')} ${extra}" aria-hidden="true"><div class="cover-grain"></div><span class="cover-kicker">QIDU · PRIVATE COLLECTION</span><div class="cover-title">${esc(book.title)}</div><span class="cover-subtitle">${esc(book.subtitle || '在字里行间，遇见另一种生活')}</span><div class="cover-illustration">${botanical(book.style)}</div><span class="cover-author">${esc(book.author)}</span><span class="cover-spine"></span></div>`;
}
function navItem(view, glyph, text, count) {
  return `<button class="nav-item ${state.view === view ? 'active' : ''}" data-action="navigate" data-view="${view}" ${state.view === view ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${text}</span>${count !== undefined ? `<span class="nav-count">${count}</span>` : ''}</button>`;
}
function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="#" data-action="navigate" data-view="library" aria-label="栖读，返回书架"><span class="brand-mark">${icon('BookOpen')}</span><span class="brand-name">栖读<span>QIDU READER</span></span></a><div class="sidebar-caption">属于你的，一隅书香</div><nav aria-label="主导航"><div class="nav-label">阅读空间</div>${navItem('library', 'Library', '我的书架', state.books.length)}${navItem('recent', 'Clock3', '最近阅读')}${navItem('favorites', 'Heart', '我的收藏', state.books.filter(b => b.favorite).length || undefined)}${navItem('bookmarks', 'Bookmark', '阅读书签')}<div class="nav-label source-label">我的书源</div>${navItem('cloud', 'Cloud', '云端与夸克')}<div class="source-state"><span class="status-dot"></span>尚未连接</div>${navItem('local', 'FolderOpen', '本地导入')}</nav><div class="sidebar-bottom"><div class="quiet-card">${icon('Coffee')}<p>给自己一点<br/>不被打扰的时间。</p><span>A LITTLE TIME FOR YOU</span></div>${navItem('settings', 'Settings', '阅读设置')}<div class="profile"><span class="avatar">栖</span><div>我的私人书房<span>个人使用 · 独立站 v0.2</span></div><span class="profile-dot"></span></div></div></aside>`;
}
function topbar() {
  return `<header class="topbar"><div class="breadcrumb"><span>阅读空间</span>${icon('ChevronRight')}<strong>${labels[state.view]}</strong></div><div class="topbar-right"><span class="privacy-chip">${icon('ShieldCheck')}${accountBadge()}</span><button class="icon-button" data-action="info" aria-label="关于栖读">${icon('Info')}</button>${account.available ? `<button class="account-button" data-action="${account.authenticated ? 'account-logout' : 'account-entry'}">${account.authenticated ? '退出书房' : '私人登录'}</button>` : ''}<span class="top-avatar">栖</span></div></header>`;
}
function mobileNav() {
  return `<nav class="mobile-nav" aria-label="移动端导航">${[['library','Library','书架'],['recent','Clock3','最近'],['favorites','Heart','收藏'],['bookmarks','Bookmark','书签'],['cloud','Cloud','网盘'],['settings','Settings','设置']].map(([view, glyph, label]) => `<button data-action="navigate" data-view="${view}" class="${state.view === view ? 'active' : ''}">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>`;
}
function hero() {
  const recent = [...state.books].filter(b => b.lastRead).sort((a,b) => b.lastRead-a.lastRead)[0];
  const featured = recent || state.books.find(b => b.id === 'demo-mountain') || state.books[0];
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="small-line"></span>YOUR OWN LITTLE READING CORNER</span><h2>把故事，<br/>留在身边<span class="hero-period">。</span></h2><p>不必赶路，在这里读一会儿。<br class="mobile-break"/>你的每一页，都值得慢慢翻阅。</p><div class="hero-actions">${featured ? `<button class="button button-dark" data-action="open" data-id="${featured.id}">${icon('BookOpen')}${recent ? '继续阅读' : '开始试读'}${icon('ArrowRight')}</button>` : `<button class="button button-dark" data-action="import">${icon('Plus')}添加第一本书</button>`}<span>${recent ? `${esc(recent.title)} · 已读 ${recent.progress || 0}%` : '从一本好书开始，找回自己的节奏'}</span></div></div><div class="hero-visual"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><span class="hero-spark spark-one">✳</span><span class="hero-spark spark-two">✧</span><div class="hero-book back-book">${cover(samples[1])}</div><div class="hero-book front-book">${cover(featured || samples[0])}</div><div class="hero-note"><span></span>${recent ? '故事，等你继续' : '一页书，一点慢时光'}</div><div class="hero-book-shadow"></div></div></section>`;
}
function stats() {
  const reading = state.books.filter(b => b.lastRead && (b.progress || 0) < 100).length;
  const minutes = state.books.reduce((sum, b) => sum + (b.minutes || 0), 0);
  const marks = state.books.reduce((sum, b) => sum + (b.bookmarks?.length || 0), 0);
  return `<section class="stats" aria-label="阅读统计"><div>${icon('Library')}<span>书架藏书 <strong>${state.books.length}</strong><small>本</small></span></div><div>${icon('BookOpen')}<span>正在阅读 <strong>${reading}</strong><small>本</small></span></div><div>${icon('Clock3')}<span>阅读时长 <strong>${minutes}</strong><small>分钟</small></span></div><div>${icon('Bookmark')}<span>阅读书签 <strong>${marks}</strong><small>枚</small></span></div></section>`;
}
function bookCard(book) {
  return `<article class="book-card"><div class="book-art-wrap"><button class="cover-open" data-action="open" data-id="${book.id}" aria-label="阅读《${esc(book.title)}》">${cover(book)}<span class="book-read-overlay">${icon('BookOpen')}打开阅读</span></button><span class="format-badge">${book.format}</span><button class="book-favorite ${book.favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${book.id}" aria-label="${book.favorite ? '取消收藏' : '收藏'}《${esc(book.title)}》" aria-pressed="${!!book.favorite}">${icon('Heart')}</button></div><div class="book-info"><div class="book-title-row"><button class="book-title" data-action="open" data-id="${book.id}">${esc(book.title)}</button><button class="book-more" data-action="book-menu" data-id="${book.id}" aria-label="《${esc(book.title)}》的更多操作">${icon('MoreHorizontal')}</button></div><p>${esc(book.author)}<span>·</span>${esc(book.category || '我的藏书')}</p><div class="book-bottom">${book.lastRead ? `<span class="reading-label">${(book.progress || 0) >= 100 ? '已读完' : '已读 ' + (book.progress || 0) + '%'}</span><span class="mini-progress"><span style="width:${book.progress || 0}%"></span></span>` : `<span class="unread-label">未开始阅读</span>`}<span class="source-badge">${book.sample ? '示例' : book.remote ? '云端' : '本地'}</span></div></div></article>`;
}
function emptyState(title, description, action = true) {
  return `<div class="empty-state"><span>${icon(state.view === 'favorites' ? 'Heart' : state.view === 'bookmarks' ? 'Bookmark' : 'BookOpen')}</span><h3>${title}</h3><p>${description}</p>${action ? '<button class="button button-outline" data-action="import">'+icon('Plus')+'导入一本书</button>' : ''}</div>`;
}
function libraryContent() {
  const isHome = state.view === 'library';
  const books = filterBooks(state.books, { ...state, view: state.view === 'local' ? 'library' : state.view }).filter(b => state.view !== 'local' || !b.sample);
  return `${hostingBanner()}${isHome ? `<div class="section-greeting"><div><span class="page-eyebrow">THE READING ROOM</span><h1>我的私人书房<span class="greeting-dot">.</span></h1></div><span class="date-note">${icon('Sun')}好时光，宜读书</span></div>${hero()}${stats()}` : `<div class="section-greeting subpage-greeting"><div><span class="page-eyebrow">YOUR PERSONAL COLLECTION</span><h1>${labels[state.view]}<span class="greeting-dot">.</span></h1><p>${state.view === 'recent' ? '从上次停下的地方，回到故事里。' : state.view === 'favorites' ? '把喜欢的书，留在最容易找到的地方。' : '自己的书，在这里安心读。'}</p></div><button class="button button-dark" data-action="import">${icon('Plus')}${account.authenticated ? '上传书籍' : '导入书籍'}</button></div>`}<section class="library-section"><div class="library-heading"><div><h2>${isHome ? '书架上的好时光' : '我的藏书'}<span>${books.length} 本</span></h2>${isHome ? '<p>总有一本，适合此刻的你。</p>' : ''}</div><button class="button button-dark add-book-button" data-action="import">${icon('Plus')}${account.authenticated ? '上传书籍' : '导入书籍'}</button></div><div class="library-toolbar"><div class="format-tabs" role="tablist" aria-label="书籍格式">${['全部','TXT','EPUB','PDF'].map(t => `<button role="tab" aria-selected="${state.tab === t}" class="${state.tab === t ? 'selected' : ''}" data-action="tab" data-tab="${t}">${t === '全部' ? '全部书籍' : t}</button>`).join('')}</div><div class="library-tools"><label class="search-box">${icon('Search')}<input id="book-search" placeholder="搜索书名、作者…" aria-label="搜索书名或作者" value="${esc(state.query)}" autocomplete="off"/>${state.query ? '<button class="clear-search" data-action="clear-search" aria-label="清空搜索">'+icon('X')+'</button>' : '<span class="search-shortcut">/</span>'}</label><label class="sort-control"><select id="book-sort" aria-label="书籍排序"><option value="recent" ${state.sort === 'recent' ? 'selected' : ''}>最近阅读</option><option value="name" ${state.sort === 'name' ? 'selected' : ''}>书名排序</option><option value="progress" ${state.sort === 'progress' ? 'selected' : ''}>阅读进度</option></select>${icon('ChevronDown')}</label><div class="view-toggle" aria-label="显示方式"><button class="${state.layout === 'grid' ? 'selected' : ''}" data-action="layout" data-layout="grid" aria-label="网格视图" aria-pressed="${state.layout === 'grid'}">${icon('LayoutGrid')}</button><button class="${state.layout === 'list' ? 'selected' : ''}" data-action="layout" data-layout="list" aria-label="列表视图" aria-pressed="${state.layout === 'list'}">${icon('List')}</button></div></div></div><div class="books-grid ${state.layout === 'list' ? 'list-view' : ''}">${books.map(bookCard).join('') || emptyState(state.query ? '没有找到这本书' : state.view === 'favorites' ? '喜欢的书，还在等你发现' : state.view === 'recent' ? '第一段阅读时光，从现在开始' : '书架留白，等一本好书', state.query ? '试着换个书名、作者，或切换文件格式。' : state.view === 'favorites' ? '点击书籍封面右上角的爱心，即可收藏。' : '打开一本示例，或者导入你自己的 TXT、EPUB、PDF。', !state.query && state.view !== 'favorites')}</div></section><div class="library-footnote"><span>${icon('ShieldCheck')}${account.authenticated ? '导入会上传至栖读服务端，供你的其他设备阅读；不会自动转存到夸克' : '示例模式：导入仅保存当前浏览器，不上传'}</span><button data-action="navigate" data-view="cloud">连接夸克网盘${icon('ArrowUpRight')}</button></div>`;
}
function cloudContent() { return cloudPage(); }
function bookmarksContent() {
  const marks = state.books.flatMap(book => (book.bookmarks || []).map(mark => ({ book, mark }))).sort((a,b) => b.mark.created-a.mark.created);
  return `<div class="section-greeting subpage-greeting"><div><span class="page-eyebrow">SAVE A LITTLE SOMETHING</span><h1>留住读过的风景<span class="greeting-dot">.</span></h1><p>故事可以往下读，喜欢的那一页，可以随时回来。</p></div></div><section class="bookmark-list">${marks.map(({book, mark}) => `<article class="bookmark-card"><span class="bookmark-icon">${icon('Bookmark')}</span><div><span class="mark-book">${esc(book.title)} · ${book.format}</span><h3>${esc(mark.label)}</h3><p>已读 ${mark.progress || 0}% · ${new Date(mark.created).toLocaleDateString('zh-CN')}</p></div><button class="button button-outline" data-action="open-mark" data-id="${book.id}" data-mark="${mark.id}">回到这里${icon('ArrowUpRight')}</button><button class="icon-button" data-action="delete-mark" data-id="${book.id}" data-mark="${mark.id}" aria-label="删除书签">${icon('Trash2')}</button></article>`).join('') || emptyState('把喜欢的一页，留在这里', '阅读时点击右上角的书签图标，就可以记住当前位置。', false)}</section>`;
}
function settingsContent() {
  const p = state.prefs;
  return `<div class="section-greeting subpage-greeting"><div><span class="page-eyebrow">MAKE YOURSELF AT HOME</span><h1>舒服地读，慢慢地读<span class="greeting-dot">.</span></h1><p>调到你喜欢的样子。设置会保存在当前浏览器。</p></div></div><section class="settings-panel"><div class="setting-row"><div><h3>阅读背景</h3><p>用于 TXT 与 EPUB；PDF 保持原稿版式。</p></div><div class="theme-options">${themeOptions()}</div></div><div class="setting-row"><div><h3>正文字号</h3><p>给眼睛一个舒服的距离。</p></div><div class="font-control"><button data-action="font" data-delta="-2" aria-label="减小字号">A−</button><span id="font-size-label">${p.fontSize}px</span><button data-action="font" data-delta="2" aria-label="增大字号">A+</button></div></div><div class="reading-preview" style="font-size:${p.fontSize}px" data-theme="${p.theme}"><span>阅读预览</span><h3>山风经过的地方</h3><p>窗外的山并不高，却足够挡住一些匆忙。远处有人烧水，白色的烟沿着屋檐慢慢升起，到了树梢，就散开了。</p></div><div class="setting-row"><div><h3>阅读数据备份</h3><p>导出书架信息、阅读进度与书签。不包含书籍文件，暂不提供恢复入口。</p></div><button class="button button-outline" data-action="export">${icon('Download')}导出备份</button></div><div class="settings-disclaimer">${icon('Info')}${account.authenticated ? '云端书籍的进度、收藏、书签保存在栖读服务端；换设备后刷新书架读取。阅读样式和示例书记录仍只在本浏览器保存。两台设备同时阅读时，发生冲突会提示刷新，不会静默覆盖。' : '示例模式：文件、设置与进度仅在本浏览器。登录书房后新导入的书籍才会上传服务端；已有本地书不会自动上传。'}</div></section>`;
}
function render() {
  if (state.reader) return;
  const content = state.view === 'cloud' ? cloudContent() : state.view === 'bookmarks' ? bookmarksContent() : state.view === 'settings' ? settingsContent() : libraryContent();
  app.innerHTML = `<div class="app-shell">${sidebar()}<main class="main-shell">${topbar()}<div class="page-content">${content}<footer class="page-footer"><span class="footer-brand">栖读<span>QIDU</span></span><span>在字里行间，安放自己的时间。</span><span>私人书房 · 独立站 0.2</span></footer></div></main>${mobileNav()}</div><input id="file-input" type="file" accept=".txt,.epub,.pdf" multiple hidden/><div id="drop-overlay" class="drop-overlay"><div>${icon('Upload')}<h2>把好故事，放进书架</h2><p>${account.authenticated ? '松开即可上传至私人书库' : '松开即可导入 TXT、EPUB、PDF'}</p></div></div>`;
}
async function navigate(view) { if (!(view in labels)) return; if (account.authenticated) await refreshCloud(); state.view = view; state.tab = '全部'; state.query = ''; render(); window.scrollTo(0,0); }
function modal(title, content, { wide = false } = {}) {
  closeModal(); restoreFocus = document.activeElement;
  const el = document.createElement('div'); el.className = 'modal-overlay';
  el.innerHTML = `<section class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">${esc(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭对话框">${icon('X')}</button></header><div class="modal-content">${content}</div></section>`;
  document.body.append(el); document.body.classList.add('modal-open');
  el.addEventListener('click', e => { if (e.target === el) closeModal(); });
  el.querySelector('button')?.focus();
}
function closeModal() { document.querySelector('.modal-overlay')?.remove(); document.body.classList.remove('modal-open'); if (restoreFocus?.isConnected) restoreFocus.focus(); }
function themeOptions() { return [['paper','Sun','纸白'],['sepia','Coffee','暖杏'],['dark','Moon','夜读']].map(([t,i,label]) => `<button class="theme-option theme-${t} ${state.prefs.theme === t ? 'selected' : ''}" data-action="theme" data-theme="${t}" aria-label="${label}主题" aria-pressed="${state.prefs.theme === t}">${icon(i)}<span>${label}</span></button>`).join(''); }
async function persistBook(book) { if (book.remote) await saveCloudBook(book); else await db.saveBook(book); }
async function refreshCloud() {
  try { const books = await fetchCloudBooks(); state.books = [...state.books.filter(book => book.sample), ...books]; }
  catch (error) { account.error = error.message; toast(error.message); }
}
async function importFiles(fileList) {
  const files = [...fileList]; if (!files.length || state.loading) return;
  if (state.reader) await closeReader();
  state.loading = true; let added = 0; let duplicates = 0; const errors = [];
  toast(account.authenticated ? '正在上传到你的栖读书库…' : '正在将书籍保存在本地…');
  for (const file of files) {
    const invalid = validateFile(file); if (invalid) { errors.push(`${file.name}：${invalid}`); continue; }
    try {
      if (account.authenticated) {
        const result = await uploadCloudBook(file);
        if (result.duplicate) { duplicates++; continue; }
        state.books.push(result.book); added++; continue;
      }
      const fingerprint = fileFingerprint(await file.arrayBuffer());
      if (state.books.some(b => b.fingerprint === fingerprint)) { duplicates++; continue; }
      const styles = ['mountain','moon','art','island','season','space'];
      const book = { id: randomId(), fingerprint, title: file.name.replace(/\.(txt|epub|pdf)$/i, ''), author: '我的藏书', subtitle: '在自己的书房，读自己的故事', format: extension(file.name), style: styles[state.books.length % styles.length], size: file.size, added: Date.now() + added, sample: false, category: '私人收藏' };
      await db.saveImportedBook(book, file); state.books.push(book); added++;
    } catch (error) { console.error(error); errors.push(`${file.name}：${error.message || '保存失败，请检查可用空间'}`); }
  }
  state.loading = false; state.tab = '全部'; state.query = ''; render();
  const messages = [added ? `已导入 ${added} 本书` : '', duplicates ? `${duplicates} 本重复文件已跳过` : ''].filter(Boolean);
  if (errors.length) modal('部分文件未能导入', `<p class="modal-description">${messages.join('，') || '没有新增书籍'}。已成功导入的文件不受影响。</p><ul class="error-list">${errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul><button class="button button-dark" data-action="close-modal">知道了</button>`);
  else toast(messages.join('，') || '没有可导入的文件');
}
async function getBookBuffer(book) {
  if (book.remote) return fetchCloudFile(book);
  if (book.sample) {
    const response = await fetch(book.path);
    if (!response.ok) throw new Error('示例文件未能加载，请检查本地服务是否正在运行');
    return response.arrayBuffer();
  }
  const file = await db.loadFile(book.id);
  if (!file) throw new Error('本地文件已丢失。请重新导入原文件；阅读进度仍保留在书架中');
  return file.arrayBuffer();
}
function readerShell(book) {
  return `<main class="reader" data-theme="${state.prefs.theme}"><header class="reader-topbar"><button class="reader-back" data-action="close-reader">${icon('ChevronLeft')}<span>返回书架</span></button><span class="reader-top-title">${esc(book.title)}<span>${book.format}</span></span><div class="reader-tools"><button class="icon-button" data-action="toc" aria-label="打开目录">${icon('List')}</button><button class="icon-button" data-action="add-mark" aria-label="添加阅读书签">${icon('Bookmark')}</button><button class="icon-button" data-action="reader-settings" aria-label="阅读样式设置">${icon('SlidersHorizontal')}</button><button class="icon-button fullscreen-button" data-action="fullscreen" aria-label="切换全屏">${icon('Maximize')}</button></div></header><div class="reader-workspace" id="reader-workspace"><div class="reader-loading">${icon('LoaderCircle', 'spin')}<p>正在打开这本书…</p></div></div><footer class="reader-footer"><button class="reader-page-button" data-action="prev" aria-label="上一章或上一页">${icon('ChevronLeft')}<span>上一章</span></button><div class="reader-position"><span id="reader-chapter-label">正在载入</span><div class="reader-progress-track"><span id="reader-progress-bar"></span></div><span id="reader-percent">0%</span></div><button class="reader-page-button" data-action="next" aria-label="下一章或下一页"><span>下一章</span>${icon('ChevronRight')}</button></footer></main>`;
}
async function openBook(id, bookmark) {
  if (state.loading) return;
  const book = state.books.find(b => b.id === id); if (!book) return;
  if (state.reader) await closeReader();
  closeModal();
  const r = { book, type: book.format, active: true, location: bookmark?.location || book.location || {}, sessionStart: Date.now(), saveTimer: null, chapters: [], index: 0, textScrollHandler: null, pdfTask: null, resizeTimer: null };
  state.reader = r; document.body.classList.add('reading-open'); window.scrollTo(0,0); app.innerHTML = readerShell(book);
  try {
    const buffer = await getBookBuffer(book); if (!r.active) return;
    if (book.format === 'TXT') await openText(r, buffer);
    else if (book.format === 'EPUB') await openEpub(r, buffer);
    else await openPdf(r, buffer);
    if (!r.active) return;
    book.lastRead = Date.now(); await persistBook(book);
  } catch (error) {
    console.error(error); if (!r.active) return;
    document.querySelector('#reader-workspace').innerHTML = `<div class="reader-error">${icon('FileText')}<h2>这本书暂时没能打开</h2><p>${esc(error.message || '文件可能已损坏、加密，或不是有效的对应格式。')}</p><button class="button button-dark" data-action="close-reader">返回书架</button></div>`;
  }
}
function updatePosition(r, progress, location, label) {
  if (!r.active || state.reader !== r) return;
  r.book.progress = Math.min(100, Math.max(0, Math.round(progress)));
  r.book.location = location; r.location = location;
  r.book.lastRead = Date.now(); r.label = label;
  const labelNode = document.querySelector('#reader-chapter-label');
  if (labelNode) labelNode.textContent = label;
  const bar = document.querySelector('#reader-progress-bar'); if (bar) bar.style.width = `${r.book.progress}%`;
  const percent = document.querySelector('#reader-percent'); if (percent) percent.textContent = `${r.book.progress}%`;
  clearTimeout(r.saveTimer);
  r.saveTimer = setTimeout(() => persistBook(r.book).catch(() => toast(account.error || '进度未能保存，请检查浏览器存储空间')), 350);
}
async function openText(r, buffer) {
  r.chapters = splitChapters(decodeText(buffer), r.book.title);
  r.index = Math.min(Math.max(0, r.location.chapter || 0), r.chapters.length - 1);
  renderTextChapter(r, r.location.scroll || 0);
}
function renderTextChapter(r, ratio = 0) {
  const index = r.index;
  const chapter = r.chapters[index];
  const space = document.querySelector('#reader-workspace');
  space.innerHTML = `<div class="text-scroll" id="text-scroll"><article class="text-article" style="font-size:${state.prefs.fontSize}px;line-height:${state.prefs.lineHeight}"><span class="chapter-eyebrow">${esc(r.book.title)}<span>CHAPTER ${String(r.index + 1).padStart(2, '0')}</span></span><h1>${esc(chapter.title)}</h1><div class="chapter-rule"></div>${chapter.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}<div class="chapter-end"><span></span>${r.index === r.chapters.length - 1 ? '全书完 · 谢谢这一程相伴' : '读到这里，稍作停留'}<span></span></div>${r.index < r.chapters.length - 1 ? `<button class="button button-outline next-chapter-inline" data-action="next">下一章：${esc(r.chapters[r.index + 1].title)}${icon('ArrowRight')}</button>` : ''}</article></div>`;
  setPageButtonLabels('章');
  const scroll = space.querySelector('#text-scroll');
  requestAnimationFrame(() => {
    if (!r.active || !scroll.isConnected || r.index !== index) return;
    scroll.scrollTop = ratio * Math.max(0, scroll.scrollHeight - scroll.clientHeight);
    const save = () => {
      if (!r.active) return;
      const max = scroll.scrollHeight - scroll.clientHeight;
      const current = max > 1 ? scroll.scrollTop / max : 1;
      updatePosition(r, ((r.index + current) / r.chapters.length) * 100, { chapter: r.index, scroll: current }, `${r.index + 1} / ${r.chapters.length} 章 · ${chapter.title}`);
    };
    scroll.addEventListener('scroll', save, { passive: true }); r.textScrollHandler = save; save();
  });
}
function setPageButtonLabels(unit) {
  document.querySelector('[data-action="prev"] span').textContent = `上一${unit}`;
  document.querySelector('.reader-footer [data-action="next"] span').textContent = `下一${unit}`;
}
async function openEpub(r, buffer) {
  const { default: ePub } = await import('epubjs'); if (!r.active) return;
  r.epub = ePub(buffer);
  r.epub.spine.hooks.serialize.register((output, section) => {
    const doc = new DOMParser().parseFromString(output, 'application/xhtml+xml');
    if (doc.querySelector('parsererror')) throw new Error('EPUB 章节格式不正确');
    doc.querySelectorAll('script, iframe, object, embed, form, base, meta[http-equiv], link[rel="preload"], link[rel="prefetch"]').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      for (const attr of [...el.attributes]) if (/^on/i.test(attr.name) || /^(?:javascript|vbscript):/i.test(attr.value.trim())) el.removeAttribute(attr.name);
    });
    const meta = doc.createElementNS('http://www.w3.org/1999/xhtml', 'meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', "default-src 'none'; img-src blob: data:; style-src 'unsafe-inline' blob:; font-src blob: data:; media-src blob: data:; frame-src 'none'; connect-src 'none'; form-action 'none'");
    doc.querySelector('head')?.prepend(meta);
    section.output = new XMLSerializer().serializeToString(doc);
  });
  await r.epub.ready; if (!r.active) return;
  const nav = await r.epub.loaded.navigation; if (!r.active) return;
  r.toc = nav.toc;
  document.querySelector('#reader-workspace').innerHTML = '<div class="epub-viewport" id="epub-viewport"></div>';
  const viewport = document.querySelector('#epub-viewport');
  r.rendition = r.epub.renderTo(viewport, { width: '100%', height: '100%', spread: 'none', flow: 'paginated', allowScriptedContent: false, allowPopups: false });
  applyEpubTheme(r);
  r.rendition.on('relocated', location => {
    if (!r.active) return;
    const chapter = r.epub.spine.get(location.start.cfi)?.index || 0;
    const percent = r.epub.locations.length() ? r.epub.locations.percentageFromCfi(location.start.cfi) * 100 : ((chapter + (location.start.displayed.page - 1) / Math.max(1, location.start.displayed.total)) / Math.max(1, r.epub.spine.length)) * 100;
    const title = findTocTitle(r.toc, location.start.href) || '正文';
    updatePosition(r, location.atEnd ? 100 : percent, { cfi: location.start.cfi }, `${title} · ${location.start.displayed.page} / ${location.start.displayed.total} 页`);
  });
  r.rendition.on('keydown', event => handleReaderKey(event));
  r.rendition.on('displayError', error => { console.error(error); toast('章节加载失败，可以通过目录尝试其他章节'); });
  try { await r.rendition.display(r.location.cfi || undefined); }
  catch (error) { if (r.location.cfi) await r.rendition.display(); else throw error; }
  if (!r.active) return;
  setPageButtonLabels('页');
  // Use chapter/page estimates; avoid a full-book scan racing with reader disposal.

}
function findTocTitle(items = [], href = '') {
  for (const item of items) { if (item.href?.split('#')[0] === href?.split('#')[0]) return item.label.trim(); const child = findTocTitle(item.subitems, href); if (child) return child; }
  return '';
}
function applyEpubTheme(r) {
  if (!r.rendition) return;
  const palettes = { paper: ['#f9f8f4','#343f38'], sepia: ['#f0e4cd','#514534'], dark: ['#202826','#c9d1cb'] };
  const [bg, fg] = palettes[state.prefs.theme];
  r.rendition.themes.default({ body: { color: `${fg} !important`, background: `${bg} !important`, 'font-family': 'Georgia, "Noto Serif SC", "Songti SC", SimSun, serif !important', 'line-height': `${state.prefs.lineHeight} !important`, padding: '24px 7% !important' }, p: { 'line-height': `${state.prefs.lineHeight} !important`, 'text-indent': '2em', 'margin-bottom': '1.2em' }, h1: { 'font-size': '1.5em', 'font-weight': '500', margin: '1em 0 1.7em' }, a: { color: 'inherit', 'pointer-events': 'none' }, img: { 'max-width': '100%' } });
  r.rendition.themes.fontSize(`${state.prefs.fontSize}px`);
}
async function openPdf(r, buffer) {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  if (!r.active) return;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  r.pdfLoading = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, enableXfa: false, cMapUrl: '/pdf-cmaps/', cMapPacked: true, standardFontDataUrl: '/pdf-fonts/', wasmUrl: '/pdf-wasm/' });
  r.pdf = await r.pdfLoading.promise; if (!r.active) return;
  r.index = Math.min(Math.max(1, r.location.page || 1), r.pdf.numPages); r.pdfScale = 1;
  document.querySelector('#reader-workspace').innerHTML = `<div class="pdf-toolbar"><span>${icon('FileText')}原稿版式</span><div><button data-action="pdf-zoom" data-delta="-0.2" aria-label="缩小 PDF">−</button><span id="pdf-zoom-label">100%</span><button data-action="pdf-zoom" data-delta="0.2" aria-label="放大 PDF">+</button></div></div><div class="pdf-scroll" id="pdf-scroll"><div class="pdf-page-wrap"><canvas id="pdf-canvas" aria-label="PDF 页面"></canvas></div></div>`;
  setPageButtonLabels('页'); await renderPdfPage(r);
}
async function renderPdfPage(r) {
  if (!r.active) return;
  const turn = (r.pdfTurn || 0) + 1; r.pdfTurn = turn;
  if (r.pdfTask) { r.pdfTask.cancel(); try { await r.pdfTask.promise; } catch {} }
  const page = await r.pdf.getPage(r.index); if (!r.active || r.pdfTurn !== turn) return;
  const scroll = document.querySelector('#pdf-scroll'); const canvas = document.querySelector('#pdf-canvas'); if (!canvas || !scroll) return;
  const base = page.getViewport({ scale: 1 });
  const fit = Math.min(1.35, Math.max(0.25, (scroll.clientWidth - (window.innerWidth < 600 ? 24 : 80)) / base.width));
  const viewport = page.getViewport({ scale: fit * r.pdfScale });
  const density = Math.min(window.devicePixelRatio || 1, 2, 4096 / Math.max(viewport.width, viewport.height));
  canvas.width = Math.floor(viewport.width * density); canvas.height = Math.floor(viewport.height * density);
  canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
  r.pdfTask = page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: density !== 1 ? [density,0,0,density,0,0] : null });
  try { await r.pdfTask.promise; } catch (error) { if (error.name === 'RenderingCancelledException') return; throw error; }
  if (!r.active || r.pdfTurn !== turn) return;
  scroll.scrollTop = 0; document.querySelector('#pdf-zoom-label').textContent = `${Math.round(r.pdfScale * 100)}%`;
  updatePosition(r, r.index / r.pdf.numPages * 100, { page: r.index }, `第 ${r.index} 页 / 共 ${r.pdf.numPages} 页`);
}
async function changePage(direction) {
  const r = state.reader; if (!r?.active) return;
  try {
    if (r.type === 'TXT') {
      const next = r.index + direction;
      if (next < 0 || next >= r.chapters.length) { toast(direction > 0 ? '已经读到最后一章了' : '已经是第一章了'); return; }
      r.index = next; renderTextChapter(r);
    } else if (r.type === 'EPUB') { if (!r.rendition) return; await (direction > 0 ? r.rendition.next() : r.rendition.prev()); }
    else if (r.pdf) {
      const next = r.index + direction; if (next < 1 || next > r.pdf.numPages) { toast(direction > 0 ? '已经是最后一页了' : '已经是第一页了'); return; }
      r.index = next; await renderPdfPage(r);
    }
  } catch (error) { console.error(error); toast('翻页失败，请稍后再试'); }
}
async function closeReader() {
  const r = state.reader; if (!r) return;
  if (r.closePromise) return r.closePromise;
  r.textScrollHandler?.(); r.active = false; clearTimeout(r.saveTimer); clearTimeout(r.resizeTimer);
  r.closePromise = (async () => {
    if (!document.hidden) r.book.minutes = (r.book.minutes || 0) + Math.floor((Date.now() - r.sessionStart) / 60000);
    try { await persistBook(r.book); } catch { toast(account.error || '阅读进度未能保存'); }
    try { r.rendition?.destroy(); r.epub?.destroy(); r.pdfTask?.cancel(); await r.pdfLoading?.destroy(); } catch (error) { console.warn(error); }
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    if (state.reader !== r) return;
    state.reader = null; document.body.classList.remove('reading-open'); closeModal(); render();
  })();
  return r.closePromise;
}
function openToc() {
  const r = state.reader; if (!r) return;
  let items;
  if (r.type === 'TXT') items = r.chapters.map((ch, i) => `<button class="toc-item ${r.index === i ? 'current' : ''}" data-action="jump" data-index="${i}"><span>${String(i + 1).padStart(2,'0')}</span>${esc(ch.title)}${r.index === i ? icon('BookOpen') : ''}</button>`).join('');
  else if (r.type === 'PDF' && r.pdf) items = `<label class="pdf-page-input">跳转到第 <input id="pdf-page-jump" type="number" min="1" max="${r.pdf.numPages}" value="${r.index}"/> 页 / 共 ${r.pdf.numPages} 页</label><button class="button button-dark" data-action="jump-pdf">前往这一页${icon('ArrowRight')}</button>`;
  else if (r.toc) {
    const flatten = (entries, level = 0) => entries.map(item => `<button class="toc-item" style="padding-left:${16+level*16}px" data-action="jump-epub" data-href="${esc(item.href)}">${esc(item.label.trim())}</button>${flatten(item.subitems || [], level+1)}`).join('');
    items = flatten(r.toc) || '<p>这本 EPUB 没有提供章节目录。你仍然可以使用翻页按钮阅读。</p>';
  } else items = '<p>目录仍在加载中，请稍后再试。</p>';
  modal('书籍目录', `<p class="modal-description">${esc(r.book.title)}</p><div class="toc-list">${items}</div>`);
}
async function addBookmark() {
  const r = state.reader; if (!r || !r.label) { toast('请等书籍加载完成后再添加书签'); return; }
  r.textScrollHandler?.(); r.book.bookmarks ||= [];
  if (r.book.bookmarks.some(mark => JSON.stringify(mark.location) === JSON.stringify(r.location))) { toast('这一页已经有书签了'); return; }
  r.book.bookmarks.push({ id: randomId(), label: r.label, location: { ...r.location }, progress: r.book.progress, created: Date.now() });
  await persistBook(r.book); toast('已留下这一页，回到书架可查看书签');
}
async function changePrefs(key, value) {
  state.prefs[key] = value; await db.setSetting('prefs', state.prefs);
  if (state.reader) {
    document.querySelector('.reader').dataset.theme = state.prefs.theme;
    const text = document.querySelector('.text-article'); if (text) text.style.fontSize = `${state.prefs.fontSize}px`;
    applyEpubTheme(state.reader);
  } else render();
  if (document.querySelector('.modal-overlay') && document.querySelector('#reader-font-value')) readerSettings();
}
function readerSettings() {
  modal('按你的习惯阅读', `<div class="reader-setting-group"><span>阅读背景</span><div class="theme-options">${themeOptions()}</div></div><div class="reader-setting-group"><span>正文字号 ${state.reader?.type === 'PDF' ? '（PDF 请使用页面缩放）' : ''}</span><div class="font-control"><button data-action="font" data-delta="-2" aria-label="减小字号">A−</button><span id="reader-font-value">${state.prefs.fontSize}px</span><button data-action="font" data-delta="2" aria-label="增大字号">A+</button></div></div><p class="modal-description">设置会自动保存在此浏览器。TXT 与 EPUB 可调整文字；PDF 保留原始排版。</p>`);
}
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
async function handleAction(button) {
  const action = button.dataset.action; const id = button.dataset.id;
  const book = id ? state.books.find(b => b.id === id) : null;
  switch (action) {
    case 'navigate': await navigate(button.dataset.view); break;
    case 'tab': state.tab = button.dataset.tab; render(); break;
    case 'layout': state.layout = button.dataset.layout; await db.setSetting('layout', state.layout); render(); break;
    case 'clear-search': state.query = ''; render(); document.querySelector('#book-search')?.focus(); break;
    case 'import': document.querySelector('#file-input')?.click(); break;
    case 'open': await openBook(id); break;
    case 'close-reader': await closeReader(); break;
    case 'favorite': if (book) { book.favorite = !book.favorite; await persistBook(book); render(); toast(book.favorite ? '已加入我的收藏' : '已取消收藏'); } break;
    case 'book-menu': if (book) modal('关于这本书', `<div class="book-detail"><div class="detail-cover">${cover(book)}</div><div><span class="outline-pill">${book.format} · ${book.sample ? '原创示例' : book.remote ? '栖读云端书库' : '本地导入'}</span><h3>${esc(book.title)}</h3><p>${esc(book.author)}</p><p>${formatBytes(book.size)} · ${book.lastRead ? '已读 ' + (book.progress || 0) + '%' : '还未开始阅读'}</p></div></div><div class="book-detail-actions"><button class="button button-dark" data-action="open" data-id="${id}">${icon('BookOpen')}打开阅读</button><button class="button button-outline" data-action="download-book" data-id="${id}">${icon('Download')}下载文件</button>${book.remote ? '<p class="modal-description">云端文件暂不提供删除操作；不是夸克网盘文件。</p>' : `<button class="button button-danger" data-action="confirm-delete" data-id="${id}">${icon('Trash2')}移出书架</button>`}</div>`); break;
    case 'confirm-delete': if (book?.remote) { toast('v0.2 暂不提供云端删除，避免误删原文件'); break; } if (book) modal('移出这本书？', `<p class="modal-description">将从当前浏览器中删除《${esc(book.title)}》${book.sample ? '的示例入口' : '及其本地副本'}、阅读进度和书签。不会删除你设备或网盘中的原文件。</p><div class="dialog-actions"><button class="button button-outline" data-action="close-modal">保留这本书</button><button class="button button-danger" data-action="delete-book" data-id="${id}">确认移出</button></div>`); break;
    case 'delete-book': if (book?.remote) break; await db.removeBook(id); state.books = state.books.filter(b => b.id !== id); closeModal(); render(); toast('已从本地书架移出'); break;
    case 'download-book': if (book) { const buffer = await getBookBuffer(book); downloadFile(new Blob([buffer]), `${book.title}.${book.format.toLowerCase()}`); toast('已准备好下载文件'); } break;
    case 'close-modal': closeModal(); break;
    case 'info': modal('栖读 · 独立站 v0.2', '<p class="modal-description">支持 TXT、EPUB、PDF。示例模式在本浏览器保存文件；私人登录后导入的文件保存到栖读服务端，可供同一书房的其他设备读取。设置与示例阅读记录仍在本地。</p>'+hostingDetails()); break;
    case 'cloud-guide':
    case 'hosting-info': modal('独立站 · 服务与部署', hostingDetails(), { wide: true }); break;
    case 'account-entry': showEntry(); break;
    case 'account-logout': modal('退出私人书房？', '<p class="modal-description">退出将撤销本浏览器的登录会话，不删除云端书籍。服务端书籍文件不保存在浏览器书库中；已下载到设备的文件不会被清除。</p><div class="dialog-actions"><button class="button button-outline" data-action="close-modal">继续阅读</button><button class="button button-dark" data-action="account-confirm-logout">确认退出</button></div>'); break;
    case 'account-confirm-logout': await signOut(); break;
    case 'cloud-refresh': await refreshCloud(); render(); toast(account.error || '已读取服务端最新书架和进度'); break;
    case 'theme': await changePrefs('theme', button.dataset.theme); break;
    case 'font': await changePrefs('fontSize', Math.max(14, Math.min(32, state.prefs.fontSize + Number(button.dataset.delta)))); break;
    case 'reader-settings': readerSettings(); break;
    case 'toc': openToc(); break;
    case 'prev': await changePage(-1); break;
    case 'next': await changePage(1); break;
    case 'jump': if (state.reader) { state.reader.index = Number(button.dataset.index); closeModal(); renderTextChapter(state.reader); } break;
    case 'jump-pdf': if (state.reader?.pdf) { const n = Number(document.querySelector('#pdf-page-jump').value); if (!Number.isInteger(n) || n < 1 || n > state.reader.pdf.numPages) { toast('请输入有效的页码'); return; } state.reader.index = n; closeModal(); await renderPdfPage(state.reader); } break;
    case 'jump-epub': if (state.reader?.rendition) { const href = button.dataset.href; closeModal(); await state.reader.rendition.display(href); } break;
    case 'add-mark': await addBookmark(); break;
    case 'open-mark': if (book) await openBook(id, book.bookmarks?.find(m => m.id === button.dataset.mark)); break;
    case 'delete-mark': if (book) { book.bookmarks = book.bookmarks.filter(m => m.id !== button.dataset.mark); await persistBook(book); render(); toast('已删除书签'); } break;
    case 'pdf-zoom': if (state.reader?.pdf) { state.reader.pdfScale = Math.max(.6, Math.min(2.6, state.reader.pdfScale + Number(button.dataset.delta))); await renderPdfPage(state.reader); } break;
    case 'fullscreen': if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else toast('当前浏览器暂不支持全屏，可以添加到主屏幕阅读'); break;
    case 'export': downloadFile(new Blob([JSON.stringify({ app: 'qidu', version: 1, exported: new Date().toISOString(), books: state.books, preferences: state.prefs, note: '仅含元数据与进度，不包含书籍文件。本版暂不支持从备份恢复。' }, null, 2)], { type: 'application/json' }), `栖读-阅读数据-${new Date().toLocaleDateString('sv-SE')}.json`); toast('已导出阅读数据（不含书籍文件）'); break;
  }
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  event.preventDefault();
  handleAction(button).catch(error => { console.error(error); toast(error.message || '操作没有完成，请稍后重试'); });
});
document.addEventListener('input', event => {
  if (event.target.id !== 'book-search') return;
  const start = event.target.selectionStart; state.query = event.target.value; render();
  const input = document.querySelector('#book-search'); input.focus(); input.setSelectionRange(start,start);
});
document.addEventListener('change', event => {
  if (event.target.id === 'file-input') { importFiles(event.target.files).catch(error => { console.error(error); toast('导入失败，请重试'); state.loading = false; }); event.target.value = ''; }
  if (event.target.id === 'book-sort') { state.sort = event.target.value; render(); }
});
function handleReaderKey(event) {
  if (!state.reader || document.querySelector('.modal-overlay') || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); changePage(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); changePage(-1); }
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (document.querySelector('.modal-overlay')) closeModal(); else if (state.reader) closeReader(); return; }
  if (event.key === 'Tab' && document.querySelector('.modal-overlay')) {
    const elements = [...document.querySelectorAll('.modal button, .modal input, .modal select, .modal a[href]')].filter(el => !el.disabled);
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (event.key === '/' && !state.reader && !document.querySelector('.modal-overlay') && !/^(INPUT|TEXTAREA)$/.test(event.target.tagName)) { event.preventDefault(); document.querySelector('#book-search')?.focus(); }
  handleReaderKey(event);
});
let dragDepth = 0;
document.addEventListener('dragenter', event => { if (!event.dataTransfer?.types.includes('Files') || state.reader) return; event.preventDefault(); dragDepth++; document.querySelector('#drop-overlay')?.classList.add('visible'); });
document.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
document.addEventListener('dragleave', () => { dragDepth--; if (dragDepth <= 0) { dragDepth = 0; document.querySelector('#drop-overlay')?.classList.remove('visible'); } });
document.addEventListener('drop', event => { event.preventDefault(); dragDepth = 0; document.querySelector('#drop-overlay')?.classList.remove('visible'); if (event.dataTransfer?.files.length) importFiles(event.dataTransfer.files); });
window.addEventListener('resize', () => { const r = state.reader; if (!r?.pdf) return; clearTimeout(r.resizeTimer); r.resizeTimer = setTimeout(() => renderPdfPage(r).catch(console.error), 180); });
document.addEventListener('visibilitychange', () => {
  const r = state.reader; if (!r) return;
  if (document.hidden) { r.book.minutes = (r.book.minutes || 0) + Math.floor((Date.now()-r.sessionStart)/60000); r.sessionStart = Date.now(); persistBook(r.book).catch(console.error); }
  else r.sessionStart = Date.now();
});
async function boot() {
  app.innerHTML = '<div class="boot-screen">'+icon('BookOpen')+'<span>正在打开你的书房</span></div>';
  try {
    await enterLibrary(app);
    await db.seedLibrary(samples); state.books = await db.allBooks();
    if (account.authenticated) { state.books = state.books.filter(book => book.sample); await refreshCloud(); }
    const prefs = await db.getSetting('prefs');
    if (prefs) state.prefs = { fontSize: Math.max(14, Math.min(32, Number(prefs.fontSize) || 20)), theme: ['paper','sepia','dark'].includes(prefs.theme) ? prefs.theme : 'paper', lineHeight: 1.95 };
    state.layout = (await db.getSetting('layout')) === 'list' ? 'list' : 'grid'; render();
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.warn);
  } catch (error) {
    console.error(error); app.innerHTML = '<div class="boot-screen">'+icon('WifiOff')+'<h1>浏览器没有允许本地存储</h1><p>请使用普通浏览模式，并允许此站点使用存储空间，然后刷新。</p></div>';
  }
}
boot();

window.addEventListener('pageshow', event => { if (event.persisted && account.available) location.reload(); });

