import { Link, Outlet, useLocation, useParams } from 'react-router-dom';

const campaignNav = [
  { to: '', label: 'VTT', icon: '◆' },
  { to: '/manage', label: 'Overview', icon: '◇' },
  { to: '/characters', label: 'Characters', icon: '♦' },
  { to: '/sessions', label: 'Sessions', icon: '♠' },
  { to: '/scenes', label: 'Scenes', icon: '▣' },
  { to: '/events', label: 'Events', icon: '•' },
  { to: '/players', label: 'Players', icon: '○' },
  { to: '/maps', label: 'Images', icon: '◈' },
  { to: '/assets', label: 'Assets', icon: '□' },
];

export default function Layout() {
  const location = useLocation();
  const { id: campaignId } = useParams<{ id: string }>();
  const isInCampaign = !!campaignId && location.pathname.startsWith(`/campaigns/${campaignId}`);

  if (!isInCampaign) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-[var(--bg-tertiary)] px-6 py-3 flex items-center gap-6">
          <Link to="/" className="text-lg font-bold text-[var(--accent)]">
            Roleito
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
              Campaigns
            </Link>
          </nav>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
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
            ← Campaigns
          </Link>
          <Link to={basePath} className="block mt-2 text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors truncate">
            Roleito
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
          <p className="text-[10px] text-[var(--text-secondary)] opacity-60">DM Dashboard</p>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
