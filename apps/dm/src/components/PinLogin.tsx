import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PinForm from './PinForm';

type Mode = 'login' | 'register' | 'change';

/**
 * Pantalla de entrada. El login es ID + PIN; a un costado, los IDs guardados
 * para autocompletar si no te acordás. La parte visual del formulario está en
 * `PinForm`, que no depende de auth ni de la pantalla.
 */
export default function PinLogin() {
  const { login, registerDm, changePin, dms } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [dmId, setDmId] = useState('');
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

  const switchTo = (next: Mode) => {
    resetForm();
    setMode(next);
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dmId) {
      setError('Ingresá tu ID de DM');
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError('PIN debe tener 4-8 dígitos');
      return;
    }
    setLoading(true);
    try {
      await login(dmId, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    setLoading(true);
    try {
      await registerDm(dmName.trim(), pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const submitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
    setLoading(true);
    try {
      await changePin(currentPin || undefined, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const savedDms = (
    <div data-testid="login-saved-dms">
      {dms.length > 0 ? (
        <>
          <p className="text-[11px] text-gray-500 mb-2 text-center">IDs guardados</p>
          <div className="space-y-1.5">
            {dms.map((dm) => (
              <button
                key={dm.id}
                type="button"
                onClick={() => { setDmId(dm.id); setError(''); }}
                data-testid="login-saved-dm"
                className="w-full px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-700 border border-gray-700/60 text-left transition-colors"
              >
                <span className="block text-sm text-gray-100 truncate">{dm.name}</span>
                <span className="block text-[11px] text-gray-500 font-mono truncate">{dm.id}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-500 text-center">No hay DMs registrados. Creá uno nuevo.</p>
      )}
    </div>
  );

  const shell = (subtitle: string, body: React.ReactNode) => (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-100">Roleito</h1>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        {body}
      </div>
    </div>
  );

  if (mode === 'register') {
    return shell(
      'Creá tu DM (4-8 dígitos)',
      <form onSubmit={submitRegister} className="space-y-5">
        <input
          type="text"
          value={dmName}
          onChange={(e) => setDmName(e.target.value)}
          placeholder="Nombre del DM"
          autoFocus
          className="w-full text-center text-lg bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN"
          className="w-full text-center text-2xl tracking-[0.5em] bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
        />
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
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Crear DM'}
        </button>
        <button
          type="button"
          onClick={() => switchTo('login')}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Volver
        </button>
      </form>
    );
  }

  if (mode === 'change') {
    return shell(
      'Cambiar PIN — ingresá el actual y el nuevo',
      <form onSubmit={submitChange} className="space-y-5">
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
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN nuevo"
          className="w-full text-center text-2xl tracking-[0.5em] bg-gray-800/50 border border-gray-700 rounded-lg py-3 text-gray-100 focus:outline-none focus:border-emerald-600 transition-colors"
        />
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
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Cambiar PIN'}
        </button>
        <button
          type="button"
          onClick={() => switchTo('login')}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Volver
        </button>
      </form>
    );
  }

  return shell(
    'Ingresá tu ID de DM y tu PIN',
    <PinForm
      idValue={dmId}
      onIdChange={setDmId}
      pinValue={pin}
      onPinChange={setPin}
      onSubmit={submitLogin}
      submitLabel="Entrar"
      error={error}
      loading={loading}
      aside={savedDms}
      footer={
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => switchTo('register')}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Crear DM nuevo
          </button>
          {dms.length > 0 && (
            <button
              type="button"
              onClick={() => switchTo('change')}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cambiar PIN
            </button>
          )}
        </div>
      }
    />
  );
}
