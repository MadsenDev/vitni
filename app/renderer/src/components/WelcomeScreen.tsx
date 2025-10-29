import { useState } from 'react';

interface WelcomeScreenProps {
  onProjectCreate: () => void;
  onProjectLoad: () => void;
}

export function WelcomeScreen({ onProjectCreate, onProjectLoad }: WelcomeScreenProps) {
  const [recentProjects] = useState<string[]>([]); // TODO: Load from storage

  return (
    <div className="flex h-full items-center justify-center bg-slate-950">
      <div className="w-full max-w-2xl px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Private Investigation Graph Tool
          </h1>
          <p className="text-lg text-slate-400 mb-12">
            Organize evidence, track relationships, and build your case with confidence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={onProjectCreate}
            className="group p-8 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600 transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Create New Project</h3>
              <p className="text-slate-400 text-sm">
                Start a fresh investigation with a new database and workspace
              </p>
            </div>
          </button>

          <button
            onClick={onProjectLoad}
            className="group p-8 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-600 transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-600/20 flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Load Project</h3>
              <p className="text-slate-400 text-sm">
                Continue working on an existing investigation
              </p>
            </div>
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="border-t border-slate-800 pt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Projects</h3>
            <div className="space-y-2">
              {recentProjects.map((project, index) => (
                <button
                  key={index}
                  className="w-full p-4 text-left rounded-lg border border-slate-700 bg-slate-900/30 hover:bg-slate-800/30 hover:border-slate-600 transition-all duration-200"
                >
                  <div className="text-white font-medium">{project}</div>
                  <div className="text-slate-400 text-sm">Last opened 2 days ago</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            Your data is encrypted and stored locally on your device
          </p>
        </div>
      </div>
    </div>
  );
}
