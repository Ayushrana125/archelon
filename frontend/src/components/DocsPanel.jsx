import React, { useState, useEffect } from 'react';
import { fetchDocuments, deleteDocument, fetchDocumentHistory, invalidateDocuments } from '../services/document_service';

const TEAL = '#00C9B1';

const STEP_LABELS = {
  parsing:  'Parsing document',
  chunking: 'Creating chunks',
  saving:   'Saving to database',
  done:     'Complete',
  error:    'Error',
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function HistoryModal({ agentId, doc, onClose }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentHistory(agentId, doc.id)
      .then(data => setJob(data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [doc.id]);

  const meta = job?.metadata ?? {};
  const STEP_ORDER = ['parsing', 'chunking', 'saving', 'done'];
  const currentStep = job?.status ?? '';
  const stepIndex = (s) => STEP_ORDER.indexOf(s);

  const subText = (step) => {
    if (step === 'parsing')  return meta.elements ? `${meta.elements} elements extracted` : '';
    if (step === 'chunking') return meta.parent_chunks ? `${meta.parent_chunks} parent · ${meta.child_chunks} child · avg ${meta.avg_tokens} tokens` : '';
    if (step === 'saving')   return meta.parent_chunks ? `${meta.parent_chunks + meta.child_chunks} records written` : '';
    if (step === 'done')     return meta.duration_ms ? `Completed in ${(meta.duration_ms / 1000).toFixed(1)}s · ${meta.child_chunks} chunks stored · ${meta.total_tokens} total tokens` : '';
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ingestion History</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{doc.filename}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400 text-center py-6">Loading...</p>}

        {!loading && !job && <p className="text-sm text-gray-400 text-center py-6">No ingestion history found.</p>}

        {!loading && job && (
          <div className="space-y-3">
            {/* File info */}
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg px-3 py-2">
              <span>{formatSize(meta.file_size)}</span>
              <span>{meta.filetype}</span>
              {meta.elements && <span>{meta.elements} elements</span>}
            </div>

            {/* Steps */}
            <div className="space-y-2.5">
              {STEP_ORDER.map((step, i) => {
                const isDone    = currentStep === 'done' || stepIndex(currentStep) > i;
                const isActive  = stepIndex(currentStep) === i && currentStep !== 'done';
                const isPending = !isDone && !isActive;

                return (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isDone ? (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: TEAL }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : isActive ? (
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: TEAL }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: TEAL }} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isPending ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'}`}>
                        {STEP_LABELS[step]}
                      </p>
                      {(isDone || isActive) && subText(step) && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subText(step)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {job.status === 'error' && (
              <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{job.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocsPanel({ agentData, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [visible, setVisible] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [historyDoc, setHistoryDoc] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!agentData?.id) return;
    fetchDocuments(agentData.id, true)
      .then(docs => setDocuments(docs))
      .catch(() => setDocuments([]));
  }, [agentData?.id]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleDelete = async (docId) => {
    if (confirmDeleteId !== docId) {
      setConfirmDeleteId(docId);
      return;
    }
    setDeleting(docId);
    try {
      await deleteDocument(agentData.id, docId);
      invalidateDocuments(agentData.id);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch {}
    setDeleting(null);
    setConfirmDeleteId(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={handleClose} />
      <div
        className="fixed top-[57px] right-0 bottom-0 w-80 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col shadow-xl"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="font-semibold text-sm">Documents</div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
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

              {/* Actions */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setHistoryDoc(doc)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ingest history
                </button>
                <div className="flex-1" />
                {confirmDeleteId === doc.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Sure?</span>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                      className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      {deleting === doc.id ? '...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs text-red-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {historyDoc && (
        <HistoryModal
          agentId={agentData.id}
          doc={historyDoc}
          onClose={() => setHistoryDoc(null)}
        />
      )}
    </>
  );
}

export default DocsPanel;
