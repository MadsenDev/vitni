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

export function WelcomeScreen({ onProjectCreate, onProjectLoad }: WelcomeScreenProps) {
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
    loadRecentProjects();
  }, []);

  const handleOpenRecent = async (projectPath: string) => {
    try {
      const res = await window.piBridge.projectOpenPath(projectPath);
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('project:loaded'));
      } else {
        console.error('Failed to open project:', res.message);
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />

      <div className="relative z-10 w-full max-w-6xl px-6 py-12 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start">
          {/* Main Content */}
          <div className="flex flex-col space-y-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <img
                src={vitniLogo}
                alt="Vitni"
                className="h-12 w-auto opacity-95"
              />
              <div className="space-y-3">
                <h1 className="font-mono text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Investigation
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400">
                    Workspace
                  </span>
                </h1>
                <p className="text-lg text-slate-400 font-mono max-w-xl">
                  Organize evidence, map relationships, and build your case with clarity and precision.
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <motion.button
                onClick={onProjectCreate}
                className="group relative overflow-hidden rounded-lg border border-emerald-500/20 bg-slate-800/40 backdrop-blur-sm p-6 text-left transition-all hover:border-emerald-500/40 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-emerald-500/10"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-semibold text-white mb-1 text-lg">New Project</h3>
                    <p className="text-sm text-slate-400 font-mono">
                      Start a fresh investigation
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>

              <motion.button
                onClick={onProjectLoad}
                className="group relative overflow-hidden rounded-lg border border-sky-500/20 bg-slate-800/40 backdrop-blur-sm p-6 text-left transition-all hover:border-sky-500/40 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-sky-500/10"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                    <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-semibold text-white mb-1 text-lg">Open Project</h3>
                    <p className="text-sm text-slate-400 font-mono">
                      Continue existing work
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-sky-400 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            </motion.div>

            {/* Footer note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="pt-4 border-t border-slate-800/50"
            >
              <p className="text-xs text-slate-500 font-mono">
                Your data is encrypted and stored locally on your device
              </p>
            </motion.div>
          </div>

          {/* Recent Projects Sidebar */}
          {recentProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:border-l lg:border-slate-800/50 lg:pl-12 lg:pt-0 pt-8 mt-8 lg:mt-0 border-t border-slate-800/50 lg:border-t-0"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="font-mono font-semibold text-white mb-1 text-lg">Recent Projects</h3>
                  <p className="text-xs text-slate-500 font-mono">Quick access to your work</p>
                </div>
                <div className="space-y-2">
                  {recentProjects.map((project, idx) => (
                    <motion.button
                      key={project.root}
                      onClick={() => handleOpenRecent(project.root)}
                      className="group w-full rounded-lg border border-slate-800/50 bg-slate-800/30 backdrop-blur-sm p-4 text-left transition-all hover:border-slate-700 hover:bg-slate-800/50 hover:shadow-md"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.05, duration: 0.3 }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-medium text-white group-hover:text-emerald-400 transition-colors truncate mb-1">
                            {project.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {formatLastOpened(project.lastOpenedAt)}
                          </div>
                        </div>
                        <svg
                          className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 transition-all flex-shrink-0 mt-0.5"
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
      </div>
    </div>
  );
}
