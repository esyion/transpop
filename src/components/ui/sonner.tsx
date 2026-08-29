"use client";

import { Toaster as SonnerToaster } from "sonner";

const Toaster = (props: React.ComponentProps<typeof SonnerToaster>) => {
  return <SonnerToaster richColors position="top-center" {...props} />;
};

export { Toaster };
