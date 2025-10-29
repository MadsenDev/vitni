import { motion, AnimatePresence } from 'framer-motion';

type SplashOverlayProps = {
  showing: boolean;
};

export function SplashOverlay({ showing }: SplashOverlayProps) {
  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-slate-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              className="text-3xl font-semibold tracking-tight"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              Private Investigation Graph Tool
            </motion.div>
            <motion.div
              className="h-5 w-5 rounded-full border-2 border-slate-500/40 border-t-sky-400"
              animate={{ rotate: 360 }}
              transition={{ ease: 'linear', duration: 1, repeat: Infinity }}
            />
            <div className="text-xs text-slate-400">Starting up…</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


