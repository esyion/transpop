import type { Metadata } from "next";

import { SettingsView } from "@/features/settings";

export const metadata: Metadata = {
  title: "设置 - TransPop",
};

export default function SettingsPage() {
  return <SettingsView />;
}
