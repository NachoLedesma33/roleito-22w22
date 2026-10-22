import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

/**
 * Página 404 con estética Magitech: alto contraste, sin transparencias ni blur.
 */
export default function NotFound() {
  return (
    <div
      className="min-h-screen grid place-items-center px-6 py-16"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div className="grid gap-10 w-full max-w-3xl text-center">
        {/* Visual central */}
        <div className="grid place-items-center">
          <motion.div
            className="relative"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* D20 rajado con 1 natural */}
            <svg width="220" height="220" viewBox="0 0 220 220" aria-hidden="true">
              <polygon
                points="110,18 200,78 178,190 42,190 20,78"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
              />
              <line x1="110" y1="18" x2="110" y2="190" stroke="var(--accent-secondary)" strokeWidth="2" />
              <line x1="20" y1="78" x2="200" y2="78" stroke="var(--accent-secondary)" strokeWidth="2" />
              <text
                x="110"
                y="138"
                textAnchor="middle"
                fontFamily="Cinzel, serif"
                fontSize="72"
                fontWeight="700"
                fill="var(--accent-secondary)"
              >
                1
              </text>
              {/* Rajadura */}
              <path
                d="M95 30 L125 90 L105 120 L135 185"
                stroke="var(--accent-secondary)"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            {/* Chispas */}
            <motion.span
              className="absolute top-6 left-10 w-2 h-2"
              style={{ backgroundColor: 'var(--accent-secondary)' }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <motion.span
              className="absolute bottom-8 right-12 w-2 h-2"
              style={{ backgroundColor: 'var(--accent)' }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.6 }}
            />
          </motion.div>
        </div>

        <h1
          className="font-cinzel text-4xl md:text-5xl tracking-widest"
          style={{ color: 'var(--accent-secondary)' }}
        >
          ERROR 404: PIFIA CRÍTICA
        </h1>
        <p className="font-montserrat text-lg md:text-xl" style={{ color: 'var(--text-primary)' }}>
          Tiraste un 1 natural en tu prueba de Investigación. El pergamino que buscas fue devorado por el vacío
          interdimensional o sus circuitos rúnicos han colapsado.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 justify-items-center">
          <Link
            to="/"
            className="px-6 py-3 font-montserrat font-semibold transition-shadow"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              boxShadow: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 20px rgba(109, 40, 217, 0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            Volver al Nexo
          </Link>
          <Link
            to="/campaigns"
            className="px-6 py-3 font-montserrat font-semibold border-2 transition-colors"
            style={{
              borderColor: '#a16207',
              color: '#a16207',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#a16207'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#a16207'; }}
          >
            Inspeccionar Campañas
          </Link>
        </div>
      </div>
    </div>
  );
}