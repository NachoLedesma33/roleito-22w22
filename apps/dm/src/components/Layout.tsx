import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

const campaignNav = [
  { to: '', label: 'VTT', icon: '◆' },
  { to: '/manage', label: 'Resumen', icon: '◇' },
  { to: '/characters', label: 'Personajes', icon: '♦' },
  { to: '/sessions', label: 'Sesiones', icon: '♠' },
  { to: '/scenes', label: 'Escenas', icon: '▣' },
  { to: '/events', label: 'Eventos', icon: '•' },
  { to: '/narrative', label: 'Narrativa', icon: '▸' },
  { to: '/agents', label: 'Agentes', icon: '◆' },
  { to: '/tts', label: 'Voz', icon: '♪' },
  { to: '/world-state', label: 'Estado del mundo', icon: '◉' },
  { to: '/memory', label: 'Memoria', icon: '◎' },
  { to: '/players', label: 'Jugadores', icon: '○' },
  { to: '/maps', label: 'Imágenes', icon: '◈' },
  { to: '/assets', label: 'Recursos', icon: '□' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id: string }>();
  const { logout, session } = useAuth();

  // Salir cierra la sesión y vuelve a la landing (no al formulario de PIN).
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  const [logoutOpen, setLogoutOpen] = useState(false);
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
      </div>
    );
  }

  const basePath = `/campaigns/${campaignId}`;

  const navItems = campaignNav.map((item) => {
    const fullPath = item.to ? `${basePath}${item.to}` : basePath;
    const isExact = item.to === '' || item.to === '/manage';
    const isActive = isExact
      ? location.pathname === fullPath
      : location.pathname.startsWith(`${basePath}${item.to}`);
    return { ...item, fullPath, isActive };
  });

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-[var(--bg-tertiary)] flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-[var(--bg-tertiary)]">
          <Link to="/" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            ← Campañas
          </Link>
          <Link to={basePath} className="block mt-2 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors truncate">
            22w22
          </Link>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.fullPath}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                item.isActive
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50'
              }`}
            >
              <span className="text-xs opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-[var(--bg-tertiary)]">
          {session?.dm_name && (
            <p className="text-xs text-[var(--text-secondary)] mb-2">{session.dm_name}</p>
          )}
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full text-left text-sm text-[var(--text-secondary)] hover:text-red-400 transition-colors"
          >
            ← Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
      {logoutDialog}
    </div>
  );
}
