import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import LoadingScreen from './components/LoadingScreen';
import { AnimatePresence } from 'framer-motion';
import './index.css';

function RootInner() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [theme, setTheme] = React.useState('dark');

  const handleLogin = () => setIsLoading(true);

  const handleDone = () => {
    setIsLoading(false);
    setIsLoggedIn(true);
    navigate('/');
  };

  return (
    <>
      <Routes>
        <Route path="/signup" element={<SignupPage onLogin={handleLogin} theme={theme} />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} theme={theme} />} />
        <Route path="/*" element={<App externalLoggedIn={isLoggedIn} externalTheme={theme} externalSetTheme={setTheme} />} />
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
