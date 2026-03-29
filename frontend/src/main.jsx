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
  const [isLoading, setIsLoading] = React.useState(false);
  const [theme, setTheme] = React.useState('dark');

  const handleLogin = () => setIsLoading(true);

  const handleDone = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoading(false);
    setIsLoggedIn(true);
    navigate('/chat');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage onLogin={handleLogin} onSignup={() => navigate('/signup')} onLoginPage={() => navigate('/login')} theme={theme} setTheme={setTheme} />} />
        <Route path="/signup" element={<SignupPage onLogin={handleLogin} theme={theme} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} theme={theme} />} />
        <Route path="/chat/*" element={isLoggedIn ? <App externalTheme={theme} externalSetTheme={setTheme} /> : <Navigate to="/login" replace />} />
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
