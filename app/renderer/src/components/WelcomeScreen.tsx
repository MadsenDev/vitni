import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import vitniLogo from '../assets/vitni_logo_with_text.svg';

interface WelcomeScreenProps {
  onProjectCreate: () => void;
  onProjectLoad: () => void;
}

export function WelcomeScreen({ onProjectCreate, onProjectLoad }: WelcomeScreenProps) {
  const [recentProjects] = useState<string[]>([]);

  const particles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => {
      const size = Math.random() * 4 + 2;
      const x = Math.random() * 100; // vw
      const y = Math.random() * 100; // vh
      const delay = Math.random() * 2;
      const duration = 6 + Math.random() * 6;
      const opacity = 0.15 + Math.random() * 0.35;
      return { id: i, size, x, y, delay, duration, opacity };
    });
  }, []);

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated gradient vignette */}
      <motion.div
        className="pointer-events-none absolute -inset-1 opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 0.6 }}
        style={{
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(56,189,248,.25) 0%, rgba(15,23,42,0) 60%), radial-gradient(40% 40% at 80% 20%, rgba(34,197,94,.20) 0%, rgba(15,23,42,0) 60%), radial-gradient(30% 30% at 20% 80%, rgba(168,85,247,.20) 0%, rgba(15,23,42,0) 60%)'
        }}
      />

      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b81a 1px, transparent 1px), linear-gradient(to bottom, #94a3b81a 1px, transparent 1px) ',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Code rain columns */}
      <CodeRain />

      {/* Scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(255,255,255,.08) 0, rgba(255,255,255,.08) 1px, transparent 2px, transparent 4px)'
        }}
      />

      {/* Particle-like floating dots */}
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}vw`,
              top: `${p.y}vh`,
              opacity: p.opacity
            }}
            initial={{ y: 0, scale: 0.8 }}
            animate={{
              y: [0, -20, 0],
              x: [0, 5, 0]
            }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 w-full max-w-3xl px-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="text-center">
          <motion.img
            src={vitniLogo}
            alt="Vitni"
            className="mx-auto mb-6 h-14 w-auto opacity-95"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          <MorphingHeadline />
          <motion.p
            className="mb-12 text-lg text-slate-300/90"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
          >
            Organize evidence, map relationships, and build your case with clarity
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <motion.button
            onClick={onProjectCreate}
            className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-slate-900/60 px-8 py-10 text-left shadow-lg backdrop-blur transition-colors hover:border-emerald-400/50 hover:bg-slate-900/80"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/40 shadow-[0_0_32px_-12px_rgba(16,185,129,0.5)]">
                <svg className="h-8 w-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <h3 className="mb-2 font-mono text-xl font-semibold text-white tracking-tight">Create New Project</h3>
              <p className="font-mono text-sm text-emerald-300/80">
                Start a fresh investigation with a new database and workspace
              </p>
            </div>
            <div className="pointer-events-none absolute -inset-px rounded-xl ring-1 ring-emerald-400/30" />
          </motion.button>

          <motion.button
            onClick={onProjectLoad}
            className="group relative overflow-hidden rounded-xl border border-sky-500/30 bg-slate-900/60 px-8 py-10 text-left shadow-lg backdrop-blur transition-colors hover:border-sky-400/50 hover:bg-slate-900/80"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-400/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-400/10 ring-1 ring-sky-400/40 shadow-[0_0_32px_-12px_rgba(56,189,248,0.5)]">
                <svg className="h-8 w-8 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
              </div>
              <h3 className="mb-2 font-mono text-xl font-semibold text-white tracking-tight">Load Project</h3>
              <p className="font-mono text-sm text-sky-300/80">Continue working on an existing investigation</p>
            </div>
            <div className="pointer-events-none absolute -inset-px rounded-xl ring-1 ring-sky-400/30" />
          </motion.button>
        </div>

        {recentProjects.length > 0 && (
          <div className="mt-10 border-t border-slate-800 pt-8">
            <h3 className="mb-4 text-lg font-semibold text-white">Recent Projects</h3>
            <div className="space-y-2">
              {recentProjects.map((project, index) => (
                <button
                  key={index}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-left transition-colors hover:border-slate-700 hover:bg-slate-900/60"
                >
                  <div className="font-medium text-white">{project}</div>
                  <div className="text-sm text-slate-400">Last opened recently</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="font-mono text-xs text-slate-500">Your data is encrypted and stored locally on your device</p>
        </div>
      </motion.div>
    </div>
  );
}

const flipCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789!@#$%^&*()_+-=<>'.split('');

function MorphingHeadline() {
  const roles = useMemo(
    () => [
      'Investigate. Connect. Conclude.',
      'Map relationships with confidence.',
      'From evidence to insight.',
      'Local-first. Private by design.',
      'Visual analysis for real cases.'
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fromText, setFromText] = useState(roles[0]);
  const [toText, setToText] = useState(roles[0]);
  const [currentLen, setCurrentLen] = useState(roles[0].length);
  const [revealTailCount, setRevealTailCount] = useState(0); // revealed chars beyond common prefix
  const [scrambleTick, setScrambleTick] = useState(0);
  const animatingRef = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    try {
      reducedMotion.current = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {}
  }, []);

  const commonPrefixLength = (a: string, b: string) => {
    const min = Math.min(a.length, b.length);
    let i = 0;
    while (i < min && a[i] === b[i]) i++;
    return i;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (animatingRef.current) return;
      const nextIndex = (currentIndex + 1) % roles.length;
      const nextText = roles[nextIndex];
      // Use the currently displayed text as the source to avoid stale closures
      startMorph(toText, nextText);
      setCurrentIndex(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, roles, toText]);

  const startMorph = (from: string, to: string) => {
    animatingRef.current = true;
    setFromText(from);
    setToText(to);

    const fromLen = from.length;
    const toLen = to.length;
    const prefixLen = commonPrefixLength(from, to);

    if (reducedMotion.current) {
      setCurrentLen(toLen);
      setRevealTailCount(toLen - prefixLen);
      setFromText(to);
      animatingRef.current = false;
      return;
    }

    // rAF-based timing
    const perCharMs = 70;
    const durationMs = Math.max(500, (toLen - prefixLen) * perCharMs);
    const start = performance.now();

    const scrambleInterval = setInterval(() => setScrambleTick((t) => t + 1), 40);

    const tick = () => {
      const now = performance.now();
      const progress = Math.min(1, (now - start) / durationMs);
      const revealed = Math.floor((toLen - prefixLen) * progress);
      setRevealTailCount(revealed);

      // Morph overall length smoothly from fromLen to toLen
      const len = Math.round(fromLen + (toLen - fromLen) * progress);
      setCurrentLen(len);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        clearInterval(scrambleInterval);
        setCurrentLen(toLen);
        setRevealTailCount(toLen - prefixLen);
        setFromText(to);
        animatingRef.current = false;
      }
    };

    requestAnimationFrame(tick);
  };

  // Initialize
  useEffect(() => {
    setCurrentLen(fromText.length);
    const prefixLen = commonPrefixLength(fromText, toText);
    setRevealTailCount(fromText.length - prefixLen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderChar = (i: number) => {
    const targetChar = toText[i] ?? '';
    const fromChar = fromText[i] ?? '';
    const prefixLen = commonPrefixLength(fromText, toText);

    // Static common prefix
    if (i < prefixLen) {
      if (targetChar === ' ') {
        return (
          <span key={`p-sp-${i}`} className="bg-clip-text text-transparent" style={{ width: '0.6em', whiteSpace: 'pre' }}>
            {' '}
          </span>
        );
      }
      return (
        <span key={`p-${i}`} className="bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
          {targetChar}
        </span>
      );
    }

    // Revealed tail after prefix
    if (i < prefixLen + revealTailCount) {
      if (targetChar === ' ') {
        return (
          <span key={`f-sp-${i}`} className="bg-clip-text text-transparent" style={{ width: '0.6em', whiteSpace: 'pre' }}>
            {' '}
          </span>
        );
      }
      return (
        <span key={`f-${i}`} className="bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
          {targetChar}
        </span>
      );
    }

    // Unrevealed: keep spacing if space in either
    if (targetChar === ' ' || fromChar === ' ') {
      return (
        <span key={`u-sp-${i}`} className="bg-clip-text text-transparent" style={{ width: '0.6em', whiteSpace: 'pre' }}>
          {' '}
        </span>
      );
    }

    // Scramble placeholder for unrevealed tail
    const ch = flipCharacters[Math.floor(Math.random() * flipCharacters.length)];
    return (
      <span key={`s-${i}-${scrambleTick}`} className="bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent opacity-70">
        {ch}
      </span>
    );
  };

  // Caret position at end of revealed section
  const caretIndex = Math.min(currentLen, commonPrefixLength(fromText, toText) + revealTailCount);

  return (
    <div className="relative mb-3 select-none">
      <div className="flex items-center justify-center font-mono text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
        {Array.from({ length: currentLen }).map((_, i) => renderChar(i))}
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[1.1em] w-[0.5ch] translate-y-[0.08em] bg-emerald-300/80 shadow-[0_0_12px_rgba(16,185,129,0.6)] [animation:blink_1.1s_steps(2,_start)_infinite]"
          style={{ visibility: caretIndex >= currentLen ? 'visible' : 'visible' }}
        />
      </div>
    </div>
  );
}

function CodeRain() {
  const columns = 18;
  const chars = '日月金木水火土ABCDEFGHIJKLMNPQRSTUVWXYZ1234567890'.split('');
  const items = Array.from({ length: columns }).map((_, i) => ({ i, delay: Math.random() * 3, speed: 8 + Math.random() * 6, left: (i / columns) * 100 }));
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.10]">
      {items.map(({ i, delay, speed, left }) => (
        <motion.div
          key={i}
          className="absolute h-[200%] w-6 text-emerald-300/80"
          style={{ left: `${left}%` }}
          initial={{ y: '-100%' }}
          animate={{ y: ['-100%', '0%'] }}
          transition={{ repeat: Infinity, ease: 'linear', duration: speed, delay }}
        >
          <div className="select-none text-center font-mono text-sm leading-5">
            {Array.from({ length: 80 }).map((_, j) => (
              <div key={j}>{chars[Math.floor(Math.random() * chars.length)]}</div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
