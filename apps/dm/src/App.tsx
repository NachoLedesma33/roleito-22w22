import { Suspense, lazy, useState } from 'react';
import { Navigate, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginShell from '@/components/LoginShell';
import ProfileIntro from '@/components/ProfileIntro';

/**
 * Cada pagina se carga cuando se la necesita (lazy).
 *
 * Antes todas entraban en el bundle principal: el POV del jugador descargaba
 * el dashboard del DM y 25 pantallas de administracion que no usa. Con la
 * emulacion movil de Lighthouse eso se castiga (Performance bajo) y por el
 * tunel la primera carga del jugador tardaba una eternidad.
 */
const Landing = lazy(() => import('@/pages/Landing'));
const Layout = lazy(() => import('@/components/Layout'));
const CampaignList = lazy(() => import('@/pages/CampaignList'));
const CampaignForm = lazy(() => import('@/pages/CampaignForm'));
const CampaignDetail = lazy(() => import('@/pages/CampaignDetail'));
const CharacterList = lazy(() => import('@/pages/CharacterList'));
const CharacterForm = lazy(() => import('@/pages/CharacterForm'));
const CharacterDetail = lazy(() => import('@/pages/CharacterDetail'));
const NPCList = lazy(() => import('@/pages/NPCList'));
const NPCForm = lazy(() => import('@/pages/NPCForm'));
const NPCDetail = lazy(() => import('@/pages/NPCDetail'));
const SessionList = lazy(() => import('@/pages/SessionList'));
const SessionForm = lazy(() => import('@/pages/SessionForm'));
const SessionDetail = lazy(() => import('@/pages/SessionDetail'));
const EventList = lazy(() => import('@/pages/EventList'));
const EventDetail = lazy(() => import('@/pages/EventDetail'));
const PlayerList = lazy(() => import('@/pages/PlayerList'));
const MapList = lazy(() => import('@/pages/MapList'));
const AssetList = lazy(() => import('@/pages/AssetList'));
const SceneList = lazy(() => import('@/pages/SceneList'));
const SceneDetail = lazy(() => import('@/pages/SceneDetail'));
const DmDashboard = lazy(() => import('@/pages/DmDashboard'));
const PlayerView = lazy(() => import('@/pages/PlayerView'));
const JoinRedirect = lazy(() => import('./pages/JoinRedirect'));
const NarrativeEngine = lazy(() => import('@/pages/NarrativeEngine'));
const AgentPanel = lazy(() => import('@/pages/AgentPanel'));
const TTSPanel = lazy(() => import('@/pages/TTSPanel'));
const WorldStateView = lazy(() => import('@/pages/WorldStateView'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const MemoryView = lazy(() => import('@/pages/MemoryView'));

function Splash() {
  return (
    <div className="h-screen flex items-center justify-center bg-bg text-ink-muted">Cargando...</div>
  );
}

function AuthGuard() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  // Sin sesión → landing (no al formulario): el login se entra desde ahí.
  if (!session) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Raíz pública: sin sesión → landing; con sesión → lobby de campañas. */
function HomeRoute() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (session) return <Navigate to="/campaigns" replace />;
  return <Landing />;
}

/** Login público: PIN ok → remolino → intro de video → lobby. */
function LoginRoute() {
  const { session, loading } = useAuth();
  const [phase, setPhase] = useState<'form' | 'intro' | 'done'>('form');
  if (loading) return <Splash />;
  if (!session || phase === 'form') {
    return <LoginShell onExitComplete={() => setPhase('intro')} />;
  }
  if (phase === 'intro') return <ProfileIntro onDone={() => setPhase('done')} />;
  return <Navigate to="/campaigns" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Splash />}>
      <Routes>
        {/* Player View — public, uses invite code as auth */}
        <Route path="/campaigns/join/:code" element={<PlayerView />} />
        {/* El link fijo del playtest remoto: redirige a la partida abierta */}
        <Route path="/join" element={<JoinRedirect />} />

        {/* Public entry: landing pre-login + PIN login */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<LoginRoute />} />

        {/* DM routes — protected by PIN auth */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/campaigns/:id" element={<DmDashboard />} />
            <Route path="/campaigns" element={<CampaignList />} />
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
      <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App
