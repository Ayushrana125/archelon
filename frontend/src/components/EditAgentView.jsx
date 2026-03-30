import React, { useState, useRef, useEffect } from 'react';
import { fetchDocuments } from '../services/document_service';

function EditAgentView({ agentData, onSave, onCancel }) {
  const [name, setName] = useState(agentData?.name ?? '');
  const [instructions, setInstructions] = useState(agentData?.instructions ?? '');
  const [documents, setDocuments] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!agentData?.id) return;
    fetchDocuments(agentData.id)
      .then(docs => setDocuments(docs))
      .catch(() => setDocuments([]));
  }, [agentData?.id]);

  const isDirty =
    name !== (agentData?.name ?? '') ||
    instructions !== (agentData?.instructions ?? '') ||
    newFiles.length > 0;

  const handleFileAdd = (e) => {
    const selected = Array.from(e.target.files);
    setNewFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  };

  const handleSave = () => {
    onSave({ ...agentData, name, instructions });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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

            {/* Documents from DB */}
            {documents.length > 0 && (
              <div className="space-y-2 mb-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{doc.filename}</p>
                      <p className="text-xs text-gray-400">{doc.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New files pending save */}
            {newFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {newFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(file.size)} · new</p>
                    </div>
                    <button
                      onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="ml-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add files */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add documents
            </button>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt" onChange={handleFileAdd} className="hidden" />
          </div>

          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditAgentView;
