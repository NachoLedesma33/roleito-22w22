import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import CampaignList from '@/pages/CampaignList';
import CampaignForm from '@/pages/CampaignForm';
import CampaignDetail from '@/pages/CampaignDetail';
import CharacterList from '@/pages/CharacterList';
import CharacterForm from '@/pages/CharacterForm';
import CharacterDetail from '@/pages/CharacterDetail';
import NPCList from '@/pages/NPCList';
import NPCForm from '@/pages/NPCForm';
import NPCDetail from '@/pages/NPCDetail';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<CampaignList />} />
        <Route path="/campaigns/new" element={<CampaignForm />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/campaigns/:id/edit" element={<CampaignForm />} />
        <Route path="/campaigns/:id/characters" element={<CharacterList />} />
        <Route path="/campaigns/:id/characters/new" element={<CharacterForm />} />
        <Route path="/campaigns/:id/characters/:characterId" element={<CharacterDetail />} />
        <Route path="/campaigns/:id/characters/:characterId/edit" element={<CharacterForm />} />
        <Route path="/campaigns/:id/npcs" element={<NPCList />} />
        <Route path="/campaigns/:id/npcs/new" element={<NPCForm />} />
        <Route path="/campaigns/:id/npcs/:npcId" element={<NPCDetail />} />
        <Route path="/campaigns/:id/npcs/:npcId/edit" element={<NPCForm />} />
      </Route>
    </Routes>
  );
}

export default App
