import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth_service';

const TEAL = '#00C9B1';
const BLUE = '#1A73E8';

const InputField = ({ label, icon, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
      <input {...props} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40 placeholder-gray-400 dark:placeholder-gray-600" />
    </div>
  </div>
);

function LoginPage({ onLogin, theme }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const isEmail = identifier.includes('@');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userData = await login(identifier, password);
      onLogin(userData);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className={`${theme} min-h-screen flex bg-white dark:bg-[#0d0d0d]`}>

      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-start w-[42%] p-14 relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <svg width="100%" height="100%" style={{ opacity: 0.04 }}>
            <defs>
              <pattern id="hex-login" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
                <polygon points="28,2 52,14 52,38 28,50 4,38 4,14" fill="none" stroke={TEAL} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hex-login)" />
          </svg>
        </div>
        <div className="absolute pointer-events-none" style={{
          top: '25%', left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 400,
          background: `radial-gradient(ellipse, ${TEAL}15 0%, transparent 70%)`,
          filter: 'blur(50px)',
        }} />

        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 mb-16">
            <img src="/Archelon_logo.png" alt="Archelon" className="h-8 w-auto object-contain" />
            <span className="brand-name text-xl tracking-tight text-white">Archelon</span>
          </button>
          <h2 className="landing-heading text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
            Welcome back to<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}>
              Archelon
            </span>
          </h2>
          <p className="landing-body text-lg text-gray-400 leading-relaxed max-w-sm">
            Log in to access your agents, documents, and knowledge bases.
          </p>
        </div>

        <div className="relative mt-10 space-y-5">
          {[
            { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', text: 'All your documents, always available' },
            { icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'Your agents, ready to answer' },
            { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'Secure and isolated knowledge bases' },
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

        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-10 max-w-md mx-auto w-full">
          <h3 className="landing-heading text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Welcome back</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-[#00C9B1] hover:underline font-medium">Create one</button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email or username</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d={isEmail
                        ? 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                        : 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z'} />
                  </svg>
                </div>
                <input
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="you@example.com or johndoe"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40 placeholder-gray-400 dark:placeholder-gray-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
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
                  placeholder="Your password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40 placeholder-gray-400 dark:placeholder-gray-600"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button type="submit" disabled={loading} style={{ background: `linear-gradient(135deg, ${TEAL}, ${BLUE})` }}
              className="w-full py-3 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
