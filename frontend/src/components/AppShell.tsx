import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUIStore } from "@/lib/store";

export function AppShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pushRecentNav = useUIStore((s) => s.pushRecentNav);

  // Close mobile sheet on route change.
  useEffect(() => {
    setMobileOpen(false);
    pushRecentNav(location.pathname);
  }, [location.pathname, setMobileOpen, pushRecentNav]);

  // VS Code-style Ctrl+B / Cmd+B toggles the sidebar (desktop).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        // Don't fight typing in inputs.
        const target = e.target as HTMLElement | null;
        if (target && /input|textarea|select/i.test(target.tagName)) return;
        e.preventDefault();
        toggleSidebar();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  return (
    <div className="grid h-screen grid-cols-1 bg-bg-deep text-[var(--text-primary)] font-sans lg:grid-cols-[auto_1fr]">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop sidebar (lg+) */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar in a Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary site navigation.
          </SheetDescription>
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      <div className="flex h-screen min-w-0 flex-col">
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto outline-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
