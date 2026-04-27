import { Toaster } from "sonner";
import { useUIStore } from "@/lib/store";

export function ThemedToaster() {
  const theme = useUIStore((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}
