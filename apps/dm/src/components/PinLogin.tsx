import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'choose' | 'select-dm' | 'login' | 'register' | 'change';

export default function PinLogin() {
  const { login, registerDm, changePin, dms } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [selectedDm, setSelectedDm] = useState<{ id: string; name: string } | null>(null);
  const [dmName, setDmName] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCurrentPin('');
    setPin('');
    setConfirmPin('');
    setDmName('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (pin.length < 4 || pin.length > 8) {
        setError('PIN debe tener 4-8 dígitos');
        return;
      }
      if (!selectedDm) {
        setError('Seleccioná un DM');
        return;
      }
    } else if (mode === 'register') {
      if (!dmName.trim()) {
        setError('Ingresá un nombre');
        return;
      }
      if (pin.length < 4 || pin.length > 8) {
        setError('PIN debe tener 4-8 dígitos');
        return;
      }
      if (pin !== confirmPin) {
        setError('Los PINs no coinciden');
        return;
      }
    } else if (mode === 'change') {
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
    }

    setLoading(true);
    try {
      if (mode === 'login' && selectedDm) {
        await login(selectedDm.id, pin);
      } else if (mode === 'register') {
        await registerDm(dmName.trim(), pin);
      } else if (mode === 'change') {
        await changePin(currentPin || undefined, pin);
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
            {dms.length > 0 && (
              <button
                onClick={() => { resetForm(); setMode('select-dm'); }}
                className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm transition-colors"
              >
                Ingresar con PIN
              </button>
            )}
            <button
              onClick={() => { resetForm(); setMode('register'); }}
              className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm border border-gray-700 transition-colors"
            >
              Crear DM nuevo
            </button>
            {dms.length > 0 && (
              <button
                onClick={() => { resetForm(); setMode('change'); }}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Cambiar PIN
              </button>
            )}
          </div>

          {dms.length === 0 && (
            <p className="text-xs text-gray-500 text-center">
              No hay DMs registrados. Creá uno nuevo.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'select-dm') {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-100">Roleito</h1>
            <p className="text-xs text-gray-500 mt-1">Seleccioná tu DM</p>
          </div>

          <div className="space-y-2">
            {dms.map((dm) => (
              <button
                key={dm.id}
                onClick={() => { setSelectedDm({ id: dm.id, name: dm.name }); resetForm(); setMode('login'); }}
                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 font-medium text-sm border border-gray-700 transition-colors text-left px-4"
              >
                {dm.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { resetForm(); setMode('choose'); }}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const title = mode === 'register'
    ? 'Creá tu DM (4-8 dígitos)'
    : mode === 'change'
    ? 'Cambiar PIN — ingresá el actual y el nuevo'
    : `Ingresá tu PIN — ${selectedDm?.name}`;

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

        {mode === 'register' && (
          <input
            type="text"
            value={dmName}
            onChange={(e) => setDmName(e.target.value)}
            placeholder="Nombre del DM"
            autoFocus
            className="w-full text-center text-lg bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
          />
        )}

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

        {(mode === 'register' || mode === 'change') && (
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
          {loading ? '...' : mode === 'register' ? 'Crear DM' : mode === 'change' ? 'Cambiar PIN' : 'Entrar'}
        </button>

        <button
          type="button"
          onClick={() => { resetForm(); setMode(mode === 'change' ? 'choose' : dms.length > 0 ? 'select-dm' : 'choose'); }}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Volver
        </button>
      </form>
    </div>
  );
}
