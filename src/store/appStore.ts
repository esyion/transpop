import { create } from "zustand";
import type { HistoryItem, TranslationResult, TranslationSettings, ViewMode } from "../types/translation";
import { DEFAULT_SETTINGS } from "../utils/constants";

interface AppState {
  input: string;
  result: TranslationResult | null;
  loading: boolean;
  error: string | null;
  history: HistoryItem[];
  settings: TranslationSettings;
  view: ViewMode;
  setInput: (input: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResult: (input: string, result: TranslationResult) => void;
  updateSettings: (settings: Partial<TranslationSettings>) => void;
  clearResult: () => void;
  setView: (view: ViewMode) => void;
  useHistoryItem: (item: HistoryItem) => void;
  setSettings: (settings: TranslationSettings) => void;
}

const MAX_HISTORY = 100;

export const useAppStore = create<AppState>((set) => ({
  input: "",
  result: null,
  loading: false,
  error: null,
  history: [],
  settings: DEFAULT_SETTINGS,
  view: "translate",
  setInput: (input) => set({ input }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setResult: (input, result) =>
    set((state) => ({
      result,
      error: null,
      history: [
        {
          id: crypto.randomUUID(),
          input,
          output: result.result,
          sourceLanguage: String(result.sourceLanguage),
          targetLanguage: String(result.targetLanguage),
          createdAt: Date.now(),
        },
        ...state.history,
      ].slice(0, MAX_HISTORY),
    })),
  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  clearResult: () => set({ result: null, error: null }),
  setView: (view) => set({ view }),
  useHistoryItem: (item) =>
    set({
      input: item.input,
      result: {
        sourceLanguage: item.sourceLanguage,
        targetLanguage: item.targetLanguage,
        result: item.output,
      },
      error: null,
      view: "translate",
    }),
  setSettings: (settings) => set({ settings }),
}));
