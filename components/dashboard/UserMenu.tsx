"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "U";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function UserMenu() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const displayName = data?.user?.name || data?.user?.email || "User";
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!data?.user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--accent-1)] text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="max-w-[140px] truncate">{displayName}</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] shadow-[0_20px_40px_rgba(10,18,40,0.18)]">
          <div className="px-4 py-3 text-xs font-semibold text-[color:var(--muted)]">
            Signed in as
            <div className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
              {displayName}
            </div>
          </div>
          <div className="border-t border-[color:var(--panel-border)]">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/sovereign" })}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
