import React, { useState, useEffect } from 'react';
import { fetchDocuments, invalidateDocuments, deleteDocument } from '../services/document_service';
import { updateAgent, deleteAgent } from '../services/agent_service';
import { uploadFiles } from '../services/ingest_service';
import FileUpload from './FileUpload';
import ProcessingSteps from './ProcessingSteps';

const TEAL = '#00C9B1';

function EditAgentView({ agentData, onSave, onCancel, onDelete }) {
  const [step, setStep] = useState('edit'); // 'edit' | 'upload' | 'processing'
  const [name, setName] = useState(agentData?.name ?? '');
  const [instructions, setInstructions] = useState(agentData?.instructions ?? '');
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!agentData?.id) return;
    fetchDocuments(agentData.id)
      .then(docs => setDocuments(docs))
      .catch(() => setDocuments([]));
  }, [agentData?.id]);

  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const isDirty =
    name !== (agentData?.name ?? '') ||
    instructions !== (agentData?.instructions ?? '');

  const handleDeleteDoc = async (docId) => {
    if (confirmDeleteDocId !== docId) { setConfirmDeleteDocId(docId); return; }
    setDeletingDocId(docId);
    try {
      await deleteDocument(agentData.id, docId);
      invalidateDocuments(agentData.id);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      setError(err.message);
    }
    setDeletingDocId(null);
    setConfirmDeleteDocId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateAgent(agentData.id, { name, instructions });
      onSave({ ...agentData, ...updated });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    setError('');
    try {
      await deleteAgent(agentData.id);
      onDelete(agentData.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  // Upload files for existing agent
  const handleUpload = async () => {
    setError('');
    try {
      const result = await uploadFiles(agentData.id, files);
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

  // After processing done — refresh documents and show close button
  const handleProcessingComplete = () => {
    invalidateDocuments(agentData.id);
    fetchDocuments(agentData.id)
      .then(docs => setDocuments(docs))
      .catch(() => {});
    setFiles([]);
    setJobs([]);
    setStep('done');
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Upload step
  if (step === 'upload') {
    return (
      <FileUpload
        files={files}
        setFiles={setFiles}
        onCreateAgent={handleUpload}
        onBack={() => { setFiles([]); setStep('edit'); }}
      />
    );
  }

  // Processing step
  if (step === 'processing') {
    return (
      <div className="flex justify-center h-[calc(100vh-57px)] overflow-y-auto">
        <ProcessingSteps jobs={jobs} onComplete={handleProcessingComplete} />
      </div>
    );
  }

  // Done step — show close button
  if (step === 'done') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-57px)]">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${TEAL}20` }}>
            <svg className="w-7 h-7" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Documents processed</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Your documents have been ingested and are ready for retrieval.</p>
          <button
            onClick={() => setStep('edit')}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Back to agent
          </button>
        </div>
      </div>
    );
  }

  // Edit step
  return (
    <div className="flex justify-center pt-16 px-6 pb-16">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold">Edit {agentData?.name}</h1>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Agent name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">System instructions</label>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none"
            />
          </div>

          {/* Documents section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Documents</label>

            {documents.length > 0 && (
              <div className="space-y-2 mb-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="px-3 py-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-400">{formatSize(doc.file_size)} · {doc.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {confirmDeleteDocId === doc.id ? (
                        <>
                          <span className="text-xs text-gray-400">Sure?</span>
                          <button onClick={() => handleDeleteDoc(doc.id)} disabled={deletingDocId === doc.id}
                            className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
                            {deletingDocId === doc.id ? '...' : 'Delete'}
                          </button>
                          <button onClick={() => setConfirmDeleteDocId(null)}
                            className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 transition-colors">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleDeleteDoc(doc.id)}
                          className="text-xs text-red-400 hover:text-red-500 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep('upload')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add documents
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                confirmDelete
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              {deleting ? 'Deleting...' : confirmDelete ? 'Confirm delete' : 'Delete agent'}
            </button>
          </div>
          {confirmDelete && !deleting && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Click "Confirm delete" again to permanently delete this agent and all its data.
              <button onClick={() => setConfirmDelete(false)} className="ml-2 underline">Cancel</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditAgentView;
