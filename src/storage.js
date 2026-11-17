const DB_NAME = 'qidu-library';
let dbPromise;
export function openDb() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('books', { keyPath: 'id' });
      request.result.createObjectStore('files');
      request.result.createObjectStore('settings');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
async function operation(stores, mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    try { result = callback(tx); } catch (error) { reject(error); return; }
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('存储操作已取消'));
  });
}
export const allBooks = () => operation(['books'], 'readonly', tx => tx.objectStore('books').getAll());
export const saveBook = book => operation(['books'], 'readwrite', tx => tx.objectStore('books').put(book));
export const loadFile = id => operation(['files'], 'readonly', tx => tx.objectStore('files').get(id));
export const saveImportedBook = (book, blob) => operation(['books', 'files'], 'readwrite', tx => {
  tx.objectStore('books').put(book);
  tx.objectStore('files').put(blob, book.id);
});
export const removeBook = id => operation(['books', 'files'], 'readwrite', tx => {
  tx.objectStore('books').delete(id);
  tx.objectStore('files').delete(id);
});
export const getSetting = key => operation(['settings'], 'readonly', tx => tx.objectStore('settings').get(key));
export const setSetting = (key, value) => operation(['settings'], 'readwrite', tx => tx.objectStore('settings').put(value, key));
export async function seedLibrary(samples) {
  if (await getSetting('initialized')) return;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['books', 'settings'], 'readwrite');
    for (const book of samples) tx.objectStore('books').put(book);
    tx.objectStore('settings').put(true, 'initialized');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
