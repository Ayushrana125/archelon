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

function FileProgress({ jobId, filename, fileSize, active, alreadyDone, onComplete }) {
  const [job, setJob] = useState(null);
  const [expanded, setExpanded] = useState(!alreadyDone);
  const intervalRef = useRef(null);

  const isDone  = alreadyDone || job?.status === 'done';
  const isError = job?.status === 'error';

  useEffect(() => {
    if (isDone) setExpanded(false);
  }, [isDone]);

  useEffect(() => {
    if (!active || alreadyDone || !jobId) return;
    const poll = async () => {
      try {
        const data = await getJobStatus(jobId);
        setJob(data);
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(intervalRef.current);
          setTimeout(() => onComplete?.(data.status), 800);
        }
      } catch {
        clearInterval(intervalRef.current);
      }
    };
    poll();
    intervalRef.current = setInterval(poll, 1000);
    return () => clearInterval(intervalRef.current);
  }, [jobId, active]);

  const currentStep = job?.status ?? 'parsing';
  const meta        = job?.metadata ?? {};
  const stepIndex   = (step) => STEP_ORDER.indexOf(step);

  const subText = (step) => {
    if (step === 'parsing')  return meta.elements ? `${meta.elements} elements extracted` : 'Reading file structure...';
    if (step === 'chunking') return meta.parent_chunks ? `${meta.parent_chunks} parent · ${meta.child_chunks} child · avg ${meta.avg_tokens} tokens` : 'Splitting into chunks...';
    if (step === 'saving')   return meta.parent_chunks ? `${meta.parent_chunks + meta.child_chunks} records` : 'Writing to database...';
    if (step === 'done')     return meta.duration_ms ? `Done in ${(meta.duration_ms / 1000).toFixed(1)}s · ${meta.child_chunks} chunks stored` : 'Complete';
    return '';
  };

  return (
    <div className="rounded-xl bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Clickable header */}
      <div
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
          {isDone ? (
            <svg className="w-3.5 h-3.5" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : isError ? (
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <img src="/Archelon_logo.png" alt="" className="w-3.5 h-3.5 object-contain opacity-60 animate-spin-slow" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{filename}</p>
          <p className="text-xs text-gray-400">{formatSize(fileSize)}{meta.filetype ? ` · ${meta.filetype}` : ''}</p>
        </div>
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Collapsible steps */}
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: expanded ? '300px' : '0px' }}>
        <div className="px-4 pb-4 space-y-2">
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
          {isError && <p className="text-xs text-red-400 mt-1">{job?.error ?? 'Something went wrong'}</p>}
        </div>
      </div>
    </div>
  );
}

function ProcessingSteps({ jobs, completed, onComplete }) {
  const [activeIndex, setActiveIndex] = useState(completed ? jobs.length : 0);
  const [doneCount, setDoneCount] = useState(completed ? jobs.length : 0);

  const handleFileComplete = () => {
    setDoneCount(prev => {
      const next = prev + 1;
      if (next >= jobs.filter(j => j.jobId).length) {
        setTimeout(() => onComplete?.(), 1500);
      }
      return next;
    });
    setActiveIndex(prev => prev + 1);
  };

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {doneCount >= jobs.filter(j => j.jobId).length && jobs.length > 0
          ? 'All files processed'
          : completed ? '' : `Processing file ${Math.min(activeIndex + 1, jobs.length)} of ${jobs.length}...`
        }
      </p>
      <div className="space-y-3">
        {jobs.map((job, idx) => (
          <FileProgress
            key={job.jobId ?? `pending-${idx}`}
            jobId={job.jobId}
            filename={job.filename}
            fileSize={job.fileSize}
            active={!completed && idx === activeIndex}
            alreadyDone={completed}
            onComplete={handleFileComplete}
          />
        ))}
      </div>
    </div>
  );
}

export default ProcessingSteps;
