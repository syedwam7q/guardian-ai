import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ThemedToaster } from "@/components/ThemedToaster";
import { router } from "@/lib/router";
import { applyTheme, getStoredTheme } from "@/styles/themes";
import "./styles/tokens.css";
import "./styles/global.css";

applyTheme(getStoredTheme());
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ThemedToaster />
    </QueryClientProvider>
  </React.StrictMode>,
);
