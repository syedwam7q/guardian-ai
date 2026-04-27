import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import Audit from "@/pages/Audit";
import CausalExplorer from "@/pages/CausalExplorer";
import Chat from "@/pages/Chat";
import Console from "@/pages/Console";
import Deploy from "@/pages/Deploy";
import EvalBench from "@/pages/EvalBench";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/NotFound";
import Replay from "@/pages/Replay";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Landing /> },
      { path: "chat", element: <Chat /> },
      { path: "console", element: <Console /> },
      { path: "causal", element: <CausalExplorer /> },
      { path: "replay", element: <Replay /> },
      { path: "eval", element: <EvalBench /> },
      { path: "deploy", element: <Deploy /> },
      { path: "audit", element: <Audit /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
