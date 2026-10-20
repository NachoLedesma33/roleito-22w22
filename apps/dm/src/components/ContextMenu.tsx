import { Fragment, useEffect, useRef, useState } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  /** Items anidados: al clickear el padre se despliegan indentados debajo. */
  submenu?: ContextMenuItem[];
}

const rowClass = (m: ContextMenuItem) =>
  `w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
    m.danger
      ? 'text-red-400 hover:bg-red-500/10'
      : m.disabled
      ? 'text-[var(--text-secondary)] opacity-40 cursor-not-allowed'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
  }`;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const itemsHeight = items.length * 36 + 16;
  const adjustedY = Math.max(8, Math.min(y, window.innerHeight - Math.min(itemsHeight, window.innerHeight * 0.7) - 8));

  return (
    <div
      ref={menuRef}
      data-testid="context-menu"
      className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded-lg shadow-xl py-1 min-w-[180px] max-h-[70vh] overflow-y-auto animate-in fade-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="my-1 border-t border-[var(--bg-tertiary)]" />;
        }
        const hasSubmenu = !!item.submenu && item.submenu.length > 0;
        const isOpen = hasSubmenu && openSubmenu === i;
        return (
          <Fragment key={i}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasSubmenu) {
                  setOpenSubmenu(isOpen ? null : i);
                  return;
                }
                item.onClick();
                onClose();
              }}
              disabled={item.disabled}
              aria-expanded={hasSubmenu ? isOpen : undefined}
              className={rowClass(item)}
            >
              {item.icon && <span className="text-[10px] w-4 text-center">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {hasSubmenu && <span className="text-[9px] opacity-60">{isOpen ? '▾' : '▸'}</span>}
            </button>
            {isOpen && item.submenu && (
              <div className="ml-4 border-l border-[var(--bg-tertiary)] pl-1 py-0.5">
                {item.submenu.map((sub, j) => (
                  <button
                    key={j}
                    onClick={(e) => {
                      e.stopPropagation();
                      sub.onClick();
                      onClose();
                    }}
                    disabled={sub.disabled}
                    className={rowClass(sub)}
                  >
                    {sub.icon && <span className="text-[10px] w-4 text-center">{sub.icon}</span>}
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
