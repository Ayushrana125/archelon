import React, { useState, useEffect } from 'react';
import { fetchDocumentHistory } from '../services/document_service';

const TEAL = '#00C9B1';
const STEP_ORDER = ['parsing', 'chunking', 'saving', 'done'];
const STEP_LABELS = {
  parsing:  'Parsing document',
  chunking: 'Creating chunks',
  saving:   'Saving to database',
  done:     'Complete',
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function DocHistory({ agentId, doc }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentHistory(agentId, doc.id)
      .then(data => setJob(data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [doc.id]);

  const meta = job?.metadata ?? {};
  const currentStep = job?.status ?? '';
  const stepIndex = (s) => STEP_ORDER.indexOf(s);

  const subText = (step) => {
    if (step === 'parsing')  return meta.elements ? `${meta.elements} elements extracted` : '';
    if (step === 'chunking') return meta.parent_chunks ? `${meta.parent_chunks} parent · ${meta.child_chunks} child · avg ${meta.avg_tokens} tokens` : '';
    if (step === 'saving')   return meta.parent_chunks ? `${meta.parent_chunks + meta.child_chunks} records written` : '';
    if (step === 'done')     return meta.duration_ms ? `${(meta.duration_ms / 1000).toFixed(1)}s · ${meta.child_chunks} chunks · ${meta.total_tokens} tokens` : '';
    return '';
  };

  return (
    <div className="mb-5">
      {/* Doc header */}
      <div className="flex items-center gap-2 mb-2.5">
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{doc.filename}</p>
        <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(doc.file_size)}</span>
      </div>

      {loading && <p className="text-xs text-gray-400 pl-5">Loading...</p>}

      {!loading && !job && <p className="text-xs text-gray-400 pl-5">No history found.</p>}

      {!loading && job && (
        <div className="pl-5 space-y-2">
          {STEP_ORDER.map((step, i) => {
            const isDone   = currentStep === 'done' || stepIndex(currentStep) > i;
            const isActive = stepIndex(currentStep) === i && currentStep !== 'done';
            const isPending = !isDone && !isActive;

            return (
              <div key={step} className="flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  {isDone ? (
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: TEAL }}>
                      <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: TEAL }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: TEAL }} />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${isPending ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'}`}>
                    {STEP_LABELS[step]}
                  </p>
                  {(isDone || isActive) && subText(step) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{subText(step)}</p>
                  )}
                </div>
              </div>
            );
          })}
          {job.status === 'error' && (
            <p className="text-xs text-red-400">{job.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function DocsPanel({ agentData, documents = [], onClose }) {
  const [visible, setVisible] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={handleClose} />
      <div
        className={`fixed top-[57px] right-0 bottom-0 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col shadow-xl transition-all duration-300 ${showHistory ? 'w-96' : 'w-80'}`}
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease, width 0.25s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="font-semibold text-sm">Documents</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(p => !p)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                showHistory
                  ? 'text-white'
                  : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333]'
              }`}
              style={showHistory ? { background: `linear-gradient(135deg, ${TEAL}, #1A73E8)` } : {}}
            >
              {showHistory ? 'Hide history' : 'View ingest history'}
            </button>
            <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!showHistory ? (
            /* Documents list */
            <div className="px-4 py-3 space-y-2">
              {documents.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">No documents added yet.</p>
              )}
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2a2a] px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate text-gray-900 dark:text-gray-100">{doc.filename}</p>
                      <p className="text-xs text-gray-400">{formatSize(doc.file_size)} · {doc.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Ingest history for all docs */
            <div className="px-4 py-4">
              {documents.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">No documents to show history for.</p>
              )}
              {documents.map((doc, idx) => (
                <div key={doc.id}>
                  <DocHistory agentId={agentData.id} doc={doc} />
                  {idx < documents.length - 1 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 mb-5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DocsPanel;
