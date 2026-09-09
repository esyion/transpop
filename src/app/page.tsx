import type { Metadata } from "next";

import { TranslationView } from "@/components/translation-view";

export const metadata: Metadata = {
  title: "TransPop",
};

export default function TranslatePage() {
  return <TranslationView />;
}
