import React, { useState, useEffect, useRef } from 'react';

function TypingBubble({ text, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    const words = text.split(' ');
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(words.slice(0, idx.current).join(' '));
      if (idx.current >= words.length) { clearInterval(iv); onDone?.(); }
    }, 32);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{displayed}</span>;
}

function DotsLoader() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0,1,2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
      ))}
    </span>
  );
}

function ThinkingSteps({ query, searchThinking, agentName, sources, onComplete, isHistorical, isSmallTalk }) {
  const [currentStep, setCurrentStep] = useState(isHistorical ? 2 : -1);
  const [done, setDone] = useState(isHistorical);
  const [expanded, setExpanded] = useState(!isHistorical);
  const [bubble1Done, setBubble1Done] = useState(isHistorical);
  const [bubble2Done, setBubble2Done] = useState(isHistorical);

  const STEPS = [
    { sub: query || 'Reading your message...' },
    { sub: searchThinking || `Scanning documents for anything relevant to this...` },
    { sub: sources?.length ? sources.join(', ') : 'Searching knowledge base...' },
  ];

  useEffect(() => {
    if (isHistorical) return;
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setCurrentStep(i), i * 900)
    );
    timers.push(setTimeout(() => {
      setDone(true);
      setExpanded(false);
      onComplete?.();
    }, STEPS.length * 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Small talk — just animated dots, no steps
  if (isSmallTalk && !done) {
    return (
      <div className="flex justify-start px-1">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-gray-100 dark:bg-[#2a2a2a] text-sm text-gray-500">
          <DotsLoader />
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: expanded ? '0' : '-18px' }}>
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-1.5 select-none"
      >
        <img
          src="/Archelon_logo.png"
          alt=""
          className={`w-4 h-4 object-contain opacity-50 ${!done ? 'animate-spin-slow' : ''}`}
        />
        <span>{done ? 'Show thinking' : 'Thinking...'}</span>
        <svg
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 16 16"
        >
          <path d="M4 6l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '500px' : '0px' }}
      >
        <div className="flex flex-col gap-2 pb-1">

          {/* Bubble 1 */}
          <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] transition-all duration-300 ${
            (currentStep > 0) || done
              ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-500'
              : currentStep === 0
              ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-100'
              : 'opacity-0'
          }`}>
            {currentStep === 0 && !bubble1Done
              ? <TypingBubble text={STEPS[0].sub} onDone={() => setBubble1Done(true)} />
              : <>{STEPS[0].sub}{currentStep === 0 && !done && <DotsLoader />}</>}
          </div>

          {/* Bubble 2 */}
          {(currentStep >= 1 || done) && (
            <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] transition-all duration-300 ${
              (currentStep > 1) || done
                ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-500'
                : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-100'
            }`}>
              {currentStep === 1 && !bubble2Done
                ? <TypingBubble text={STEPS[1].sub} onDone={() => setBubble2Done(true)} />
                : <>{STEPS[1].sub}{currentStep === 1 && !done && <DotsLoader />}</>}
            </div>
          )}

          {/* Bubble 3 — docs */}
          {(currentStep >= 2 || done) && (
            <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] transition-all duration-300 ${
              done
                ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-500'
                : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-100'
            }`}>
              <div className="mb-2 text-gray-500 dark:text-gray-400 flex items-center gap-1">
                Found {sources?.length || 0} source{sources?.length !== 1 ? 's' : ''}
                {!done && <DotsLoader />}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(sources?.length ? sources : ['Searching...']).map((src, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <svg className="w-3 h-3 text-[#00C9B1] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThinkingSteps;
