import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";

const App = () => (
  <main className="min-h-screen bg-bg-deep text-[var(--text-primary)] font-sans flex items-center justify-center p-8">
    <div className="max-w-xl text-center space-y-4">
      <h1 className="text-4xl font-display">GuardianAI</h1>
      <p className="text-[var(--text-secondary)]">
        Causal multi-agent runtime governance for LLM applications. Scaffolding
        is in place — pages and components arrive in Phase 4.
      </p>
      <code className="block font-mono text-sm text-[var(--text-tertiary)]">
        v0.1.0 · phase-0-scaffold
      </code>
    </div>
  </main>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
