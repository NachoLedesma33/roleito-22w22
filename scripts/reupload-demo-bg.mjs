import { readFile } from 'node:fs/promises';

const API = 'http://localhost:8000/api';
const CID = process.argv[2] || '511d941b-e9c3-4ebd-bf5f-63c94b07ee23';

async function upload(sceneId, file) {
  const buf = await readFile(file);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), file.split(/[\\/]/).pop());
  const res = await fetch(`${API}/campaigns/${CID}/scenes/${sceneId}/upload-background`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
}

const scenes = await (await fetch(`${API}/campaigns/${CID}/scenes`)).json();
for (const s of scenes) {
  const f = s.name.includes('Taberna')
    ? 'tests/assets/maps/tavern-1536.jpg'
    : s.name.includes('Bosque')
      ? 'tests/assets/maps/forest-wilderness-1024.jpg'
      : 'tests/assets/maps/dungeon-crypt-1024.jpg';
  await upload(s.id, f);
  console.log('re-up:', s.name, '<-', f);
}
