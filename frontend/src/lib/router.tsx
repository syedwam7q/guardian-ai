import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RouteFallback } from "@/components/RouteFallback";

// Route-level code splitting — each page lands in its own chunk so the
// initial bundle stays slim. Landing is eager so first paint is instant.
import Landing from "@/pages/Landing";
const Chat = lazy(() => import("@/pages/Chat"));
const Console = lazy(() => import("@/pages/Console"));
const CausalExplorer = lazy(() => import("@/pages/CausalExplorer"));
const Replay = lazy(() => import("@/pages/Replay"));
const EvalBench = lazy(() => import("@/pages/EvalBench"));
const Deploy = lazy(() => import("@/pages/Deploy"));
const Audit = lazy(() => import("@/pages/Audit"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function lazyElement(node: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Landing /> },
      { path: "chat", element: lazyElement(<Chat />) },
      { path: "console", element: lazyElement(<Console />) },
      { path: "causal", element: lazyElement(<CausalExplorer />) },
      { path: "replay", element: lazyElement(<Replay />) },
      { path: "eval", element: lazyElement(<EvalBench />) },
      { path: "deploy", element: lazyElement(<Deploy />) },
      { path: "audit", element: lazyElement(<Audit />) },
      { path: "*", element: lazyElement(<NotFound />) },
    ],
  },
]);
