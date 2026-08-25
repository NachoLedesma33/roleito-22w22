import { Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import PinLogin from '@/components/PinLogin';
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
import SessionList from '@/pages/SessionList';
import SessionForm from '@/pages/SessionForm';
import SessionDetail from '@/pages/SessionDetail';
import EventList from '@/pages/EventList';
import EventDetail from '@/pages/EventDetail';
import PlayerList from '@/pages/PlayerList';
import MapList from '@/pages/MapList';
import AssetList from '@/pages/AssetList';
import SceneList from '@/pages/SceneList';
import SceneDetail from '@/pages/SceneDetail';
import DmDashboard from '@/pages/DmDashboard';
import PlayerView from '@/pages/PlayerView';
import NarrativeEngine from '@/pages/NarrativeEngine';
import AgentPanel from '@/pages/AgentPanel';
import TTSPanel from '@/pages/TTSPanel';
import WorldStateView from '@/pages/WorldStateView';
import MemoryView from '@/pages/MemoryView';

function AuthGuard() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-gray-400">
        Cargando...
      </div>
    );
  }
  if (!session) return <PinLogin />;
  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Player View — public, uses invite code as auth */}
        <Route path="/campaigns/join/:code" element={<PlayerView />} />

        {/* DM routes — protected by PIN auth */}
        <Route element={<AuthGuard />}>
          <Route path="/campaigns/:id" element={<DmDashboard />} />

          <Route element={<Layout />}>
            <Route path="/" element={<CampaignList />} />
            <Route path="/campaigns/new" element={<CampaignForm />} />
            <Route path="/campaigns/:id/manage" element={<CampaignDetail />} />
            <Route path="/campaigns/:id/edit" element={<CampaignForm />} />
            <Route path="/campaigns/:id/characters" element={<CharacterList />} />
            <Route path="/campaigns/:id/characters/new" element={<CharacterForm />} />
            <Route path="/campaigns/:id/characters/:characterId" element={<CharacterDetail />} />
            <Route path="/campaigns/:id/characters/:characterId/edit" element={<CharacterForm />} />
            <Route path="/campaigns/:id/npcs" element={<NPCList />} />
            <Route path="/campaigns/:id/npcs/new" element={<NPCForm />} />
            <Route path="/campaigns/:id/npcs/:npcId" element={<NPCDetail />} />
            <Route path="/campaigns/:id/npcs/:npcId/edit" element={<NPCForm />} />
            <Route path="/campaigns/:id/sessions" element={<SessionList />} />
            <Route path="/campaigns/:id/sessions/new" element={<SessionForm />} />
            <Route path="/campaigns/:id/sessions/:sessionId" element={<SessionDetail />} />
            <Route path="/campaigns/:id/sessions/:sessionId/edit" element={<SessionForm />} />
            <Route path="/campaigns/:id/sessions/:sessionId/events" element={<EventList />} />
            <Route path="/campaigns/:id/events" element={<EventList />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/campaigns/:id/players" element={<PlayerList />} />
            <Route path="/campaigns/:id/maps" element={<MapList />} />
            <Route path="/campaigns/:id/assets" element={<AssetList />} />
            <Route path="/campaigns/:id/scenes" element={<SceneList />} />
            <Route path="/campaigns/:id/scenes/:sceneId" element={<SceneDetail />} />
            <Route path="/campaigns/:id/narrative" element={<NarrativeEngine />} />
            <Route path="/campaigns/:id/agents" element={<AgentPanel />} />
            <Route path="/campaigns/:id/tts" element={<TTSPanel />} />
            <Route path="/campaigns/:id/world-state" element={<WorldStateView />} />
            <Route path="/campaigns/:id/memory" element={<MemoryView />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App
