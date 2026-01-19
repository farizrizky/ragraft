"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import Notification from "@/components/Notification";

type OverviewPayload = {
  sessions: {
    day: number;
    week: number;
    month: number;
    total: number;
  };
  topQuestions: { text: string; count: number }[];
  topKeywords: { keyword: string; count: number }[];
};

function generateResetCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    tone: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetInput, setResetInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const notify = (tone: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ tone, message });
  };

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/analytics/overview");
      if (!response.ok) {
        throw new Error("Failed to load analytics.");
      }
      const data = (await response.json()) as OverviewPayload;
      setOverview(data);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Load failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const openReset = () => {
    setResetCode(generateResetCode());
    setResetInput("");
    setResetOpen(true);
  };

  const canReset = useMemo(
    () => resetInput.trim().toUpperCase() === resetCode,
    [resetInput, resetCode],
  );

  const handleReset = async () => {
    if (!canReset) {
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch("/api/analytics/reset", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to reset analytics.");
      }
      notify("success", "Analytics reset completed.");
      setResetOpen(false);
      await loadOverview();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Chat analytics
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Usage overview</h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Track public chat sessions and the most common questions and keywords.
        </p>
      </section>

      {notification ? (
        <Notification
          floating
          message={notification.message}
          tone={notification.tone}
          onDismiss={() => setNotification(null)}
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Sessions (24h)"
          value={isLoading ? "-" : String(overview?.sessions.day ?? 0)}
          trend="Last 24h"
        />
        <StatCard
          label="Sessions (7d)"
          value={isLoading ? "-" : String(overview?.sessions.week ?? 0)}
          trend="Last 7d"
        />
        <StatCard
          label="Sessions (30d)"
          value={isLoading ? "-" : String(overview?.sessions.month ?? 0)}
          trend="Last 30d"
        />
        <StatCard
          label="Total sessions"
          value={isLoading ? "-" : String(overview?.sessions.total ?? 0)}
          trend="All time"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top questions</h3>
            <a
              href="/dashboard/analytics"
              className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]"
            >
              View all
            </a>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {overview?.topQuestions?.length ? (
              overview.topQuestions.map((item) => (
                <div
                  key={item.text}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="text-[color:var(--foreground)]">
                    {item.text}
                  </span>
                  <span className="text-xs font-semibold text-[color:var(--muted)]">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[color:var(--muted)]">
                {isLoading ? "Loading..." : "No questions yet."}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Top keywords</h3>
            <a
              href="/dashboard/analytics"
              className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]"
            >
              View all
            </a>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {overview?.topKeywords?.length ? (
              overview.topKeywords.map((item) => (
                <div
                  key={item.keyword}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="text-[color:var(--foreground)]">
                    {item.keyword}
                  </span>
                  <span className="text-xs font-semibold text-[color:var(--muted)]">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[color:var(--muted)]">
                {isLoading ? "Loading..." : "No keywords yet."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Reset analytics</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Clears all stored session, question, and keyword data for your
              public chat.
            </p>
          </div>
          <button
            type="button"
            onClick={openReset}
            className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:text-red-700"
          >
            Reset data
          </button>
        </div>
      </section>

      {resetOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6 shadow-[0_24px_60px_rgba(10,18,40,0.3)]">
            <h3 className="text-lg font-semibold">Confirm reset</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Type the code below to confirm deletion of all analytics data.
            </p>
            <div className="mt-4 rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--background)] px-4 py-3 text-center text-lg font-semibold tracking-[0.3em]">
              {resetCode}
            </div>
            <input
              value={resetInput}
              onChange={(event) => setResetInput(event.target.value)}
              placeholder="Enter code"
              className="mt-4 w-full rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                disabled={isResetting}
                className="rounded-full border border-[color:var(--panel-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={!canReset || isResetting}
                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResetting ? "Resetting..." : "Confirm reset"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
