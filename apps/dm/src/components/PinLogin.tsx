import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'choose' | 'login' | 'setup' | 'change';

export default function PinLogin() {
  const { login, setupPin, changePin, pinSet } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCurrentPin('');
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'change') {
      if (currentPin && (currentPin.length < 4 || currentPin.length > 8)) {
        setError('PIN actual debe tener 4-8 dígitos');
        return;
      }
      if (pin.length < 4 || pin.length > 8) {
        setError('PIN nuevo debe tener 4-8 dígitos');
        return;
      }
      if (currentPin && pin === currentPin) {
        setError('El PIN nuevo debe ser diferente al actual');
        return;
      }
      if (pin !== confirmPin) {
        setError('Los PINs no coinciden');
        return;
      }
    } else {
      if (pin.length < 4 || pin.length > 8) {
        setError('PIN debe tener 4-8 dígitos');
        return;
      }
      if (mode === 'setup' && pin !== confirmPin) {
        setError('Los PINs no coinciden');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'setup') {
        await setupPin(pin);
      } else if (mode === 'change') {
        await changePin(currentPin || undefined, pin);
      } else {
        await login(pin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-100">Roleito</h1>
            <p className="text-xs text-gray-500 mt-1">DM Authentication</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { resetForm(); setMode('login'); }}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm transition-colors"
            >
              Ingresar con PIN existente
            </button>
            <button
              onClick={() => { resetForm(); setMode(pinSet ? 'change' : 'setup'); }}
              className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm border border-gray-700 transition-colors"
            >
              Crear PIN nuevo
            </button>
          </div>

          {!pinSet && (
            <p className="text-xs text-gray-500 text-center">
              No hay PIN configurado. Creá uno nuevo.
            </p>
          )}
        </div>
      </div>
    );
  }

  const title = mode === 'setup'
    ? 'Creá tu PIN de DM (4-8 dígitos)'
    : mode === 'change'
    ? 'Crear PIN nuevo (opcional: ingresá el actual para mayor seguridad)'
    : 'Ingresá tu PIN';

  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-700/60 rounded-xl p-8 w-full max-w-sm space-y-5"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-100">Roleito</h1>
          <p className="text-xs text-gray-500 mt-1">{title}</p>
        </div>

        {mode === 'change' && (
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN actual (opcional)"
            autoFocus
            className="w-full text-center text-2xl tracking-[0.5em] bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
          />
        )}

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder={mode === 'change' ? 'PIN nuevo' : 'PIN'}
          autoFocus={mode !== 'change'}
          className="w-full text-center text-2xl tracking-[0.5em] bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
        />

        {(mode === 'setup' || mode === 'change') && (
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Confirmar PIN"
            className="w-full text-center text-2xl tracking-[0.5em] bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
          />
        )}

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : mode === 'setup' ? 'Crear PIN' : mode === 'change' ? 'Cambiar PIN' : 'Entrar'}
        </button>

        <button
          type="button"
          onClick={() => { resetForm(); setMode('choose'); }}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Volver
        </button>
      </form>
    </div>
  );
}
