import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-[auto_1fr] bg-bg-deep text-[var(--text-primary)] font-sans">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
