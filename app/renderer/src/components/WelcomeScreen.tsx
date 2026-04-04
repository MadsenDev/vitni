import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaExternalLinkAlt, FaFolderOpen, FaTrash } from 'react-icons/fa';
import {
  INVESTIGATION_PROFILES,
  getInvestigationProfileDefinition,
  type InvestigationProfile
} from '@renderer/features/profiles/investigationProfiles';
import vitniLogo from '../assets/vitni_logo_with_text.svg';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

interface WelcomeScreenProps {
  onProjectCreate: () => void;
  onProjectLoad: () => void;
  investigationProfile: InvestigationProfile;
  onInvestigationProfileChange: (value: InvestigationProfile) => void;
  showExampleCase: boolean;
}

interface RecentProject {
  root: string;
  name: string;
  lastOpenedAt: number;
}

interface ExampleProjectInfo {
  available: boolean;
  name: string;
  path?: string;
}

const SCRAMBLE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const HEADLINE_WORDS = ['workspace', 'evidence', 'analysis', 'casework'];

function formatLastOpened(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function shortProjectLocation(projectRoot: string) {
  const normalized = projectRoot.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.slice(-3).join(' / ');
}

function CyclingDecryptText({
  words,
  className,
  startDelay = 0,
  stepMs = 42,
  holdMs = 2200
}: {
  words: string[];
  className?: string;
  startDelay?: number;
  stepMs?: number;
  holdMs?: number;
}) {
  const [displayText, setDisplayText] = useState(words[0] ?? '');

  useEffect(() => {
    const mediaQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (mediaQuery?.matches) {
      setDisplayText(words[0] ?? '');
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;
    let timeoutId: number | null = null;
    let wordIndex = 0;

    const clearTimers = () => {
      if (intervalId !== null) window.clearInterval(intervalId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      intervalId = null;
      timeoutId = null;
    };

    const animateToWord = (nextIndex: number) => {
      const target = words[nextIndex] ?? '';
      let frame = 0;

      intervalId = window.setInterval(() => {
        if (cancelled) {
          clearTimers();
          return;
        }

        frame += 1;
        const resolved = Math.floor(frame / 2);
        const nextText = target
          .split('')
          .map((character, index) => {
            if (character === ' ') return ' ';
            if (index < resolved) return target[index];
            return SCRAMBLE_CHARACTERS[Math.floor(Math.random() * SCRAMBLE_CHARACTERS.length)];
          })
          .join('');

        setDisplayText(nextText);

        if (resolved >= target.length) {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
          setDisplayText(target);
          wordIndex = nextIndex;
          timeoutId = window.setTimeout(() => {
            animateToWord((wordIndex + 1) % words.length);
          }, holdMs);
        }
      }, stepMs);
    };

    timeoutId = window.setTimeout(() => {
      animateToWord(words.length > 1 ? 1 : 0);
    }, startDelay + holdMs);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [holdMs, startDelay, stepMs, words]);

  return (
    <span aria-hidden="true" className={className}>
      {displayText}
    </span>
  );
}

export function WelcomeScreen({
  onProjectCreate,
  onProjectLoad,
  investigationProfile,
  onInvestigationProfileChange,
  showExampleCase
}: WelcomeScreenProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [exampleProject, setExampleProject] = useState<ExampleProjectInfo | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [recentContextMenu, setRecentContextMenu] = useState<{
    project: RecentProject;
    position: { x: number; y: number };
  } | null>(null);
  const profileDefinition = getInvestigationProfileDefinition(investigationProfile);

  useEffect(() => {
    const loadWelcomeData = async () => {
      try {
        const [projects, exampleInfo] = await Promise.all([
          window.piBridge.projectRecent(),
          window.piBridge.projectExampleInfo()
        ]);
        setRecentProjects(projects);
        setExampleProject(exampleInfo);
      } catch (error) {
        console.error('Failed to load welcome screen data:', error);
      }
    };
    void loadWelcomeData();
  }, []);

  const handleOpenRecent = async (projectPath: string) => {
    setOpenError(null);
    try {
      const result = await window.piBridge.projectOpenPath(projectPath);
      if (result.ok) {
        window.dispatchEvent(new CustomEvent('project:loaded'));
      } else {
        setOpenError(result.message ?? 'Failed to open project.');
      }
    } catch (error) {
      console.error('Error opening recent project:', error);
      setOpenError('Error opening recent project.');
    }
  };

  const handleOpenExample = async () => {
    setOpenError(null);
    try {
      const result = await window.piBridge.projectOpenExample();
      if (result.ok) {
        window.dispatchEvent(new CustomEvent('project:loaded'));
      } else {
        setOpenError(result.message ?? 'Failed to open example case.');
      }
    } catch (error) {
      console.error('Error opening example case:', error);
      setOpenError('Error opening example case.');
    }
  };

  const handleRecentContextAction = async (actionId: string) => {
    const context = recentContextMenu;
    setRecentContextMenu(null);
    if (!context) return;

    if (actionId === 'open') {
      await handleOpenRecent(context.project.root);
      return;
    }

    if (actionId === 'reveal') {
      const ok = await window.piBridge.revealPath(context.project.root);
      if (!ok) setOpenError('Could not reveal the project in your file manager.');
      return;
    }

    if (actionId === 'remove') {
      const ok = await window.piBridge.projectRemoveRecent(context.project.root);
      if (!ok) {
        setOpenError('Could not remove the project from recent projects.');
        return;
      }
      setRecentProjects((current) => current.filter((project) => project.root !== context.project.root));
    }
  };

  const recentContextItems: ContextMenuItem[] = recentContextMenu
    ? [
        {
          id: 'open',
          label: 'Open Project',
          description: 'Load this investigation package.',
          icon: <FaExternalLinkAlt className="h-3.5 w-3.5" />
        },
        {
          id: 'reveal',
          label: 'Reveal in Folder',
          description: 'Show the project in your file manager.',
          icon: <FaFolderOpen className="h-3.5 w-3.5" />
        },
        { id: 'separator-open-remove', separator: true },
        {
          id: 'remove',
          label: 'Remove from Recent',
          description: 'Hide this entry without changing the project itself.',
          icon: <FaTrash className="h-3.5 w-3.5" />,
          destructive: true
        }
      ]
    : [];

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_20%,rgba(69,214,168,0.12),transparent_24%),radial-gradient(circle_at_80%_16%,rgba(95,212,255,0.12),transparent_20%),radial-gradient(circle_at_52%_78%,rgba(217,70,239,0.08),transparent_22%),linear-gradient(180deg,#050917_0%,#060b19_48%,#040814_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ animation: 'slow-aurora 16s ease-in-out infinite' }}
      >
        <div className="absolute left-[10%] top-[18%] h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute right-[14%] top-[12%] h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-[14%] left-[46%] h-48 w-48 rounded-full bg-fuchsia-400/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl px-6 py-12 lg:px-12"
      >
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_420px] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.48 }}
            className="flex flex-col space-y-8"
          >
            <div className="space-y-6">
              <motion.img
                src={vitniLogo}
                alt="Vitni"
                className="h-12 w-auto opacity-95"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 0.95, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.38 }}
              />

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-emerald-200">
                  {profileDefinition.shortLabel}
                </span>
                <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-sky-200">
                  Evidence graph
                </span>
              </div>

              <div className="space-y-4">
                <h1 aria-label="Investigation workspace" className="max-w-3xl font-mono text-4xl font-bold leading-tight text-white lg:text-5xl">
                  Investigation
                  <br />
                  <CyclingDecryptText
                    words={HEADLINE_WORDS}
                    startDelay={260}
                    holdMs={2400}
                    className="bg-gradient-to-r from-emerald-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent"
                  />
                </h1>
                <p className="max-w-xl font-mono text-lg leading-relaxed text-slate-400">
                  {profileDefinition.welcomeBody}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {INVESTIGATION_PROFILES.map((profile) => {
                const active = profile.id === investigationProfile;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onInvestigationProfileChange(profile.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-sky-400/60 bg-sky-400/15 text-sky-100'
                        : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {profile.shortLabel}
                  </button>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.42 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <motion.button
                onClick={onProjectCreate}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-[24px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.68))] p-6 text-left shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition-all hover:border-emerald-400/45 hover:shadow-[0_22px_72px_rgba(16,185,129,0.12)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/8 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/12 text-emerald-300">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">Create</div>
                    <h2 className="mt-2 font-mono text-xl font-semibold text-white">New Project</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300/80">Start a fresh investigation and begin mapping entities immediately.</p>
                  </div>
                </div>
              </motion.button>

              <motion.button
                onClick={onProjectLoad}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative overflow-hidden rounded-[24px] border border-sky-500/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.12),rgba(15,23,42,0.68))] p-6 text-left shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition-all hover:border-sky-400/45 hover:shadow-[0_22px_72px_rgba(14,165,233,0.12)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400/8 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/12 text-sky-300">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/70">Load</div>
                    <h2 className="mt-2 font-mono text-xl font-semibold text-white">Open Project</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300/80">Continue from an existing investigation package without losing context.</p>
                  </div>
                </div>
              </motion.button>
            </motion.div>

            {showExampleCase && exampleProject?.available ? (
              <motion.button
                onClick={() => {
                  void handleOpenExample();
                }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.42 }}
                whileHover={{ y: -2, scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className="group relative overflow-hidden rounded-[24px] border border-fuchsia-500/20 bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(15,23,42,0.72))] p-5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition-all hover:border-fuchsia-400/40 hover:shadow-[0_22px_72px_rgba(168,85,247,0.10)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/8 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/12 text-fuchsia-200">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5V6.75A2.25 2.25 0 016.25 4.5h11.5A2.25 2.25 0 0120 6.75V19.5l-4-2.25-4 2.25-4-2.25-4 2.25z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/70">Explore</div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-mono text-lg font-semibold text-white">Open Example Case</h2>
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-fuchsia-100/80">
                        Included
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300/80">
                      Load <span className="font-mono text-slate-100">{exampleProject.name}</span> to explore a richer sample investigation without creating a project first.
                    </p>
                  </div>
                </div>
              </motion.button>
            ) : null}

            <div className="border-t border-slate-800/60 pt-4">
              <p className="text-xs font-mono text-slate-500">Your data is stored locally on this device unless you explicitly export it.</p>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22, duration: 0.46 }}
            className="mt-8 rounded-[28px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(7,11,23,0.92))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] lg:mt-0"
          >
            <div className="space-y-4">
              <div>
                <h3 className="font-mono text-lg font-semibold text-white">Recent Projects</h3>
                <p className="mt-1 text-xs font-mono uppercase tracking-[0.16em] text-slate-500">Quick access to your work</p>
              </div>

              {recentProjects.length > 0 ? (
                <div className="space-y-3">
                  {recentProjects.slice(0, 6).map((project, index) => (
                    <motion.button
                      key={project.root}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28 + index * 0.05, duration: 0.3 }}
                      onClick={() => {
                        void handleOpenRecent(project.root);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setRecentContextMenu({
                          project,
                          position: { x: event.clientX, y: event.clientY }
                        });
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.995 }}
                      className={[
                        'group w-full rounded-[22px] border p-4 text-left transition-all',
                        index === 0
                          ? 'border-emerald-500/25 bg-emerald-500/10 hover:border-emerald-400/40 hover:bg-emerald-500/12'
                          : 'border-slate-800/80 bg-slate-950/45 hover:border-slate-700/90 hover:bg-slate-900/70'
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono font-medium text-white">{project.name}</div>
                          <div className="mt-1 text-xs font-mono text-slate-500">{formatLastOpened(project.lastOpenedAt)}</div>
                          <div className="mt-2 truncate text-xs text-slate-400">{shortProjectLocation(project.root)}</div>
                        </div>
                        <svg
                          className={[
                            'mt-0.5 h-4 w-4 flex-shrink-0 transition-all',
                            index === 0
                              ? 'text-emerald-300/70 group-hover:text-emerald-200'
                              : 'text-slate-500 group-hover:text-slate-300'
                          ].join(' ')}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-700/80 bg-slate-950/35 px-5 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/70 text-slate-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                  </div>
                  <h4 className="mt-4 font-mono text-sm font-semibold text-white">No recent projects yet</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Create a new investigation or open an existing case and it will appear here for quick access.
                  </p>
                </div>
              )}

              {openError ? <p className="text-sm text-red-300">{openError}</p> : null}
            </div>
          </motion.aside>
        </div>
      </motion.div>
      <ContextMenu
        open={Boolean(recentContextMenu)}
        position={recentContextMenu?.position ?? null}
        items={recentContextItems}
        onClose={() => setRecentContextMenu(null)}
        onAction={(itemId) => {
          void handleRecentContextAction(itemId);
        }}
      />
    </div>
  );
}
