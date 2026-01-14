import type { ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-landing text-[color:var(--foreground)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Ragnara
          </p>
          <h1 className="text-xl font-semibold">Landing</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link
            className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            href="/landingpage"
          >
            Home
          </Link>
          <Link
            className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</main>
    </div>
  );
}
