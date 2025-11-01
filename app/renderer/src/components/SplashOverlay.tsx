import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import vitniLogo from '../assets/vitni_logo_with_text.svg';

type SplashOverlayProps = {
  showing: boolean;
  loadingStage?: 'settings' | 'graph' | 'complete';
  progress?: number; // 0-100
};

const loadingStages = {
  settings: {
    message: 'Loading settings…',
    progress: 25
  },
  graph: {
    message: 'Loading graph data…',
    progress: 75
  },
  complete: {
    message: 'Almost ready…',
    progress: 100
  }
};

export function SplashOverlay({ showing, loadingStage = 'settings', progress: externalProgress }: SplashOverlayProps) {
  const [internalProgress, setInternalProgress] = useState(0);

  // Use external progress if provided, otherwise calculate from stage
  const progress = externalProgress ?? loadingStages[loadingStage].progress;

  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => {
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 4 + Math.random() * 4;
      const opacity = 0.1 + Math.random() * 0.2;
      return { id: i, size, x, y, delay, duration, opacity };
    });
  }, []);

  useEffect(() => {
    if (!showing) {
      setInternalProgress(0);
      return;
    }

    // Animate progress smoothly towards target
    const progressInterval = setInterval(() => {
      setInternalProgress((prev) => {
        const target = progress;
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;
        // Faster animation when far from target, slower when close
        const speed = Math.abs(diff) > 10 ? 0.2 : 0.1;
        return prev + diff * speed;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [showing, progress]);

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated gradient background */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, rgba(56,189,248,.15) 0%, rgba(15,23,42,0) 60%), radial-gradient(40% 40% at 80% 20%, rgba(34,197,94,.10) 0%, rgba(15,23,42,0) 60%), radial-gradient(30% 30% at 20% 80%, rgba(168,85,247,.10) 0%, rgba(15,23,42,0) 60%)'
            }}
          />

          {/* Grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #94a3b81a 1px, transparent 1px), linear-gradient(to bottom, #94a3b81a 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          />

          {/* Floating particles */}
          <div className="pointer-events-none absolute inset-0">
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute rounded-full bg-white"
                style={{
                  width: p.size,
                  height: p.size,
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  opacity: p.opacity
                }}
                initial={{ y: 0, scale: 0.5 }}
                animate={{
                  y: [0, -15, 0],
                  x: [0, 3, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center gap-8">
            {/* Logo */}
            <motion.img
              src={vitniLogo}
              alt="Vitni"
              className="h-16 w-auto opacity-95"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />

            {/* Animated loader */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {/* Outer spinning ring */}
                <motion.div
                  className="h-16 w-16 rounded-full border-2 border-slate-800"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Inner spinning arc */}
                <motion.div
                  className="absolute inset-0 h-16 w-16 rounded-full border-2 border-transparent border-t-emerald-400 border-r-sky-400"
                  animate={{ rotate: 360 }}
                  transition={{ ease: 'linear', duration: 1.5, repeat: Infinity }}
                />
                {/* Pulsing center dot */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                </motion.div>
              </div>

              {/* Progress bar */}
              <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, internalProgress))}%` }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </div>

              {/* Loading message */}
              <motion.div
                key={loadingStage}
                className="text-sm font-mono text-slate-400 min-h-[1.25rem]"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
              >
                {loadingStages[loadingStage].message}
              </motion.div>
            </div>
          </div>

          {/* Subtle scanline effect */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0, rgba(255,255,255,.05) 1px, transparent 2px, transparent 4px)'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}


