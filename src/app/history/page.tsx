import type { Metadata } from "next";

import { HistoryView } from "@/features/history";

export const metadata: Metadata = {
  title: "翻译历史 - TransPop",
};

export default function HistoryPage() {
  return <HistoryView />;
}
