import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NotFound() {
  usePageTitle("404 — Not Found");
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        {/* Unplugged-cable glyph in tokenised colors. */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-6 text-signal-causal"
          aria-hidden="true"
        >
          <path
            d="M22 48 H40"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M56 48 H74"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M40 40 V56 H44 Q44 60 48 60 V36 Q44 36 44 40 Z"
            fill="currentColor"
            opacity="0.85"
          />
          <path
            d="M56 40 V56 H52 Q52 60 48 60"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.4"
          />
          <circle cx="14" cy="48" r="3" fill="currentColor" opacity="0.6" />
          <circle cx="82" cy="48" r="3" fill="currentColor" opacity="0.6" />
          <path
            d="M48 18 V28 M58 22 L66 14 M38 22 L30 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          404
        </p>
        <h1 className="mt-1 font-display text-3xl text-[var(--text-primary)]">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          The route you requested doesn&apos;t exist. The cable&apos;s come
          loose somewhere — let&apos;s plug you back into the home page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Return home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/chat">Try the live demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
