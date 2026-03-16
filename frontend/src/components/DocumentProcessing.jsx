import React, { useState, useEffect } from 'react';

const STEPS = [
  { label: 'Reading document',       icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Extracting text content', icon: 'M4 6h16M4 12h16M4 18h7' },
  { label: 'Chunking into segments',  icon: 'M4 6h16M4 10h16M4 14h8M4 18h8' },
  { label: 'Generating embeddings',   icon: 'M4 7h3m0 0V4m0 3l3-3m10 3h-3m0 0V4m0 3l-3-3M4 17h3m0 0v3m0-3l3 3m10-3h-3m0 0v3m0-3l-3 3' },
  { label: 'Storing vectors',         icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
  { label: 'Indexing knowledge base', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { label: 'Ready',                   icon: 'M5 13l4 4L19 7' },
];

function DocumentProcessing({ fileName, alreadyDone, onComplete }) {
  const [currentStep, setCurrentStep] = useState(alreadyDone ? STEPS.length : -1);
  const [done, setDone] = useState(alreadyDone ?? false);
  const [expanded, setExpanded] = useState(!alreadyDone);
  const [lineFillPct, setLineFillPct] = useState(alreadyDone ? 100 : 0);

  useEffect(() => {
    if (alreadyDone) return;
    const timers = [];
    STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setCurrentStep(i);
        setLineFillPct((i / (STEPS.length - 1)) * 88);
      }, i * 700));
    });
    timers.push(setTimeout(() => {
      setCurrentStep(STEPS.length);
      setLineFillPct(100);
      setDone(true);
      onComplete?.();
    }, STEPS.length * 700));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-[#1e2030]"
      style={{ border: '0.5px solid', borderColor: 'rgb(229 231 235)', borderLeft: '2px solid #00C9B1' }}
    >
      {/* Header */}
      <div
        onClick={() => setExpanded(p => !p)}
        className={`flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors ${expanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
      >
        <img
          src="/Archelon_logo.png"
          alt=""
          className={`w-5 h-5 object-contain flex-shrink-0 opacity-70 ${!done ? 'animate-spin-slow' : ''}`}
        />
        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
          {done ? 'Document processed' : 'Processing document...'}
          {fileName && <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">— {fileName}</span>}
        </span>
        {!done && (
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-2 tabular-nums">
            {Math.max(currentStep + 1, 0)} / {STEPS.length}
          </span>
        )}
        {done && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-2 py-0.5 mr-2">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            complete
          </span>
        )}
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Steps body */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '500px' : '0px' }}
      >
        <div className="px-4 py-4 relative">
          {/* Timeline track — left = px-4(16) + w-6/2(12) - lineWidth/2(1) = 27px */}
          <div
            className="absolute bg-gray-200 dark:bg-gray-700"
            style={{ left: 27, top: 24, bottom: 24, width: 2, zIndex: 0 }}
          >
            <div
              className="absolute top-0 left-0 w-full transition-all duration-500"
              style={{ background: '#00C9B1', height: `${lineFillPct}%` }}
            />
          </div>

          {STEPS.map((step, i) => {
            const isDone = i < currentStep;
            const isActive = i === currentStep && !done;
            const isPending = !isDone && !isActive;

            return (
              <div key={i} className="relative flex items-center gap-3 py-2" style={{ zIndex: 1 }}>
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ zIndex: 2 }}>
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${isPending ? 'bg-gray-300 dark:bg-gray-600' : ''}`}
                    style={{
                      backgroundColor: isDone || isActive ? '#00C9B1' : undefined,
                      boxShadow: isActive ? '0 0 0 4px rgba(0,201,177,0.15)' : 'none',
                      animation: isActive ? 'dotPulse 1.4s ease-in-out infinite' : 'none',
                    }}
                  />
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${
                    isPending ? 'text-gray-300 dark:text-gray-600' : isActive ? 'text-[#00C9B1]' : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={step.icon} />
                </svg>
                <span className={`flex-1 text-sm whitespace-nowrap transition-all duration-300 ${
                  isPending ? 'text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-100'
                } ${isActive ? 'font-medium' : 'font-normal'}`}>
                  {step.label}
                </span>
                <svg viewBox="0 0 16 16" fill="none"
                  className="w-4 h-4 flex-shrink-0 transition-opacity duration-300"
                  style={{ opacity: isDone ? 1 : 0 }}
                >
                  <path d="M3 8l3.5 3.5L13 5" stroke="#00C9B1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(0,201,177,0.15); }
          50% { box-shadow: 0 0 0 7px rgba(0,201,177,0.05); }
        }
      `}</style>
    </div>
  );
}

export default DocumentProcessing;
