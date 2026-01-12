"use client";

export default function KnowledgeHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Knowledge base
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Knowledge management</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Choose how you want to manage your knowledge sources.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <a
          href="/dashboard/knowledge/text"
          className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(10,18,40,0.12)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Knowledge text
          </p>
          <h2 className="mt-3 text-xl font-semibold">Text sources</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Add, edit, or delete plain text knowledge snippets.
          </p>
        </a>
        <a
          href="/dashboard/knowledge/files"
          className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(10,18,40,0.12)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Knowledge files
          </p>
          <h2 className="mt-3 text-xl font-semibold">Document sources</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Upload and manage PDF, DOCX, or TXT files.
          </p>
        </a>
      </section>
    </div>
  );
}
