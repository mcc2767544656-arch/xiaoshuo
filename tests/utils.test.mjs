import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, extension, formatBytes, validateFile, decodeText, splitChapters, filterBooks, fileFingerprint, randomId, MAX_FILE_SIZE } from '../src/utils.js';
test('escape untrusted titles and filenames', () => assert.equal(escapeHtml('<x a="&">\'hi'), '&lt;x a=&quot;&amp;&quot;&gt;&#39;hi'));
test('supported formats and import limits', () => {
  assert.equal(extension('my.book.ePub'), 'EPUB');
  for (const name of ['b.TXT','b.epub','b.pdf']) assert.equal(validateFile({name, size: 10}), null);
  assert.ok(validateFile({name: 'file.exe', size: 12}));
  assert.ok(validateFile({name: 'file.txt', size: 0}));
  assert.ok(validateFile({name: 'file.pdf', size: MAX_FILE_SIZE + 1}));
  assert.equal(formatBytes(2048), '2 KB');
});
test('Chinese TXT decoding: UTF8, GB18030, UTF16 BOM', () => {
  assert.equal(decodeText(new TextEncoder().encode('山野来信')), '山野来信');
  assert.equal(decodeText(new Uint8Array([0xd6, 0xd0, 0xce, 0xc4])), '中文');
  assert.equal(decodeText(new Uint8Array([0xff, 0xfe, 0x2d, 0x4e])), '中');
});
test('Chinese and English chapter splitting with preface', () => {
  const result = splitChapters('开头\r\n\r\n第一章 山风\r\n段落一\r\n段落二\r\nChapter 2 Home\r\nThe end.', '书名');
  assert.equal(result.length, 3);
  assert.equal(result[1].title, '第一章 山风');
  assert.deepEqual(result[1].paragraphs, ['段落一', '段落二']);
  assert.equal(splitChapters('没有标题的正文')[0].title, '正文');
  assert.equal(splitChapters('')[0].paragraphs.length, 1);
});
test('library filtering and sorting do not mutate stored array', () => {
  const books = [{title:'山风',author:'作者',format:'TXT',added:1,progress:50,favorite:true}, {title:'Island',author:'Studio',format:'PDF',added:2,progress:30,lastRead:5}];
  assert.equal(filterBooks(books, {query:'studio'})[0].title, 'Island');
  assert.equal(filterBooks(books, {view:'favorites'}).length, 1);
  assert.equal(filterBooks(books, {tab:'EPUB'}).length, 0);
  assert.equal(filterBooks(books, {view:'recent'}).length, 1);
  assert.equal(filterBooks(books, {sort:'progress'})[0].title, '山风');
  assert.equal(books[0].title, '山风');
});
test('SHA256 fingerprints and UUIDs', () => {
  assert.equal(fileFingerprint(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const id = randomId();
  assert.match(id, /^[a-f0-9-]{36}$/);
  assert.notEqual(id, randomId());
});
