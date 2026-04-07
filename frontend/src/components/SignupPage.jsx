import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../services/auth_service';

const TEAL = '#00C9B1';
const BLUE = '#1A73E8';

const TAKEN_USERNAMES = ['admin', 'archelon', 'ayush', 'test', 'user'];

const checks = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'Uppercase letter', test: p => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: p => /[a-z]/.test(p) },
  { label: 'Number', test: p => /[0-9]/.test(p) },
  { label: 'Special character (!@#$...)', test: p => /[^A-Za-z0-9]/.test(p) },
];

const InputField = ({ label, icon, error, ...props }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {error && <span className="text-xs text-red-400">This field is required</span>}
    </div>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
      <input {...props} className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 transition-colors ${
        error ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30' : 'border-gray-200 dark:border-gray-700 focus:ring-[#00C9B1]/40'
      }`} />
    </div>
  </div>
);

function SignupPage({ onLogin, theme }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameTaken = username.length > 2 && TAKEN_USERNAMES.includes(username.toLowerCase());
  const usernameAvailable = username.length > 2 && !usernameTaken;
  const passwordChecks = checks.map(c => ({ ...c, passed: c.test(password) }));
  const allChecksPassed = passwordChecks.every(c => c.passed);

  const isBlank = (val) => submitted && !val.trim();

  const fieldClass = (val) =>
    `w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 transition-colors ${
      isBlank(val) ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30' : 'border-gray-200 dark:border-gray-700 focus:ring-[#00C9B1]/40'
    }`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!firstName || !lastName || !username || !email || !password || usernameTaken || !allChecksPassed) return;
    setLoading(true);
    setError('');
    try {
      const userData = await signup({ firstName, lastName, username, email, password, companyName, website });
      setSuccess(true);
      setTimeout(() => { onLogin(userData); }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${theme} min-h-screen flex bg-white dark:bg-[#0d0d0d] items-start`}>

      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-start w-[42%] p-14 relative overflow-hidden flex-shrink-0 self-stretch sticky top-0 h-screen"
        style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
            <defs>
              <pattern id="hex-signup" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={TEAL} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex-signup)" />
          </svg>
        </div>
        <div className="absolute pointer-events-none" style={{
          top: '25%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 400,
          background: `radial-gradient(ellipse, ${TEAL}15 0%, transparent 70%)`,
          filter: 'blur(50px)',
        }} />

        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 mb-16 group">
            <img src="/Archelon_logo.png" alt="Archelon" className="h-8 w-auto object-contain" />
            <span className="brand-name text-xl tracking-tight text-white">Archelon</span>
          </button>
          <h2 className="landing-heading text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
            Build AI agents that<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}>
              know your documents
            </span>
          </h2>
          <p className="landing-body text-lg text-gray-400 leading-relaxed max-w-sm">
            Create intelligent agents grounded in your own knowledge base, powered by a multi-step agentic RAG pipeline.
          </p>
        </div>

        <div className="relative space-y-5 mt-10">
          {[
            { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'Upload any document — PDF, DOCX, TXT' },
            { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'Create purpose-built AI agents' },
            { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: 'Agentic RAG pipeline for precise answers' },
            { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'Fully isolated agent knowledge bases' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
                <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                </svg>
              </div>
              <span className="text-sm text-gray-400">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#0d0d0d]">
        <div className="flex items-center justify-between px-8 py-6 lg:hidden">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <img src="/Archelon_logo.png" alt="Archelon" className="h-7 w-auto object-contain" />
            <span className="brand-name text-lg tracking-tight text-gray-900 dark:text-gray-100">Archelon</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-10 max-w-2xl mx-auto w-full">
          <h3 className="landing-heading text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Create your account</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-[#00C9B1] hover:underline font-medium">Log in</button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField label="First name" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                required error={isBlank(firstName)} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
              <InputField label="Last name" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                required error={isBlank(lastName)} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
            </div>
            {/* Username with availability */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                {isBlank(username) && <span className="text-xs text-red-400">This field is required</span>}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  placeholder="johndoe"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 transition-colors ${
                    usernameTaken
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30'
                      : usernameAvailable
                      ? 'border-[#00C9B1] focus:ring-[#00C9B1]/40'
                      : isBlank(username)
                      ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-[#00C9B1]/40'
                  }`}
                />
                {username.length > 2 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameTaken ? (
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
              {username.length > 2 && (
                <p className={`text-xs mt-1.5 ${ usernameTaken ? 'text-red-400' : 'text-[#00C9B1]' }`}>
                  {usernameTaken ? 'Username is already taken' : 'Username is available'}
                </p>
              )}
            </div>
            <InputField label="Email address" icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              required error={isBlank(email)} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            {/* Password with live strength checker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                {isBlank(password) && <span className="text-xs text-red-400">This field is required</span>}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Min. 8 characters"
                  className={`w-full pl-9 pr-16 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 transition-colors ${
                    isBlank(password) ? 'border-red-400 dark:border-red-500 focus:ring-red-400/30' : 'border-gray-200 dark:border-gray-700 focus:ring-[#00C9B1]/40'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {allChecksPassed && (
                    <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
              {(passwordFocused || password.length > 0) && (
                <div className="mt-3 space-y-1.5">
                  {passwordChecks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        c.passed ? 'bg-[#00C9B1]' : 'bg-gray-200 dark:bg-gray-700'
                      }`}>
                        {c.passed && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-xs transition-colors ${ c.passed ? 'text-[#00C9B1]' : 'text-gray-400 dark:text-gray-500' }`}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InputField label="Company name" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc. (optional)" />
              <InputField label="Website" icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
                value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com (optional)" />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            {success ? (
              <div className="w-full py-3 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2" style={{ background: `${TEAL}20`, color: TEAL }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Account created! Taking you in...
              </div>
            ) : (
              <button type="submit" disabled={loading} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
                className="w-full py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
