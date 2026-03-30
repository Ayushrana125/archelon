import React, { useState } from 'react';
import AgentSetup from './AgentSetup';
import FileUpload from './FileUpload';
import ProcessingSteps from './ProcessingSteps';
import { createAgent } from '../services/agent_service';

function CreateAgentView({ setMode, setAgentData, onSave }) {
  const [step, setStep] = useState('setup');
  const [agentName, setAgentName] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const handleContinueToUpload = () => setStep('upload');

  const handleCreateAgent = () => setStep('processing');

  const handleProcessingComplete = () => setStep('ready');

  const handleStartChat = async () => {
    try {
      const agent = await createAgent({
        name:         agentName,
        instructions: systemInstructions,
        description:  '',
      });
      setAgentData(agent);
      onSave(agent);
      setMode('arex');
    } catch (err) {
      setError(err.message);
    }
  };

  if (step === 'setup') {
    return (
      <AgentSetup
        agentName={agentName}
        setAgentName={setAgentName}
        systemInstructions={systemInstructions}
        setSystemInstructions={setSystemInstructions}
        onContinue={handleContinueToUpload}
      />
    );
  }

  if (step === 'upload') {
    return (
      <FileUpload
        files={files}
        setFiles={setFiles}
        onCreateAgent={handleCreateAgent}
        onSkip={handleProcessingComplete}
      />
    );
  }

  if (step === 'processing') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <ProcessingSteps onComplete={handleProcessingComplete} agentName={agentName} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-57px)]">
      <div className="text-center max-w-lg px-6">
        <h2 className="text-3xl font-semibold mb-4">Your agent is ready</h2>
        
        <div className="bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="font-semibold text-xl mb-2">{agentName}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {files.length} document{files.length !== 1 ? 's' : ''} processed
          </div>
        </div>
        
        <button
          onClick={handleStartChat}
          className="px-8 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Start chatting with {agentName}
        </button>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      </div>
    </div>
  );
}

export default CreateAgentView;
