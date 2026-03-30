import React, { useState, useEffect } from 'react';
import { fetchDocuments } from '../services/document_service';

function DocsPanel({ agentData, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!agentData?.id) return;
    fetchDocuments(agentData.id)
      .then(docs => setDocuments(docs))
      .catch(() => setDocuments([]));
  }, [agentData?.id]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={handleClose} />
      <div
        className="fixed top-[57px] right-0 bottom-0 w-72 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col shadow-xl"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="font-semibold text-sm">Documents</div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {documents.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">No documents added yet.</p>
          )}
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2a] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{doc.filename}</p>
                  <p className="text-xs text-gray-400">{formatSize(doc.file_size)} · {doc.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default DocsPanel;
