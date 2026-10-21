import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import MagitechField from '@/components/ui/MagitechField';
import MagitechButton from '@/components/ui/MagitechButton';
import PinForm from './PinForm';

type Mode = 'login' | 'register' | 'change';

/**
 * Links secundarios: serif, minimos, con un halo cian al pasar por encima.
 * Son la voz del mundo (el grimorio, la anotacion al margen), no un boton.
 */
const secondaryClass =
  'font-display text-sm tracking-wide text-gray-300 underline decoration-transparent underline-offset-4 transition-colors duration-base hover:text-cyan-300 hover:decoration-cyan-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

/**
 * Pantalla de entrada. El login es nombre de perfil + PIN; a un costado, los
 * perfiles guardados para elegir si no te acordás del nombre. La parte visual
 * del formulario está en `PinForm`, que no depende de auth ni de la pantalla.
 */
export default function PinLogin({ unlocking = false }: { unlocking?: boolean }) {
  const { t } = useTranslation();
  const { login, registerDm, changePin, profiles } = useAuth();
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
      setError(t('login.errorName', 'Ingresá el nombre de tu perfil'));
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError(t('login.errorPinShort', 'PIN debe tener 4-8 dígitos'));
      return;
    }
    setLoading(true);
    try {
      await login(dmName, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error', 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dmName.trim()) {
      setError(t('login.errorNameRegister', 'Ingresá un nombre'));
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError(t('login.errorPinShort', 'PIN debe tener 4-8 dígitos'));
      return;
    }
    if (pin !== confirmPin) {
      setError(t('login.errorPinMismatch', 'Los PINs no coinciden'));
      return;
    }
    setLoading(true);
    try {
      await registerDm(dmName.trim(), pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error', 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const submitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (currentPin && (currentPin.length < 4 || currentPin.length > 8)) {
      setError(t('login.errorCurrentPin', 'PIN actual debe tener 4-8 dígitos'));
      return;
    }
    if (pin.length < 4 || pin.length > 8) {
      setError(t('login.errorNewPin', 'PIN nuevo debe tener 4-8 dígitos'));
      return;
    }
    if (currentPin && pin === currentPin) {
      setError(t('login.errorSamePin', 'El PIN nuevo debe ser diferente al actual'));
      return;
    }
    if (pin !== confirmPin) {
      setError(t('login.errorPinMismatch', 'Los PINs no coinciden'));
      return;
    }
    setLoading(true);
    try {
      await changePin(currentPin || undefined, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error', 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const savedDms = (
    <div data-testid="login-saved-dms">
      {profiles.length > 0 ? (
        <>
          <p className="text-[0.65rem] text-gray-300 mb-3 text-center font-mono uppercase tracking-[0.25em]">
            {t('login.savedProfiles', 'Perfiles en esta máquina')}
          </p>
          <div className="space-y-1.5">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => { setDmName(profile.name); setError(''); }}
                data-testid="login-saved-dm"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-left transition-colors hover:border-cyan-400/70 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block font-mono text-sm text-ink truncate">{profile.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400 text-center">
          {t('login.noProfiles', 'No hay perfiles en esta máquina. Creá uno nuevo.')}
        </p>
      )}
    </div>
  );

  const shell = (subtitle: string, body: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <div className="text-center mb-6">
            <h1 className="font-display text-xl tracking-widest text-ink [text-shadow:0_0_18px_rgba(76,194,255,0.35)]">
              {t('app.name')}
            </h1>
            <div
              className="mt-3 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-brass-500 to-transparent"
              aria-hidden="true"
            />
          </div>
          {/* Vidrio oscuro: el video de marca se ve a traves del panel. */}
          <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brass-500)_28%,transparent)] bg-[color-mix(in_srgb,var(--obsidian-900)_62%,transparent)] backdrop-blur-xl shadow-[0_0_70px_-30px_rgba(201,162,39,0.55)]">
            <span className="magitech-beam" aria-hidden="true" />
            <div className="relative flex flex-col gap-6 p-10">
              <p className="text-center font-mono text-[0.65rem] uppercase tracking-[0.3em] text-gray-300">
                {subtitle}
              </p>
              {body}
            </div>
          </div>
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
      t('login.registerSubtitle', 'Creá tu DM (4-8 dígitos)'),
      <form onSubmit={submitRegister} className="flex flex-col gap-6">
        <MagitechField
          id="register-name"
          value={dmName}
          onChange={setDmName}
          label={t('login.dmName', 'Nombre del DM')}
          placeholder={t('login.dmName', 'Nombre del DM')}
          autoFocus
          testId="register-name"
          unlocking={unlocking}
        />
        <MagitechField
          id="register-pin"
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, ''))}
          label={t('login.pin', 'PIN')}
          pin
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          testId="register-pin"
          unlocking={unlocking}
        />
        <MagitechField
          id="register-confirm"
          value={confirmPin}
          onChange={(v) => setConfirmPin(v.replace(/\D/g, ''))}
          label={t('login.confirmPin', 'Confirmar PIN')}
          pin
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          testId="register-confirm"
          unlocking={unlocking}
        />
        {errorMessage}
        <MagitechButton type="submit" disabled={loading} data-testid="register-submit">
          {loading ? '...' : t('login.createButton', 'Crear DM')}
        </MagitechButton>
        <button type="button" onClick={() => switchTo('login')} className={secondaryClass}>
          ← {t('common.back')}
        </button>
      </form>
    );
  }

  if (mode === 'change') {
    return shell(
      t('login.changeSubtitle', 'Cambiar PIN — ingresá el actual y el nuevo'),
      <form onSubmit={submitChange} className="flex flex-col gap-6">
        <MagitechField
          id="change-current"
          value={currentPin}
          onChange={(v) => setCurrentPin(v.replace(/\D/g, ''))}
          label={t('login.currentPin', 'PIN actual (opcional)')}
          pin
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          testId="change-current"
          unlocking={unlocking}
        />
        <MagitechField
          id="change-new"
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, ''))}
          label={t('login.newPin', 'PIN nuevo')}
          pin
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          testId="change-new"
          unlocking={unlocking}
        />
        <MagitechField
          id="change-confirm"
          value={confirmPin}
          onChange={(v) => setConfirmPin(v.replace(/\D/g, ''))}
          label={t('login.confirmPin', 'Confirmar PIN')}
          pin
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          testId="change-confirm"
          unlocking={unlocking}
        />
        {errorMessage}
        <MagitechButton type="submit" disabled={loading} data-testid="change-submit">
          {loading ? '...' : t('login.changeButton', 'Cambiar PIN')}
        </MagitechButton>
        <button type="button" onClick={() => switchTo('login')} className={secondaryClass}>
          ← {t('common.back')}
        </button>
      </form>
    );
  }

  return shell(
    t('login.subtitle', 'Ingresá el nombre de tu perfil y tu PIN'),
    <PinForm
      nameValue={dmName}
      onNameChange={setDmName}
      pinValue={pin}
      onPinChange={setPin}
      onSubmit={submitLogin}
      submitLabel={t('login.enter', 'Entrar')}
      error={error}
      loading={loading}
      aside={savedDms}
      unlocking={unlocking}
      footer={
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={() => switchTo('register')} className={secondaryClass}>
            {t('login.createDm', 'Crear DM nuevo')}
          </button>
          {profiles.length > 0 && (
            <button type="button" onClick={() => switchTo('change')} className={secondaryClass}>
              {t('login.changePin', 'Cambiar PIN')}
            </button>
          )}
        </div>
      }
    />
  );
}
