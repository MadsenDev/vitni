import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import vitniLogo from '../assets/vitni_logo_with_text.svg';

type SplashOverlayProps = {
  showing: boolean;
  loadingStage?: 'settings' | 'graph' | 'complete';
  progress?: number;
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
  const progress = externalProgress ?? loadingStages[loadingStage].progress;

  const particles = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, index) => ({
        id: index,
        size: Math.random() * 3 + 1,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 4,
        opacity: 0.1 + Math.random() * 0.2
      })),
    []
  );

  useEffect(() => {
    if (!showing) {
      setInternalProgress(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setInternalProgress((previous) => {
        const target = progress;
        const diff = target - previous;
        if (Math.abs(diff) < 0.5) return target;
        const speed = Math.abs(diff) > 10 ? 0.2 : 0.1;
        return previous + diff * speed;
      });
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [progress, showing]);

  if (!showing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950 text-slate-100"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(56,189,248,.15) 0%, rgba(15,23,42,0) 60%), radial-gradient(40% 40% at 80% 20%, rgba(34,197,94,.10) 0%, rgba(15,23,42,0) 60%), radial-gradient(30% 30% at 20% 80%, rgba(168,85,247,.10) 0%, rgba(15,23,42,0) 60%)'
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(69,214,168,.18), transparent 32%), radial-gradient(circle at 70% 35%, rgba(95,212,255,.18), transparent 30%), radial-gradient(circle at 50% 75%, rgba(217,70,239,.12), transparent 26%)',
          animation: 'slow-aurora 10s ease-in-out infinite'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b81a 1px, transparent 1px), linear-gradient(to bottom, #94a3b81a 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: particle.opacity,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <motion.div
          animate={{ y: [0, -4, 0], filter: ['drop-shadow(0 0 0 rgba(95,212,255,0))', 'drop-shadow(0 0 18px rgba(95,212,255,0.18))', 'drop-shadow(0 0 0 rgba(95,212,255,0))'] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src={vitniLogo} alt="Vitni" className="h-16 w-auto opacity-95" />
        </motion.div>

        <div className="panel-elevated animate-shimmer-border flex min-w-[340px] flex-col items-center gap-5 rounded-[28px] px-8 py-7">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.55, 0.9, 0.55] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400/15 via-sky-400/20 to-fuchsia-400/15 blur-xl"
            />
            <div className="relative h-20 w-20 rounded-full border border-slate-700/80 bg-slate-950/80 shadow-[0_0_0_1px_rgba(95,212,255,0.08)]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[6px] rounded-full border border-transparent border-t-emerald-400/95 border-r-sky-400/95"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4.6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[15px] rounded-full border border-transparent border-b-fuchsia-400/70 border-l-sky-300/60"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.18, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(69,214,168,0.75)]"
                />
              </div>
            </div>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-500">
              <span>System Warmup</span>
              <span>{Math.round(Math.min(100, Math.max(0, internalProgress)))}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400"
                animate={{ width: `${Math.min(100, Math.max(0, internalProgress))}%` }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          <motion.div
            key={loadingStage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-[1.25rem] text-sm font-mono tracking-wide text-slate-300"
          >
            {loadingStages[loadingStage].message}
          </motion.div>
          <p className="max-w-xs text-center text-xs leading-relaxed text-slate-500">
            Preparing the investigation workspace, restoring project context, and syncing the graph view.
          </p>
        </div>
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0, rgba(255,255,255,.05) 1px, transparent 2px, transparent 4px)'
        }}
      />
    </motion.div>
  );
}
