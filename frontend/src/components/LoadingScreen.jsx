import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUOTES = [
  { text: 'Your documents are being indexed for precise retrieval.', label: 'Document Intelligence' },
  { text: 'Agents reason across your knowledge base before answering.', label: 'Agentic RAG' },
  { text: 'Each agent has a fully isolated knowledge base.', label: 'Data Isolation' },
  { text: 'Multi-step retrieval finds the most relevant context.', label: 'Precision Retrieval' },
  { text: 'Parent-child chunking gives both precision and context.', label: 'Smart Chunking' },
  { text: 'Intent classification routes every query to the right agent.', label: 'Query Routing' },
];

function LoadingScreen({ onDone }) {
  const [idx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    onDone();
  }, []);

  const quote = QUOTES[idx];

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center gap-10"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <motion.img
        layoutId="archelon-logo"
        src="/Archelon_logo.png"
        alt="Archelon"
        className="h-12 w-auto object-contain"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
      />
      <div className="flex flex-col items-center gap-1.5 max-w-xs text-center px-6">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#00C9B1' }}>
          {quote.label}
        </span>
        <span className="text-sm text-gray-400 leading-relaxed">{quote.text}</span>
      </div>
    </motion.div>
  );
}

export default LoadingScreen;
