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
import { clearCache, fetchAgents } from './services/agent_service';
import { clearDocumentCache, fetchDocuments, fetchDocumentHistory } from './services/document_service';

function RootInner() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; }
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [theme, setTheme] = React.useState('dark');

  const handleLogin = (userData) => {
    clearCache();
    clearDocumentCache();
    setUser(userData.user || userData);
    setIsLoading(true);
  };

  const handleDone = async () => {
    localStorage.setItem('isLoggedIn', 'true');
    if (user) localStorage.setItem('user', JSON.stringify(user));

    // Pre-warm cache during loading screen
    try {
      const agents = await fetchAgents();
      // Fetch docs for all agents in parallel
      const docFetches = agents.map(a => fetchDocuments(a.id));
      const allDocs = await Promise.all(docFetches);
      // Fetch history for all documents in parallel
      const historyFetches = [];
      agents.forEach((agent, i) => {
        (allDocs[i] || []).forEach(doc => {
          historyFetches.push(fetchDocumentHistory(agent.id, doc.id));
        });
      });
      await Promise.all(historyFetches);
    } catch {}

    setIsLoading(false);
    setIsLoggedIn(true);
    navigate('/chat');
  };

  const handleLogout = () => {
    clearCache();
    clearDocumentCache();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<div className={theme}><LandingPage onLogin={handleLogin} onSignup={() => navigate('/signup')} onLoginPage={() => navigate('/login')} theme={theme} setTheme={setTheme} /></div>} />
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
