import { useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, ChevronLeft, Dices, Globe, LogOut, Palette, Scroll, Settings, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PreferencesDrawer from '@/components/PreferencesDrawer';
import { Island } from '@/components/ui/Island';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface SectorTile {
  id: string;
  label: string;
  to?: string;
}

interface Sector {
  id: string;
  label: string;
  icon: ReactNode;
  tiles?: SectorTile[];
}

const SECTORS: Sector[] = [
  {
    id: 'mesa',
    label: 'Mesa',
    icon: <Dices className="h-4 w-4" />,
    tiles: [
      { id: 'vtt', label: 'VTT', to: '' },
      { id: 'manage', label: 'Resumen', to: '/manage' },
    ],
  },
  {
    id: 'mundo',
    label: 'Mundo',
    icon: <Globe className="h-4 w-4" />,
    tiles: [
      { id: 'world-state', label: 'Estado del mundo', to: '/world-state' },
      { id: 'memory', label: 'Memoria', to: '/memory' },
      { id: 'events', label: 'Eventos', to: '/events' },
      { id: 'scenes', label: 'Escenas', to: '/scenes' },
    ],
  },
  {
    id: 'cronica',
    label: 'Crónica',
    icon: <Scroll className="h-4 w-4" />,
    tiles: [
      { id: 'sessions', label: 'Sesiones', to: '/sessions' },
      { id: 'narrative', label: 'Narrativa', to: '/narrative' },
    ],
  },
  {
    id: 'reparto',
    label: 'Reparto',
    icon: <Users className="h-4 w-4" />,
    tiles: [
      { id: 'characters', label: 'Personajes', to: '/characters' },
      { id: 'players', label: 'Jugadores', to: '/players' },
    ],
  },
  {
    id: 'estudio',
    label: 'Estudio',
    icon: <Palette className="h-4 w-4" />,
    tiles: [
      { id: 'maps', label: 'Imágenes', to: '/maps' },
      { id: 'assets', label: 'Recursos', to: '/assets' },
      { id: 'tts', label: 'Voz', to: '/tts' },
    ],
  },
  {
    id: 'consola',
    label: 'Consola IA',
    icon: <Bot className="h-4 w-4" />,
    tiles: [{ id: 'agents', label: 'Agentes', to: '/agents' }],
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    icon: <Settings className="h-4 w-4" />,
  },
];

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id: string }>();
  const { logout, session } = useAuth();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [activeSector, setActiveSector] = useState<number | null>(null);

  // Salir cierra la sesión y vuelve a la landing (no al formulario de PIN).
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  const confirmLogout = async () => {
    setLogoutOpen(false);
    await handleLogout();
  };
  const logoutDialog = (
    <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Salir de 22w22?</DialogTitle>
          <DialogDescription>Para volver a entrar vas a necesitar el PIN.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Cancelar
            </button>
          </DialogClose>
          <button
            onClick={confirmLogout}
            className="text-sm text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded px-3 py-1.5 transition-colors"
          >
            Salir
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const isInCampaign = !!campaignId && location.pathname.startsWith(`/campaigns/${campaignId}`);

  if (!isInCampaign) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-[var(--bg-tertiary)] px-6 py-3 flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-[var(--accent)]">
            22w22
          </Link>
          <nav className="flex gap-4">
            <Link
              to="/"
              className={`text-sm transition-colors ${
                location.pathname === '/'
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Campañas
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {session?.dm_name && (
              <span className="text-sm text-[var(--text-secondary)]">{session.dm_name}</span>
            )}
            <button
              onClick={() => setPrefsOpen(true)}
              aria-label={t('settings.title')}
              title={t('settings.title')}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLogoutOpen(true)}
              className="text-sm text-[var(--text-secondary)] hover:text-red-400 transition-colors"
            >
              Salir
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
        {logoutDialog}
        <PreferencesDrawer open={prefsOpen} onOpenChange={setPrefsOpen} />
      </div>
    );
  }

  const basePath = `/campaigns/${campaignId}`;

  const activeSectorIndex = SECTORS.findIndex((s) =>
    s.tiles?.some((tile) => {
      const full = tile.to === '' ? basePath : `${basePath}${tile.to}`;
      return tile.to === '' ? location.pathname === full : location.pathname.startsWith(full);
    })
  );

  const openSector = activeSector !== null ? SECTORS[activeSector] : null;

  const handleSectorSelect = (tileId: string) => {
    if (openSector?.id === 'ajustes') {
      setPrefsOpen(true);
      setActiveSector(null);
      return;
    }
    const tile = openSector?.tiles?.find((t) => t.id === tileId);
    if (tile?.to !== undefined) {
      navigate(tile.to === '' ? basePath : `${basePath}${tile.to}`);
    }
    setActiveSector(null);
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-14 border-r border-[var(--bg-tertiary)] flex flex-col items-center py-3 gap-3 shrink-0">
        <Link
          to="/"
          title="Campañas"
          aria-label="Campañas"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          to={basePath}
          title="VTT"
          aria-label="VTT"
          className="text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          22
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-1" aria-label="Sectores">
          {SECTORS.map((sector, index) => (
            <button
              key={sector.id}
              onClick={() => setActiveSector(index)}
              title={sector.label}
              aria-label={sector.label}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                index === activeSectorIndex
                  ? 'text-[var(--accent)] bg-[var(--bg-tertiary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {sector.icon}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setLogoutOpen(true)}
          title="Salir"
          aria-label="Salir"
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>

      {openSector && (
        <Island
          open
          onClose={() => setActiveSector(null)}
          onSelect={handleSectorSelect}
          title={openSector.label}
          items={(openSector.tiles ?? []).map((tile) => ({ id: tile.id, label: tile.label }))}
        />
      )}
      {logoutDialog}
      <PreferencesDrawer open={prefsOpen} onOpenChange={setPrefsOpen} />
    </div>
  );
}