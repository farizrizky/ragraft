import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardHeader() {
  return (
    <header className="border-b border-[color:var(--panel-border)] bg-[color:var(--panel)]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            AI POWERED CHATBOT
          </p>
          <h1 className="text-2xl font-semibold">RAGNARA</h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
