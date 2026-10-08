import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import PinForm from './PinForm';

type Mode = 'login' | 'register' | 'change';

const inputClass =
  'w-full text-center bg-surface-2 border border-border rounded-lg py-3 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

const pinInputClass = `${inputClass} text-3xl tracking-[0.5em]`;

const secondaryClass =
  'w-full py-2 text-xs text-brand hover:text-brand-hover underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md';

/**
 * Pantalla de entrada. El login es nombre de perfil + PIN; a un costado, los
 * perfiles guardados para elegir si no te acordás del nombre. La parte visual
 * del formulario está en `PinForm`, que no depende de auth ni de la pantalla.
 */
export default function PinLogin() {
  const { login, registerDm, changePin, dms } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
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
    if (!dmName) {
      setError('Ingresá el nombre de tu perfil');
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError('PIN debe tener 4-8 dígitos');
      return;
    }
    setLoading(true);
    try {
      await login(dmName, pin);
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
          <p className="text-xs text-ink-muted mb-2 text-center">Perfiles en esta máquina</p>
          <div className="space-y-1.5">
            {dms.map((dm) => (
              <button
                key={dm.id}
                type="button"
                onClick={() => { setDmName(dm.name); setError(''); }}
                data-testid="login-saved-dm"
                className="w-full px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface border border-border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block text-sm text-ink truncate">{dm.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-muted text-center">
          No hay perfiles en esta máquina. Creá uno nuevo.
        </p>
      )}
    </div>
  );

  const shell = (subtitle: string, body: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-ink">Roleito</h1>
          <div className="mt-3 mx-auto h-1 w-16 bg-brand" aria-hidden="true" />
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 space-y-5 shadow-lg">
          <p className="text-sm text-ink-muted text-center">{subtitle}</p>
          {body}
        </div>
      </div>
    </div>
  );

  const errorMessage = error ? (
    <p role="alert" data-testid="login-error" className="text-sm text-danger text-center">
      {error}
    </p>
  ) : null;

  if (mode === 'register') {
    return shell(
      'Creá tu DM (4-8 dígitos)',
      <form onSubmit={submitRegister} className="space-y-5">
        <label className="sr-only" htmlFor="register-name">
          Nombre del DM
        </label>
        <input
          id="register-name"
          type="text"
          value={dmName}
          onChange={(e) => setDmName(e.target.value)}
          placeholder="Nombre del DM"
          autoFocus
          className={`${inputClass} text-lg`}
        />
        <label className="sr-only" htmlFor="register-pin">
          PIN
        </label>
        <input
          id="register-pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="····"
          className={pinInputClass}
        />
        <label className="sr-only" htmlFor="register-confirm">
          Confirmar PIN
        </label>
        <input
          id="register-confirm"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Confirmar PIN"
          className={pinInputClass}
        />
        {errorMessage}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '...' : 'Crear DM'}
        </Button>
        <button type="button" onClick={() => switchTo('login')} className={secondaryClass}>
          ← Volver
        </button>
      </form>
    );
  }

  if (mode === 'change') {
    return shell(
      'Cambiar PIN — ingresá el actual y el nuevo',
      <form onSubmit={submitChange} className="space-y-5">
        <label className="sr-only" htmlFor="change-current">
          PIN actual (opcional)
        </label>
        <input
          id="change-current"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN actual (opcional)"
          autoFocus
          className={pinInputClass}
        />
        <label className="sr-only" htmlFor="change-new">
          PIN nuevo
        </label>
        <input
          id="change-new"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="PIN nuevo"
          className={pinInputClass}
        />
        <label className="sr-only" htmlFor="change-confirm">
          Confirmar PIN
        </label>
        <input
          id="change-confirm"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Confirmar PIN"
          className={pinInputClass}
        />
        {errorMessage}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? '...' : 'Cambiar PIN'}
        </Button>
        <button type="button" onClick={() => switchTo('login')} className={secondaryClass}>
          ← Volver
        </button>
      </form>
    );
  }

  return shell(
    'Ingresá el nombre de tu perfil y tu PIN',
    <PinForm
      nameValue={dmName}
      onNameChange={setDmName}
      pinValue={pin}
      onPinChange={setPin}
      onSubmit={submitLogin}
      submitLabel="Entrar"
      error={error}
      loading={loading}
      aside={savedDms}
      footer={
        <div className="space-y-1">
          <button type="button" onClick={() => switchTo('register')} className={secondaryClass}>
            Crear DM nuevo
          </button>
          {dms.length > 0 && (
            <button type="button" onClick={() => switchTo('change')} className={secondaryClass}>
              Cambiar PIN
            </button>
          )}
        </div>
      }
    />
  );
}
