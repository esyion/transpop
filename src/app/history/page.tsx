import type { Metadata } from "next";

import { HistoryView } from "@/components/history-view";

export const metadata: Metadata = {
  title: "翻译历史 - TransPop",
};

export default function HistoryPage() {
  return <HistoryView />;
}
