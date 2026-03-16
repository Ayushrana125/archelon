import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

function LoadingScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <motion.img
        layoutId="archelon-logo"
        src="/Archelon_logo.png"
        alt="Archelon"
        className="h-14 w-auto object-contain"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
      />
    </motion.div>
  );
}

export default LoadingScreen;
