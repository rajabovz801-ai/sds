'use client';

export type TestTrack = 'ielts' | 'cefr';
export type TestSkill = 'reading' | 'listening' | 'writing' | 'speaking' | 'full-mock';
export type TestStatus = 'published' | 'draft';

export type StoredTest = {
  id: string;
  title: string;
  track: TestTrack;
  skill: TestSkill;
  status: TestStatus;
  description: string;
  html: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = 'ark_mock_platform';
const STORE_NAME = 'tests';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listTests(): Promise<StoredTest[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as StoredTest[]).sort((a,b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    request.onerror = () => reject(request.error);
  });
}

export async function getTest(id: string): Promise<StoredTest | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredTest | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTest(test: StoredTest): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(test);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTest(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}
