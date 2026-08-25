import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function PinLogin() {
  const { login, setupPin, pinSet } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSetup = !pinSet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4 || pin.length > 8) {
      setError('PIN debe tener 4-8 dígitos');
      return;
    }

    if (isSetup && pin !== confirmPin) {
      setError('Los PINs no coinciden');
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        await setupPin(pin);
      } else {
        await login(pin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-700/60 rounded-xl p-8 w-full max-w-sm space-y-5"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-100">Roleito</h1>
          <p className="text-xs text-gray-500 mt-1">
            {isSetup ? 'Creá tu PIN de DM (4-8 dígitos)' : 'Ingresá tu PIN'}
          </p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN"
          autoFocus
          className="w-full text-center text-2xl tracking-[0.5em] bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
        />

        {isSetup && (
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
          {loading ? '...' : isSetup ? 'Crear PIN' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
