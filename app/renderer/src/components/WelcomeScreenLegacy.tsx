import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import vitniLogo from '../assets/vitni_logo_with_text.svg';

interface WelcomeScreenProps {
  onProjectCreate: () => void;
  onProjectLoad: () => void;
}

interface RecentProject {
  root: string;
  name: string;
  lastOpenedAt: number;
}

export function WelcomeScreenLegacy({ onProjectCreate, onProjectLoad }: WelcomeScreenProps) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    const loadRecentProjects = async () => {
      try {
        const projects = await window.piBridge.projectRecent();
        setRecentProjects(projects);
      } catch (error) {
        console.error('Failed to load recent projects:', error);
      }
    };
    void loadRecentProjects();
  }, []);

  const handleOpenRecent = async (projectPath: string) => {
    try {
      const result = await window.piBridge.projectOpenPath(projectPath);
      if (result.ok) {
        window.dispatchEvent(new CustomEvent('project:loaded'));
      } else {
        console.error('Failed to open project:', result.message);
      }
    } catch (error) {
      console.error('Error opening recent project:', error);
    }
  };

  const formatLastOpened = (timestamp: number) => {
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
  };

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(69,214,168,0.12), transparent 26%), radial-gradient(circle at 78% 24%, rgba(95,212,255,0.12), transparent 24%), radial-gradient(circle at 55% 80%, rgba(217,70,239,0.08), transparent 26%)',
          animation: 'slow-aurora 14s ease-in-out infinite'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl px-6 py-12 lg:px-12"
      >
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="flex flex-col space-y-8"
          >
            <div className="space-y-6">
              <motion.img
                src={vitniLogo}
                alt="Vitni"
                className="h-12 w-auto opacity-95"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 0.95, scale: 1 }}
                transition={{ delay: 0.12, duration: 0.42 }}
              />
              <div className="space-y-3">
                <h1 className="font-mono text-4xl font-bold leading-tight text-white lg:text-5xl">
                  Investigation
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
                    Workspace
                  </span>
                </h1>
                <p className="max-w-xl font-mono text-lg leading-relaxed text-slate-400">
                  Organize evidence, trace relationships, and work inside a local-first investigation environment that feels calm under pressure.
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.45 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <motion.button
                onClick={onProjectCreate}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group panel-surface relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:border-emerald-500/40 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                    <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-mono text-lg font-semibold text-white">New Project</h3>
                    <p className="font-mono text-sm text-slate-400">Start a fresh investigation</p>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-500 opacity-0 transition-all group-hover:text-emerald-400 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>

              <motion.button
                onClick={onProjectLoad}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group panel-surface relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:border-sky-500/40 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-sky-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 transition-colors group-hover:bg-sky-500/20">
                    <svg className="h-6 w-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-mono text-lg font-semibold text-white">Open Project</h3>
                    <p className="font-mono text-sm text-slate-400">Continue existing work</p>
                  </div>
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-500 opacity-0 transition-all group-hover:text-sky-400 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            </motion.div>

            <div className="border-t border-slate-800/50 pt-4">
              <p className="text-xs font-mono text-slate-500">Your data is encrypted and stored locally on your device</p>
            </div>
          </motion.div>

          {recentProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.24, duration: 0.5 }}
              className="mt-8 border-t border-slate-800/50 pt-8 lg:mt-0 lg:border-l lg:border-t-0 lg:border-slate-800/50 lg:pl-12 lg:pt-0"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 font-mono text-lg font-semibold text-white">Recent Projects</h3>
                  <p className="text-xs font-mono text-slate-500">Quick access to your work</p>
                </div>
                <div className="space-y-2">
                  {recentProjects.map((project, index) => (
                    <motion.button
                      key={project.root}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28 + index * 0.04, duration: 0.32 }}
                      onClick={() => {
                        void handleOpenRecent(project.root);
                      }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.995 }}
                      className="group panel-surface w-full rounded-2xl p-4 text-left transition-all hover:border-slate-700 hover:bg-slate-800/50 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 truncate font-mono font-medium text-white transition-colors group-hover:text-emerald-400">
                            {project.name}
                          </div>
                          <div className="text-xs font-mono text-slate-500">{formatLastOpened(project.lastOpenedAt)}</div>
                        </div>
                        <svg
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500 opacity-0 transition-all group-hover:text-emerald-400 group-hover:opacity-100"
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
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
