import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ViewMode } from "../../types/translation";

interface AppContentProps {
  view: ViewMode;
  translation: ReactNode;
  settings: ReactNode;
  history: ReactNode;
}

export function AppContent({
  view,
  translation,
  settings,
  history,
}: AppContentProps) {
  const content =
    view === "settings" ? settings : view === "history" ? history : translation;
  const key =
    view === "settings"
      ? "settings"
      : view === "history"
        ? "history"
        : "translate";

  return (
    <div className="app-content">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
