import {
  Activity,
  BarChart3,
  History,
  Home,
  MessageSquare,
  Network,
  Rocket,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/console", label: "Console", icon: Activity },
  { path: "/causal", label: "Causal", icon: Network },
  { path: "/replay", label: "Replay", icon: History },
  { path: "/eval", label: "Eval", icon: BarChart3 },
  { path: "/deploy", label: "Deploy", icon: Rocket },
  { path: "/audit", label: "Audit", icon: ShieldCheck },
];
