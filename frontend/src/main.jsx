import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import './index.css';

function Root() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [theme, setTheme] = React.useState('dark');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage onLogin={() => setIsLoggedIn(true)} theme={theme} />} />
        <Route path="/login" element={<LoginPage onLogin={() => setIsLoggedIn(true)} theme={theme} />} />
        <Route path="/*" element={<App externalLoggedIn={isLoggedIn} externalTheme={theme} externalSetTheme={setTheme} />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
