import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import CreateAgentView from './components/CreateAgentView';
import SettingsView from './components/SettingsView';
import AgentsLibrary from './components/AgentsLibrary';
import EditAgentView from './components/EditAgentView';
import DocsPanel from './components/DocsPanel';
import LandingPage from './components/LandingPage';

function App({ externalLoggedIn, externalTheme, externalSetTheme }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(externalLoggedIn || false);

  useEffect(() => {
    if (externalLoggedIn) setIsLoggedIn(true);
  }, [externalLoggedIn]);
  const [mode, setMode] = useState('arex');
  const [theme, setTheme] = useState(externalTheme || 'dark');
  const [agentData, setAgentData] = useState(null);
  const [savedAgents, setSavedAgents] = useState(() => {
    const saved = localStorage.getItem('arex_agents');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDocsPanel, setShowDocsPanel] = useState(false);
  const [chatHistories, setChatHistories] = useState({
    arex: [{ role: 'assistant', content: "Hi, I'm Arex. Ask me about my experience, projects, or request my resume.", id: 0 }]
  });

  const currentChatKey = activeAgentId ?? 'arex';
  const currentMessages = chatHistories[currentChatKey] ?? [{ role: 'assistant', content: `Hi, I'm ${agentData?.name ?? 'Arex'}. How can I help you?`, id: 0 }];

  const setCurrentMessages = (updater) => {
    setChatHistories(prev => ({
      ...prev,
      [currentChatKey]: typeof updater === 'function' ? updater(prev[currentChatKey] ?? []) : updater
    }));
  };

  useEffect(() => {
    const name = agentData ? agentData.name : null;
    document.title = name ? `${name} - Archelon` : 'Archelon - Agentic RAG Platform';
  }, [agentData]);

  useEffect(() => {
    localStorage.setItem('arex_agents', JSON.stringify(savedAgents));
  }, [savedAgents]);

  const handleSaveAgent = (agent) => {
    setSavedAgents(prev => [...prev, { ...agent, id: Date.now() }]);
  };

  const handleSelectAgent = (agent) => {
    setAgentData(agent);
    setActiveAgentId(agent.id);
    setMode('arex');
    setShowDocsPanel(false);
  };

  const handleSelectArex = () => {
    setAgentData(null);
    setActiveAgentId(null);
    setMode('arex');
    setShowDocsPanel(false);
  };

  const handleAddFileToAgent = (file) => {
    if (!activeAgentId) return;
    setSavedAgents(prev => prev.map(a =>
      a.id === activeAgentId
        ? { ...a, files: [...(a.files || []), { name: file.name, size: file.size }] }
        : a
    ));
    setAgentData(prev => prev ? { ...prev, files: [...(prev.files || []), { name: file.name, size: file.size }] } : prev);
  };

  const handleDeleteFile = (idx) => {
    setSavedAgents(prev => prev.map(a =>
      a.id === activeAgentId
        ? { ...a, files: a.files.filter((_, i) => i !== idx) }
        : a
    ));
    setAgentData(prev => prev ? { ...prev, files: prev.files.filter((_, i) => i !== idx) } : prev);
  };

  if (!isLoggedIn) return (
    <div className={theme}>
      <LandingPage onLogin={() => setIsLoading(true)} onSignup={() => navigate('/signup')} onLoginPage={() => navigate('/login')} theme={theme} setTheme={setTheme} />
    </div>
  );

  return (
    <div className={theme}>
      <div className="min-h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-gray-100">
        <TopNav
          agentName={['arex', 'edit'].includes(mode) ? (agentData ? agentData.name : 'Arex') : null}
          agentData={agentData}
          collapsed={sidebarCollapsed}
          onDocsClick={() => setShowDocsPanel(p => !p)}
          onEditAgent={() => setMode('edit')}
        />
        <div className="flex">
          <div className={`${sidebarCollapsed ? 'w-14' : 'w-64'} flex-shrink-0 transition-all duration-300`} />
          <Sidebar
            mode={mode}
            setMode={setMode}
            savedAgents={savedAgents}
            activeAgentId={activeAgentId}
            onSelectAgent={handleSelectAgent}
            onSelectArex={handleSelectArex}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
          <main className="flex-1 pt-[57px]">
            {mode === 'arex' && <ChatView key={agentData?.id ?? 'arex'} agentData={agentData} onAddFile={handleAddFileToAgent} messages={currentMessages} setMessages={setCurrentMessages} />}
            {mode === 'create' && <CreateAgentView setMode={setMode} setAgentData={setAgentData} onSave={handleSaveAgent} />}
            {mode === 'edit' && <EditAgentView agentData={agentData} onSave={(updated) => { setSavedAgents(prev => prev.map(a => a.id === updated.id ? updated : a)); setAgentData(updated); setMode('arex'); }} onCancel={() => setMode('arex')} />}
            {mode === 'library' && <AgentsLibrary agents={savedAgents} setAgentData={setAgentData} setMode={setMode} />}
            {mode === 'settings' && <SettingsView theme={theme} setTheme={setTheme} />}
          </main>
          {showDocsPanel && agentData?.files && (
            <DocsPanel
              files={agentData.files}
              onDelete={handleDeleteFile}
              onClose={() => setShowDocsPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
