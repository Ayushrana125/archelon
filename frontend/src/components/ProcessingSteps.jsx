import React, { useState, useEffect, useRef } from 'react';
import { getJobStatus } from '../services/ingest_service';

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

function FileProgress({ jobId, filename, fileSize }) {
  const [job, setJob] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getJobStatus(jobId);
        setJob(data);
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(intervalRef.current);
        }
      } catch {
        clearInterval(intervalRef.current);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 1000);
    return () => clearInterval(intervalRef.current);
  }, [jobId]);

  const currentStep = job?.status ?? 'parsing';
  const meta        = job?.metadata ?? {};
  const isDone      = currentStep === 'done';
  const isError     = currentStep === 'error';

  const stepIndex = (step) => STEP_ORDER.indexOf(step);
  const currentIdx = stepIndex(currentStep);

  const subText = (step) => {
    if (step === 'parsing')  return meta.elements ? `${meta.elements} elements extracted` : 'Reading file structure...';
    if (step === 'chunking') return meta.parent_chunks ? `${meta.parent_chunks} parent · ${meta.child_chunks} child · avg ${meta.avg_tokens} tokens` : 'Splitting into chunks...';
    if (step === 'saving')   return meta.parent_chunks ? `${meta.parent_chunks + meta.child_chunks} records` : 'Writing to database...';
    if (step === 'done')     return meta.duration_ms ? `Done in ${(meta.duration_ms / 1000).toFixed(1)}s · ${meta.child_chunks} chunks stored` : 'Complete';
    return '';
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e] p-4">
      {/* File header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
          <svg className="w-4 h-4" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{filename}</p>
          <p className="text-xs text-gray-400">{formatSize(fileSize)} · {meta.filetype ?? '...'}</p>
        </div>
        {isDone && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: TEAL }}>
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {isError && (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {STEP_ORDER.map((step, i) => {
          const done    = isDone || stepIndex(currentStep) > i;
          const active  = !isDone && stepIndex(currentStep) === i;
          const pending = !done && !active;

          return (
            <div key={step} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {done ? (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: TEAL }}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : active ? (
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: TEAL }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: TEAL }} />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-gray-900 dark:text-gray-100' : active ? '' : 'text-gray-400 dark:text-gray-600'}`}
                  style={active ? { color: TEAL } : {}}>
                  {STEP_LABELS[step]}
                </p>
                {(done || active) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subText(step)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isError && (
        <p className="text-xs text-red-400 mt-3">{job?.error ?? 'Something went wrong'}</p>
      )}
    </div>
  );
}

function ProcessingSteps({ jobs, onComplete }) {
  const allDone = jobs.every(j => j.status === 'done' || j.status === 'error');

  useEffect(() => {
    if (allDone && jobs.length > 0) {
      setTimeout(() => onComplete?.(), 1000);
    }
  }, [allDone]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-1">Processing your documents</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {allDone ? 'All files processed successfully.' : 'Please wait while we process your files...'}
        </p>
      </div>
      <div className="space-y-4">
        {jobs.map(job => (
          <FileProgress
            key={job.jobId}
            jobId={job.jobId}
            filename={job.filename}
            fileSize={job.fileSize}
          />
        ))}
      </div>
    </div>
  );
}

export default ProcessingSteps;
