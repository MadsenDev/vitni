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
          <FlippingHeadline />
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
            className="group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 px-8 py-10 text-left shadow-lg backdrop-blur transition-colors hover:border-slate-700 hover:bg-slate-900/80"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15">
                <svg className="h-8 w-8 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Create New Project</h3>
              <p className="text-sm text-slate-400">
                Start a fresh investigation with a new database and workspace
              </p>
            </div>
          </motion.button>

          <motion.button
            onClick={onProjectLoad}
            className="group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/60 px-8 py-10 text-left shadow-lg backdrop-blur transition-colors hover:border-slate-700 hover:bg-slate-900/80"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <svg className="h-8 w-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Load Project</h3>
              <p className="text-sm text-slate-400">Continue working on an existing investigation</p>
            </div>
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
          <p className="text-sm text-slate-500">Your data is encrypted and stored locally on your device</p>
        </div>
      </motion.div>
    </div>
  );
}

const flipCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789!@#$%^&*()_+-=<>'.split('');

function FlippingHeadline() {
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

  const [currentRole, setCurrentRole] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentRole((prev) => (prev + 1) % roles.length);
          isAnimatingRef.current = false;
          setIsAnimating(false);
        }, 800);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [roles.length]);

  const text = roles[currentRole];

  return (
    <div className="relative mb-3 select-none">
      <div className="flex items-center justify-center">
        {Array.from(text).map((char, idx) => (
          <AnimatedChar key={`${idx}-${char}`} char={char} index={idx} isAnimating={isAnimating} />
        ))}
      </div>
    </div>
  );
}

function AnimatedChar({ char, index, isAnimating }: { char: string; index: number; isAnimating: boolean }) {
  const [displayChar, setDisplayChar] = useState(char);
  const [isFlipping, setIsFlipping] = useState(false);

  const shouldAnimate = char !== ' ' && char.trim() !== '';

  useEffect(() => {
    if (isAnimating && shouldAnimate) {
      setIsFlipping(true);
      let flipCount = 0;
      const maxFlips = 6 + Math.floor(Math.random() * 4);
      const interval = setInterval(() => {
        if (flipCount < maxFlips) {
          setDisplayChar(flipCharacters[Math.floor(Math.random() * flipCharacters.length)]);
          flipCount++;
        } else {
          setDisplayChar(char);
          setIsFlipping(false);
          clearInterval(interval);
        }
      }, 60 + index * 8);
      return () => clearInterval(interval);
    } else if (!isAnimating) {
      setDisplayChar(char);
      setIsFlipping(false);
    }
  }, [char, index, isAnimating, shouldAnimate]);

  if (!shouldAnimate) {
    return (
      <span
        className="inline-block bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent"
        style={{ width: char === ' ' ? '0.25em' : 'auto', whiteSpace: 'pre' }}
      >
        {char}
      </span>
    );
  }

  return (
    <motion.span
      initial={{ rotateX: 0 }}
      animate={{ rotateX: isFlipping ? [0, 90, 0] : 0, scale: isFlipping ? [1, 1.1, 1] : 1 }}
      transition={{ duration: isFlipping ? 0.08 : 0.3, ease: 'easeInOut' }}
      className="inline-block bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent"
      style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom', whiteSpace: 'pre' }}
    >
      {displayChar}
    </motion.span>
  );
}
