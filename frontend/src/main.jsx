import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import App from './App';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import LoadingScreen from './components/LoadingScreen';
import { AnimatePresence } from 'framer-motion';
import './index.css';

function RootInner() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [theme, setTheme] = React.useState('dark');

  const handleLogin = (userData) => { setUser(userData); setIsLoading(true); };

  const handleDone = () => {
    localStorage.setItem('isLoggedIn', 'true');
    if (user) localStorage.setItem('user', JSON.stringify(user));
    setIsLoading(false);
    setIsLoggedIn(true);
    navigate('/chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage onLogin={handleLogin} onSignup={() => navigate('/signup')} onLoginPage={() => navigate('/login')} theme={theme} setTheme={setTheme} />} />
        <Route path="/signup" element={<SignupPage onLogin={handleLogin} theme={theme} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} theme={theme} />} />
        <Route path="/chat/*" element={isLoggedIn ? <App externalTheme={theme} externalSetTheme={setTheme} onLogout={handleLogout} user={user} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AnimatePresence>
        {isLoading && <LoadingScreen key="loading" onDone={handleDone} />}
      </AnimatePresence>
    </>
  );
}

function Root() {
  return (
    <BrowserRouter>
      <RootInner />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
