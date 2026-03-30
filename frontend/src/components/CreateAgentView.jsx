import React, { useState } from 'react';
import AgentSetup from './AgentSetup';
import FileUpload from './FileUpload';
import ProcessingSteps from './ProcessingSteps';
import { createAgent } from '../services/agent_service';
import { uploadFiles } from '../services/ingest_service';

function CreateAgentView({ setMode, setAgentData, onSave }) {
  const [step, setStep] = useState('setup');
  const [agentName, setAgentName] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [files, setFiles] = useState([]);
  const [jobs, setJobs] = useState([]);   // [{ jobId, filename, fileSize, status }]
  const [createdAgent, setCreatedAgent] = useState(null);
  const [error, setError] = useState('');

  // Step 1 — Create agent then go to upload
  const handleContinueToUpload = async () => {
    setError('');
    try {
      const agent = await createAgent({ name: agentName, instructions: systemInstructions, description: '' });
      setCreatedAgent(agent);
      setStep('upload');
    } catch (err) {
      setError(err.message);
    }
  };

  // Skip upload — agent already created above
  const handleSkipUpload = async () => {
    setError('');
    try {
      const agent = await createAgent({ name: agentName, instructions: systemInstructions, description: '' });
      setAgentData(agent);
      onSave(agent);
      setMode('arex');
    } catch (err) {
      setError(err.message);
    }
  };

  // Upload files → get job IDs → go to processing
  const handleCreateAgent = async () => {
    setError('');
    try {
      const result = await uploadFiles(createdAgent.id, files);
      // result.files = [{ job_id, filename, file_size, ... }]
      const jobList = result.files.map(f => ({
        jobId:    f.job_id,
        filename: f.filename,
        fileSize: files.find(fl => fl.name === f.filename)?.size ?? 0,
        status:   'parsing',
      }));
      setJobs(jobList);
      setStep('processing');
    } catch (err) {
      setError(err.message);
    }
  };

  // Processing complete — go to chat
  const handleProcessingComplete = () => {
    setAgentData(createdAgent);
    onSave(createdAgent);
    setMode('arex');
  };

  if (step === 'setup') {
    return (
      <>
        <AgentSetup
          agentName={agentName}
          setAgentName={setAgentName}
          systemInstructions={systemInstructions}
          setSystemInstructions={setSystemInstructions}
          onContinue={handleContinueToUpload}
          onBack={() => setMode('arex')}
          onSkip={handleSkipUpload}
        />
        {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
      </>
    );
  }

  if (step === 'upload') {
    return (
      <>
        <FileUpload
          files={files}
          setFiles={setFiles}
          onCreateAgent={handleCreateAgent}
          onBack={() => setStep('setup')}
        />
        {error && <p className="text-sm text-red-400 text-center mt-2">{error}</p>}
      </>
    );
  }

  if (step === 'processing') {
    return (
      <div className="flex justify-center h-[calc(100vh-57px)] overflow-y-auto">
        <ProcessingSteps jobs={jobs} onComplete={handleProcessingComplete} />
      </div>
    );
  }

  return null;
}

export default CreateAgentView;
