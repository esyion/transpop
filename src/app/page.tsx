import type { Metadata } from "next";

import { TranslationView } from "@/features/translation";

export const metadata: Metadata = {
  title: "TransPop",
};

export default function TranslatePage() {
  return <TranslationView />;
}
