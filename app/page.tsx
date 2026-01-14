import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-landing px-6 text-[color:var(--foreground)]">
      <main className="w-full max-w-3xl rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)]/90 p-10 text-center shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Ragnara workspace
        </p>
        <h1 className="mt-4 text-3xl font-semibold">
          Choose your next stop.
        </h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Landing and dashboard are ready as separate routes with shared theming.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="rounded-full bg-[color:var(--accent-1)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            href="/landingpage"
          >
            Go to landing
          </Link>
          <Link
            className="rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:shadow-md"
            href="/dashboard"
          >
            Open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
