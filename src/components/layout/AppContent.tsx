"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import type { ViewMode } from "@/types/translation";

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
  const reduceMotion = useReducedMotion();
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
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{
            duration: reduceMotion ? 0 : 0.14,
            ease: "easeOut",
          }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
