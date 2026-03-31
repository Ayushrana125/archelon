import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import CreateAgentView from './components/CreateAgentView';
import SettingsView from './components/SettingsView';
import AgentsLibrary from './components/AgentsLibrary';
import EditAgentView from './components/EditAgentView';
import DocsPanel from './components/DocsPanel';
import HomePage from './components/HomePage';
import DashboardView from './components/DashboardView';
import { fetchAgents } from './services/agent_service';
import { fetchDocuments, invalidateDocuments, getCachedDocuments } from './services/document_service';

function App({ externalTheme, externalSetTheme, onLogout, user }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('arex');
  const [theme, setTheme] = useState(externalTheme || 'dark');
  const [agentData, setAgentData] = useState(null);
  const [savedAgents, setSavedAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [agentDocuments, setAgentDocuments] = useState([]);

  useEffect(() => {
    fetchAgents()
      .then(agents => setSavedAgents(agents))
      .catch(() => setSavedAgents([]));
  }, []);

  useEffect(() => {
    if (!agentData?.id) { setAgentDocuments([]); return; }
    const cached = getCachedDocuments(agentData.id);
    if (cached) setAgentDocuments(cached);
    fetchDocuments(agentData.id)
      .then(docs => setAgentDocuments(docs))
      .catch(() => {});
  }, [agentData?.id]);

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

  const handleSaveAgent = async (agent) => {
    try {
      const agents = await fetchAgents(true);
      setSavedAgents(agents);
    } catch {
      setSavedAgents(prev => {
        if (prev.find(a => a.id === agent.id)) return prev;
        return [...prev, agent];
      });
    }
    setActiveAgentId(agent.id);
  };

  const handleSelectAgent = (agent) => {
    setAgentData(agent);
    setActiveAgentId(agent.id);
    setAgentDocuments(getCachedDocuments(agent.id) || []);
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

  return (
    <div className={theme}>
      <div className="min-h-screen bg-white dark:bg-[#212121] text-gray-900 dark:text-gray-100">
        <TopNav
          agentName={mode === 'settings' ? '' : mode === 'dashboard' ? '' : agentData ? agentData.name : 'Home'}
          agentData={agentData}
          documents={agentDocuments}
          collapsed={sidebarCollapsed}
          onDocsClick={() => setShowDocsPanel(p => !p)}
          onEditAgent={() => setMode('edit')}
          user={user}
          onDashboard={() => setMode('dashboard')}
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
            onLogout={onLogout}
            user={user}
            onHome={() => { setAgentData(null); setActiveAgentId(null); setMode('arex'); }}
          />
          <main className="flex-1 pt-[57px]">
            {mode === 'arex' && !agentData && <HomePage onNewAgent={() => setMode('create')} savedAgents={savedAgents} onSelectAgent={handleSelectAgent} />}
            {mode === 'arex' && agentData && <ChatView key={agentData?.id ?? 'arex'} agentData={agentData} onAddFile={handleAddFileToAgent} messages={currentMessages} setMessages={setCurrentMessages} onDocumentsUpdated={() => { invalidateDocuments(agentData.id); fetchDocuments(agentData.id, true).then(docs => setAgentDocuments(docs)).catch(() => {}); }} />}
            {mode === 'create' && <CreateAgentView setMode={setMode} setAgentData={setAgentData} onSave={handleSaveAgent} />}
            {mode === 'edit' && <EditAgentView
              agentData={agentData}
              onSave={(updated) => {
                setSavedAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
                setAgentData(updated);
                setMode('arex');
              }}
              onCancel={() => setMode('arex')}
              onDelete={(id) => {
                setSavedAgents(prev => prev.filter(a => a.id !== id));
                setAgentData(null);
                setActiveAgentId(null);
                setAgentDocuments([]);
                setMode('arex');
              }}
              onDocumentDeleted={() => {
                fetchDocuments(agentData.id, true)
                  .then(docs => setAgentDocuments(docs))
                  .catch(() => {});
              }}
            />}
            {mode === 'library' && <AgentsLibrary agents={savedAgents} setAgentData={setAgentData} setMode={setMode} />}
            {mode === 'settings' && <SettingsView theme={theme} setTheme={setTheme} onLogout={onLogout} />}
            {mode === 'dashboard' && <DashboardView />}
          </main>
          {showDocsPanel && agentData && (
            <DocsPanel
              agentData={agentData}
              documents={agentDocuments}
              onClose={() => setShowDocsPanel(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
