import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-display mb-2">404 — Not Found</h1>
      <p className="text-[var(--text-secondary)] mb-4">
        The page you requested does not exist.
      </p>
      <Link to="/" className="text-signal-causal hover:underline">
        Return home
      </Link>
    </div>
  );
}
