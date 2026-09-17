import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface TopBarProps {
  title: string;
  titleTo?: string;
  subtitle?: string;
  left?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function TopBar({ title, titleTo, subtitle, left, children, className = '' }: TopBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastScrollWidth = el.scrollWidth;
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
      lastScrollWidth = el.scrollWidth;
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    el.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        el.scrollLeft += e.deltaY;
      }
    }, { passive: true });
    const observer = new MutationObserver(() => {
      if (el.scrollWidth > lastScrollWidth + 4) {
        const delta = el.scrollWidth - lastScrollWidth;
        el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' });
      }
      lastScrollWidth = el.scrollWidth;
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    });
    observer.observe(el, { childList: true });
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      observer.disconnect();
      window.removeEventListener('resize', check);
    };
  }, []);

  return (
    <header className={`relative z-10 flex items-center gap-3 px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--bg-tertiary)] shrink-0 ${className}`}>
      {left}

      {titleTo ? (
        <Link to={titleTo} className="text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] shrink-0">
          {title}
        </Link>
      ) : (
        <span className="text-sm font-bold text-[var(--accent)] shrink-0">{title}</span>
      )}

      {subtitle && (
        <>
          <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
          <span className="text-xs text-[var(--text-secondary)] shrink-0">{subtitle}</span>
        </>
      )}

      <div className="relative flex-1 min-w-0 flex items-center">
        {canScrollLeft && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -120, behavior: 'smooth' })}
            className="absolute left-0 top-0 bottom-0 w-7 z-10 bg-gradient-to-r from-[var(--bg-primary)] to-transparent flex items-center justify-center text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity"
            title="Scroll toolbar left"
          >
            ‹
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
            className="absolute right-0 top-0 bottom-0 w-7 z-10 bg-gradient-to-l from-[var(--bg-primary)] to-transparent flex items-center justify-center text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity"
            title="Scroll toolbar right"
          >
            ›
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-none"
          style={{ scrollbarWidth: 'none', paddingLeft: canScrollLeft ? '1.5rem' : 0, paddingRight: canScrollRight ? '1.5rem' : 0 }}
        >
          {children}
        </div>
      </div>
    </header>
  );
}
