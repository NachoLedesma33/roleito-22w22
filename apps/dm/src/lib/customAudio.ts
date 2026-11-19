import { api, type SharedAudioTrack } from './api';

export interface LocalAudioTrack {
  id: string;
  name: string;
}

interface StoredTrack extends LocalAudioTrack {
  fileName: string;
  blob: Blob;
}

const DB_NAME = 'roleito-audio';
const STORE = 'tracks';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    let result: T;
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error ?? req.error); };
  });
}

async function readTrack(id: string): Promise<StoredTrack | undefined> {
  return withStore<StoredTrack | undefined>('readonly', (s) => s.get(id) as IDBRequest<StoredTrack | undefined>);
}

export async function listLocalTracks(): Promise<LocalAudioTrack[]> {
  const stored = await withStore<StoredTrack[]>('readonly', (s) => s.getAll() as IDBRequest<StoredTrack[]>);
  return stored.map(({ id, name }) => ({ id, name }));
}

export async function addLocalTrack(file: File, name?: string): Promise<LocalAudioTrack> {
  const fileName = file.name || 'track.mp3';
  const track: StoredTrack = { id: crypto.randomUUID(), name: name || fileName, fileName, blob: file };
  await withStore('readwrite', (s) => s.put(track));
  return { id: track.id, name: track.name };
}

export async function deleteLocalTrack(id: string): Promise<void> {
  await withStore('readwrite', (s) => s.delete(id));
}

export async function getLocalTrackUrl(id: string): Promise<string | null> {
  const track = await readTrack(id);
  return track ? URL.createObjectURL(track.blob) : null;
}

export async function publishLocalTrack(campaignId: string, id: string): Promise<SharedAudioTrack[]> {
  const track = await readTrack(id);
  if (!track) throw new Error('Track not found');
  const file = new File([track.blob], track.fileName, { type: track.blob.type });
  const res = await api.campaigns.uploadAudioTrack(campaignId, file, track.name);
  return res.tracks;
}
