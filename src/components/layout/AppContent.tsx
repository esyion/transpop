import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ViewMode } from "../../types/translation";

interface AppContentProps {
  view: ViewMode;
  translation: ReactNode;
  settings: ReactNode;
}

export function AppContent({ view, translation, settings }: AppContentProps) {
  return (
    <div className="app-content">
      <AnimatePresence mode="wait">
        {view === "translate" ? (
          <motion.div
            key="translate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            {translation}
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            {settings}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
