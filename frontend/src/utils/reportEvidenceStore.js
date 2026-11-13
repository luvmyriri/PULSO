// Store original pending evidence, including Blob bytes, without JSON/base64
// size limits. It is removed after receipt recovery/completion.
function withStore(mode, action) {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Device photo storage is unavailable. Keep this page open and retry.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pulso-report-evidence-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('evidence');
    request.onerror = () => reject(new Error('Could not preserve the original photo. Keep this page open and retry.'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('evidence', mode);
      let result;
      const operation = action(transaction.objectStore('evidence'));
      operation.onsuccess = () => { result = operation.result; };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onerror = () => { db.close(); reject(new Error('Could not preserve the original photo. Keep this page open and retry.')); };
      transaction.onabort = transaction.onerror;
    };
  });
}

export const saveReportEvidence = (key, image) => withStore('readwrite', store => store.put(image, key));
export const loadReportEvidence = key => withStore('readonly', store => store.get(key));
export const dropReportEvidence = key => withStore('readwrite', store => store.delete(key));

// Compare-and-update stays inside one transaction, including across tabs.
// The updater must be synchronous and return the complete next value.
export function updateReportEvidence(key, update) {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Device photo storage is unavailable. Keep this page open and retry.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pulso-report-evidence-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('evidence');
    request.onerror = () => reject(new Error('Device draft storage could not be opened.'));
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('evidence', 'readwrite'), store = transaction.objectStore('evidence');
      let result, failure;
      const read = store.get(key);
      read.onsuccess = () => {
        try { result = update(read.result); store.put(result, key); }
        catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(failure || new Error('Device draft could not be saved.')); };
    };
  });
}
