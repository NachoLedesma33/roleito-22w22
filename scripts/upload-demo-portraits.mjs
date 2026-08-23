import { readFile } from 'node:fs/promises';

const API = 'http://localhost:8000/api';
const CID = process.argv[2] || '566921f6-83ef-4b78-ad0d-5ae179ddd84f';
const DIR = 'tests/assets/portraits/velazquez_portraits';

const MAP = {
  characters: {
    Aria: `${DIR}/female_01.png`,
    Borin: `${DIR}/male_02.png`,
    Lyra: `${DIR}/female_03.png`,
    'Tomás': `${DIR}/male_05.png`,
  },
  npcs: {
    'Grimble el Tabernero': `${DIR}/male_08.png`,
    'Capitán Dain': `${DIR}/male_12.png`,
  },
};

async function upload(url, file) {
  const buf = await readFile(file);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/png' }), file.split(/[\\/]/).pop());
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

for (const [name, file] of Object.entries(MAP.characters)) {
  const list = await (await fetch(`${API}/campaigns/${CID}/characters`)).json();
  const ch = list.find((c) => c.name === name);
  if (!ch) throw new Error(`personaje no encontrado: ${name}`);
  const upd = await upload(`${API}/campaigns/${CID}/characters/${ch.id}/portrait`, file);
  console.log('retrato:', name, '<-', file.split(/[\\/]/).pop(), '| path:', !!upd.portrait_path);
}

for (const [name, file] of Object.entries(MAP.npcs)) {
  const list = await (await fetch(`${API}/campaigns/${CID}/npcs`)).json();
  const npc = list.find((n) => n.name === name);
  if (!npc) throw new Error(`NPC no encontrado: ${name}`);
  const upd = await upload(`${API}/campaigns/${CID}/npcs/${npc.id}/portrait`, file);
  console.log('retrato:', name, '<-', file.split(/[\\/]/).pop(), '| path:', !!upd.portrait_path);
}
