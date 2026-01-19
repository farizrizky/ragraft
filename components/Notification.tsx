"use client";

import { useEffect, useRef, useState } from "react";

type NotificationTone = "success" | "error" | "warning" | "info";

type NotificationProps = {
  message: string;
  tone?: NotificationTone;
  floating?: boolean;
  durationMs?: number;
  onDismiss?: () => void;
};

const toneStyles: Record<NotificationTone, string> = {
  success: "text-emerald-700 dark:text-emerald-300",
  error: "text-red-700 dark:text-red-300",
  warning: "text-amber-700 dark:text-amber-300",
  info: "text-sky-700 dark:text-sky-300",
};

const EXIT_DURATION_MS = 250;

export default function Notification({
  message,
  tone = "info",
  floating = false,
  durationMs = 4000,
  onDismiss,
}: NotificationProps) {
  const [phase, setPhase] = useState<"entering" | "shown" | "exiting">(
    "entering",
  );
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPhase("entering");

    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    if (removeTimer.current) {
      clearTimeout(removeTimer.current);
    }

    const frame = requestAnimationFrame(() => {
      setPhase("shown");
    });

    if (durationMs > 0) {
      dismissTimer.current = setTimeout(() => {
        setPhase("exiting");
        removeTimer.current = setTimeout(() => {
          onDismiss?.();
        }, EXIT_DURATION_MS);
      }, durationMs);
    }

    return () => {
      cancelAnimationFrame(frame);
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
      if (removeTimer.current) {
        clearTimeout(removeTimer.current);
      }
    };
  }, [durationMs, message, onDismiss]);

  if (!message) {
    return null;
  }

  const layoutClass = floating
    ? "fixed bottom-6 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2"
    : "w-full";

  const visibilityClass =
    phase === "entering"
      ? "opacity-0 translate-y-2"
      : phase === "exiting"
        ? "opacity-0 translate-y-0"
        : "opacity-100 translate-y-0";

  const handleClose = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    setPhase("exiting");
    removeTimer.current = setTimeout(() => {
      onDismiss?.();
    }, EXIT_DURATION_MS);
  };

  return (
    <div className={layoutClass}>
      <div
        className={`flex items-start justify-between gap-4 rounded-lg border border-[color:var(--panel-border)] bg-[color:var(--panel)] px-4 py-3 text-sm font-medium text-[color:var(--foreground)] shadow-sm transition-all duration-[250ms] ${visibilityClass}`}
        role="status"
      >
        <span className={toneStyles[tone]}>{message}</span>
        {onDismiss ? (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Dismiss notification"
            className="rounded-full p-1 text-[color:var(--muted)] transition hover:opacity-80"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6l-12 12" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
