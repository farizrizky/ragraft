type NavItem = {
  label: string;
  href: string;
  icon: "overview" | "knowledge" | "chat" | "analytics" | "setup" | "rules";
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "overview" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  { label: "Knowledge", href: "/dashboard/knowledge", icon: "knowledge" },
  { label: "Chat Preferences", href: "/dashboard/chat-preferences", icon: "chat" },
  { label: "Rules", href: "/dashboard/rules", icon: "rules" },
  { label: "Setup", href: "/dashboard/setup", icon: "setup" },
];

function NavIcon({ name }: { name: NavItem["icon"] }) {
  if (name === "overview") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12h6v8H4zM14 4h6v16h-6zM11 4h2v16h-2z" />
      </svg>
    );
  }
  if (name === "knowledge") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h7a3 3 0 0 1 3 3v9H7a3 3 0 0 0-3 3V6Z" />
        <path d="M20 6h-7a3 3 0 0 0-3 3v9h7a3 3 0 0 1 3 3V6Z" />
      </svg>
    );
  }
  if (name === "chat") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a7 7 0 0 1-7 7H8l-5 3 2-5a7 7 0 0 1-1-5 7 7 0 0 1 7-7h3a7 7 0 0 1 7 7Z" />
      </svg>
    );
  }
  if (name === "analytics") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V9" />
        <path d="M16 15v-7" />
      </svg>
    );
  }
  if (name === "rules") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 6h10" />
        <path d="M8 12h10" />
        <path d="M8 18h10" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0-3.5-3.5 3.5 3.5 0 0 0 3.5 3.5Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.86l.03.04a2 2 0 0 1-2.83 2.83l-.04-.03A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.53V21a2 2 0 0 1-4 0v-.07A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.86.33l-.04.03a2 2 0 0 1-2.83-2.83l.03-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.53-1H3a2 2 0 0 1 0-4h.07A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.86l-.03-.04a2 2 0 0 1 2.83-2.83l.04.03A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.53V3a2 2 0 0 1 4 0v.07A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.86-.33l.04-.03a2 2 0 0 1 2.83 2.83l-.03.04A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.53 1H21a2 2 0 0 1 0 4h-.07A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

export default function DashboardNav() {
  return (
    <aside className="hidden w-56 flex-col gap-4 md:flex">
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Navigation
        </p>
        <nav className="mt-4 flex flex-col gap-2 text-sm font-medium">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[color:var(--foreground)] transition hover:bg-[color:var(--background)]"
            >
              <span className="text-[color:var(--muted)]">
                <NavIcon name={item.icon} />
              </span>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-4">
        <p className="text-sm font-semibold">Pulse Sync</p>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Nightly sync completes in 18 minutes. Next run at 02:00.
        </p>
      </div>
    </aside>
  );
}
