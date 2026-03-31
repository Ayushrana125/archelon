import React, { useRef, useState } from 'react';

const ALLOWED_EXTS = ['.pdf', '.docx', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

function validateFiles(incoming, existing = []) {
  const valid = incoming.filter(f => ALLOWED_EXTS.includes('.' + f.name.split('.').pop().toLowerCase()) && f.size <= MAX_FILE_SIZE);
  const hasInvalid = valid.length < incoming.length;
  const combined = [...existing, ...valid];
  const capped = combined.slice(0, MAX_FILES);
  const tooMany = combined.length > MAX_FILES;
  const tooBig = capped.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_SIZE;
  const newValid = capped.slice(existing.length);
  let error = '';
  if (hasInvalid) error = 'Some files were skipped. Only PDF, DOCX, and TXT files are supported.';
  if (tooMany) error = `Only ${MAX_FILES} files allowed. Extra files were skipped.`;
  if (tooBig) error = 'Total size exceeds 10MB. Some files were skipped.';
  return { valid: newValid, error };
}

function FileUpload({ files, setFiles, onCreateAgent, onBack }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleCreate = async () => { setLoading(true); await onCreateAgent(); setLoading(false); };

  const handleFileSelect = (e) => {
    const { valid, error } = validateFiles(Array.from(e.target.files), files);
    setErrors(error ? [error] : []);
    if (valid.length) setFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-semibold">Upload Your Documents</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Add documents to train your AI agent</p>
        </div>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-gray-900 dark:hover:border-gray-400 transition-colors"
      >
        <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Supports PDF, DOCX, TXT files</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {errors.length > 0 && (
        <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errors[0]}
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Selected Documents ({files.length})</h3>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Clear all
            </button>
          </div>
          
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="ml-4 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={files.length === 0 || loading}
        className="w-full mt-6 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : `Create Agent with ${files.length} Document${files.length !== 1 ? 's' : ''}`}
      </button>

    </div>
  );
}

export default FileUpload;
