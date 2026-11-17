import { sha256 } from '@noble/hashes/sha2.js';
export const FORMATS = ['TXT', 'EPUB', 'PDF'];
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
export function extension(name) { return name.split('.').pop().toUpperCase(); }
export function formatBytes(bytes) {
  if (!bytes) return '—';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
export function validateFile(file) {
  if (!FORMATS.includes(extension(file.name))) return '仅支持 TXT、EPUB 和 PDF 文件';
  if (file.size > MAX_FILE_SIZE) return '单本文件暂不超过 100 MB';
  if (file.size === 0) return '文件是空的，请重新选择';
  return null;
}
export function decodeText(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes).replace(/^\uFEFF/, '');
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes).replace(/^\uFEFF/, '');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); }
  catch { return new TextDecoder('gb18030').decode(bytes); }
}
export function splitChapters(text, title = '正文') {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
  const lines = normalized.split('\n');
  const chapters = [];
  let current = { title, paragraphs: [] };
  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;
    if (/^(第[零〇一二三四五六七八九十百千万两\d]+[章节卷回部篇]|序[章言]?|前言|引子|楔子|尾声|后记|Chapter\s+\d+)([\s　.:：、—-].*|$)/i.test(value) && value.length < 90) {
      if (current.paragraphs.length) chapters.push(current);
      current = { title: value, paragraphs: [] };
    } else current.paragraphs.push(value);
  }
  if (current.paragraphs.length || current.title !== title) chapters.push(current);
  if (!chapters.length) chapters.push({ title, paragraphs: ['这份文件暂时没有可阅读的文字。'] });
  return chapters;
}
export function filterBooks(books, { tab = '全部', query = '', view = 'library', sort = 'recent' } = {}) {
  const needle = query.trim().toLocaleLowerCase();
  return books.filter(book => (tab === '全部' || book.format === tab)
    && (!needle || `${book.title} ${book.author} ${book.format}`.toLocaleLowerCase().includes(needle))
    && (view !== 'favorites' || book.favorite)
    && (view !== 'recent' || book.lastRead))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'zh-CN') : sort === 'progress' ? (b.progress || 0) - (a.progress || 0) : (b.lastRead || b.added || 0) - (a.lastRead || a.added || 0));
}
export function readingProgress(index, count) { return count <= 1 ? 100 : Math.min(100, Math.max(0, Math.round(index / (count - 1) * 100))); }

// SHA-256 and random IDs also work on an ordinary HTTP LAN address (no secure-context APIs).
export function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function fileFingerprint(buffer) { return Array.from(sha256(new Uint8Array(buffer)), b => b.toString(16).padStart(2, '0')).join(''); }
