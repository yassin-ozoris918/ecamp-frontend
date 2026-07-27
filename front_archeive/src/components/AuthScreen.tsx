import { useState } from 'react';
import { GraduationCap, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { generateDeviceFingerprint } from '../lib/device';


export function AuthScreen() {
  const { signIn, signUp, error, setError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // register fields
  const [fullName, setFullName] = useState('');
  const [educationLevel, setEducationLevel] = useState<'HIGH_SCHOOL' | 'UNIVERSITY'>('HIGH_SCHOOL');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');


  const errMsg = localError ?? error?.message ?? null;

  async function handleSubmit(e: React.FormEvent) {
    setLocalError(null);
    setError(null);
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const deviceId = generateDeviceFingerprint();
        const { error } = await signIn(email, password, deviceId);
        if (error) setLocalError(error.message);
      } else {
        if (password.length < 8) {
          setLocalError('Password must be at least 8 characters.');
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          setLocalError('Password must contain both letters and numbers.');
          return;
        }
        const egyptPhoneRegex = /^01[0125][0-9]{8}$/;
        if (!egyptPhoneRegex.test(phoneNumber.trim())) {
          setLocalError('Invalid Egyptian phone number format (e.g. 01012345678).');
          return;
        }
        
        if (educationLevel === 'HIGH_SCHOOL' && !parentPhoneNumber.trim()) {
          setLocalError('Parent phone number is required for High School students.');
          return;
        }

        if (educationLevel === 'HIGH_SCHOOL' && !egyptPhoneRegex.test(parentPhoneNumber.trim())) {
          setLocalError('Invalid Egyptian parent phone number format.');
          return;
        }

        const { error } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          educationLevel,
          phoneNumber: phoneNumber.trim(),
          parentPhoneNumber: parentPhoneNumber.trim() || undefined,
        });
        if (error) setLocalError(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left visual panel */}
      <div className="lg:w-1/2 min-h-[40vh] lg:min-h-screen relative overflow-hidden flex flex-col justify-between p-8 lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-base-850 via-base-900 to-base-950" />
        <div className="absolute -top-40 -right-32 w-[30rem] h-[30rem] rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-secondary-500/8 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-glow">
            <GraduationCap className="w-6 h-6 text-base-950" />
          </div>
          <span className="text-2xl font-display font-extrabold tracking-tight text-white">E.Camp</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-display font-extrabold leading-tight text-white text-balance">
            Learn sequentially.<br />Progress deliberately.
          </h1>
          <p className="mt-5 text-neutral-300 text-lg leading-relaxed">
            A premium learning platform with curated lectures, AI-powered quizzes, gamified streaks,
            and anti-piracy device binding — all in one place.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Streaks', value: 'Reward' },
              { label: 'Levels', value: 'XP' },
              { label: 'Device Lock', value: 'Secure' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-3">
                <p className="text-xs text-neutral-400">{s.label}</p>
                <p className="text-sm font-semibold text-accent-300">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-neutral-500">© E.Camp Platform</div>
      </div>

      {/* Right form panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => { setMode('login'); setLocalError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setLocalError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Join E.Camp'}
          </h2>
          <p className="text-sm text-neutral-400 mb-6">
            {mode === 'login'
              ? 'Sign in to continue your learning journey.'
              : 'Choose your role and create your account.'}
          </p>

          {errMsg?.includes('Unrecognized Device') ? (
            <div className="mb-5 rounded-xl border border-warning-500/30 bg-warning-500/10 p-5 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-warning-400 mb-2" />
              <h3 className="text-lg font-bold text-white mb-1">Device Not Recognized</h3>
              <p className="text-sm text-neutral-300">{errMsg}</p>
            </div>
          ) : errMsg && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>



                <div>
                  <label className="label">Education Level</label>
                  <select
                    className="input"
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value as 'HIGH_SCHOOL' | 'UNIVERSITY')}
                  >
                    <option value="HIGH_SCHOOL">High School</option>
                    <option value="UNIVERSITY">University</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone Number</label>
                    <input
                      className="input"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      type="tel"
                      autoComplete="tel"
                    />
                  </div>
                  {educationLevel === 'HIGH_SCHOOL' && (
                    <div>
                      <label className="label">Parent Phone</label>
                      <input
                        className="input"
                        value={parentPhoneNumber}
                        onChange={(e) => setParentPhoneNumber(e.target.value)}
                        required
                        type="tel"
                        autoComplete="tel"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-neutral-500 mt-1.5">
                  Min 8 chars, must contain letters and numbers.
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-5 text-xs text-neutral-500 leading-relaxed">
              On first login, your device is bound to your account as an anti-piracy measure.
              You'll only be able to sign in from this device afterward.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
