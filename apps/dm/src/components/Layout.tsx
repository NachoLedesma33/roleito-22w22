import { Link, Outlet, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Campaigns' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--bg-tertiary)] px-6 py-3 flex items-center gap-6">
        <Link to="/" className="text-lg font-bold text-[var(--accent)]">
          Roleito
        </Link>
        <nav className="flex gap-4">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors ${
                location.pathname === item.to
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
