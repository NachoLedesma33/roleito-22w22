const API = 'http://localhost:8000/api';
const { readFile } = await import('node:fs/promises');
const path = await import('node:path');

async function json(res, label) {
  if (!res.ok) throw new Error(`${label} failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function postJson(url, data, label) {
  return json(await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }), label);
}

async function uploadFile(url, filePath, label) {
  const buf = await readFile(filePath);
  const ext = path.extname(filePath).slice(1);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: `image/${ext === 'jpg' ? 'jpeg' : ext}` }), path.basename(filePath));
  return json(await fetch(url, { method: 'POST', body: form }), label);
}

const campaign = await postJson(`${API}/campaigns`, {
  name: 'Demo — La Taberna del Grifo Helado',
  description: 'Campaña DEMO con assets reales (Dice Grimorium, uso libre personal). Para probar el VTT visualmente.',
}, 'createCampaign');
console.log('campaign:', campaign.id);

const scenes = {};
for (const name of ['Taberna del Grifo Helado', 'Bosque Salvaje', 'Cripta Antigua']) {
  scenes[name] = await postJson(`${API}/campaigns/${campaign.id}/scenes`, { name }, `scene ${name}`);
}
await uploadFile(
  `${API}/campaigns/${campaign.id}/scenes/${scenes['Taberna del Grifo Helado'].id}/upload-background`,
  'tests/assets/maps/tavern-1536.jpg', 'bg taverna',
);
await uploadFile(
  `${API}/campaigns/${campaign.id}/scenes/${scenes['Bosque Salvaje'].id}/upload-background`,
  'tests/assets/maps/forest-wilderness-1024.jpg', 'bg bosque',
);
await uploadFile(
  `${API}/campaigns/${campaign.id}/scenes/${scenes['Cripta Antigua'].id}/upload-background`,
  'tests/assets/maps/dungeon-crypt-1024.jpg', 'bg cripta',
);
console.log('scenes con background OK');

// VIDA cualitativo: atributos '+' más, '/' neutro, '-' menos; PV/PM/Defensa los define el DM
const party = [
  { name: 'Aria', race: 'Elfa', class_name: 'Exploradora', vigor: '/', intelligence: '-', dexterity: '+', cunning: '+', max_pv: 12, max_pm: 9, defense: 6 },
  { name: 'Borin', race: 'Enano', class_name: 'Guerrero', vigor: '+', intelligence: '-', dexterity: '/', cunning: '-', max_pv: 18, max_pm: 6, defense: 5 },
  { name: 'Lyra', race: 'Humana', class_name: 'Maga', vigor: '-', intelligence: '+', dexterity: '/', cunning: '/', max_pv: 8, max_pm: 16, defense: 4 },
  { name: 'Tomás', race: 'Humano', class_name: 'Clérigo', vigor: '/', intelligence: '+', dexterity: '-', cunning: '+', max_pv: 14, max_pm: 14, defense: 5 },
];
const chars = [];
for (const c of party) chars.push(await postJson(`${API}/campaigns/${campaign.id}/characters`, { type: 'player', ...c }, `char ${c.name}`));

const inn = scenes['Taberna del Grifo Helado'];
const res = await fetch(`${API}/campaigns/${campaign.id}/scenes/${inn.id}/characters`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(chars.map((c, i) => ({
    entity_type: 'character',
    entity_id: c.id,
    x: -2 + i * 1.4,
    y: 0,
    z: i % 2 === 0 ? 1 : -1,
    visible: true,
    order: i,
  }))),
});
if (!res.ok) throw new Error(`seedTokens failed ${res.status}: ${await res.text()}`);

const npcIds = {};
for (const [name, desc] of [
  ['Grimble el Tabernero', 'Medioelfo rechoncho, siempre limpia la misma jarra. Sabe todos los rumores del valle.'],
  ['Capitán Dain', 'Guardia retirado que bebe en la esquina. Ojos entrenados, cicatriz vieja.'],
]) {
  const npc = await postJson(`${API}/campaigns/${campaign.id}/npcs`, { name, description: desc, vigor: '/', intelligence: '/', dexterity: '+', cunning: '-', max_pv: 10, max_pm: 8, defense: 5 }, `npc ${name}`);
  npcIds[name] = npc.id;
}

const PDIR = 'tests/assets/portraits/velazquez_portraits';
const portraits = {
  Aria: `${PDIR}/female_01.png`,
  Borin: `${PDIR}/male_02.png`,
  Lyra: `${PDIR}/female_03.png`,
  'Tomás': `${PDIR}/male_05.png`,
  'Grimble el Tabernero': `${PDIR}/male_08.png`,
  'Capitán Dain': `${PDIR}/male_12.png`,
};
for (const c of chars) await uploadFile(`${API}/campaigns/${campaign.id}/characters/${c.id}/portrait`, portraits[c.name], `retrato ${c.name}`);
for (const [name, id] of Object.entries(npcIds)) await uploadFile(`${API}/campaigns/${campaign.id}/npcs/${id}/portrait`, portraits[name], `retrato ${name}`);
console.log('retratos OK');

console.log('DEMO LISTA → http://localhost:5173/campaigns/' + campaign.id);
