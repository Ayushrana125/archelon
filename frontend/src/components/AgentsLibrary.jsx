import React, { useState, useRef } from 'react';
import ProcessingSteps from './ProcessingSteps';

function AgentsLibrary({ agents, setAgentData, setMode }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [editedFiles, setEditedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setEditedFiles([...agent.files]);
  };

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    setEditedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setEditedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveUpdates = () => {
    setIsProcessing(true);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setSelectedAgent(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-73px)]">
        <ProcessingSteps onComplete={handleProcessingComplete} agentName={selectedAgent.name} />
      </div>
    );
  }

  if (selectedAgent) {
    return (
      <div className="min-h-[calc(100vh-73px)] p-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setSelectedAgent(null)}
            className="mb-6 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back to Library
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold mb-2">{selectedAgent.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your agent's documents</p>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Documents ({editedFiles.length})</h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm px-4 py-2 bg-white dark:bg-[#212121] border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  + Add Files
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleAddFiles}
                className="hidden"
              />

              <div className="space-y-3">
                {editedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveUpdates}
              disabled={editedFiles.length === 0}
              className="w-full px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save Updates
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-73px)]">
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-semibold mb-3">No agents yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Create your first AI agent to get started
          </p>
          <button
            onClick={() => setMode('create')}
            className="px-8 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Create Your First Agent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Your AI Agents</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} ready to assist you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-[#2a2a2a] rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-900 dark:hover:border-gray-400 transition-colors cursor-pointer"
            >
              <div onClick={() => handleAgentClick(agent)}>
                <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
                
                {agent.instructions && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {agent.instructions}
                  </p>
                )}
                
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {agent.files?.length || 0} documents
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAgentData(agent);
                  setMode('arex');
                }}
                className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Start Chat
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AgentsLibrary;
