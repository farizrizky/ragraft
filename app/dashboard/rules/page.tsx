"use client";

import { useEffect, useState } from "react";
import Notification from "@/components/Notification";

type Rule = {
  id: string;
  phrase: string;
  response: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
};

const emptyForm = {
  phrase: "",
  response: "",
  enabled: true,
  priority: 0,
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    tone: "success" | "error" | "warning" | "info";
  } | null>(null);

  const notify = (tone: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ tone, message });
  };

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/rules");
      if (!response.ok) {
        throw new Error("Failed to load rules.");
      }
      const data = (await response.json()) as { rules?: Rule[] };
      setRules(data.rules ?? []);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Load failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = event.target;
    const checked =
      type === "checkbox"
        ? (event.target as HTMLInputElement).checked
        : undefined;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "priority"
            ? Number(value)
            : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (rule: Rule) => {
    setForm({
      phrase: rule.phrase,
      response: rule.response,
      enabled: rule.enabled,
      priority: rule.priority,
    });
    setEditingId(rule.id);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setNotification(null);

    try {
      const payload = {
        phrase: form.phrase,
        response: form.response,
        enabled: form.enabled,
        priority: form.priority,
      };

      const response = await fetch(
        editingId ? `/api/rules/${editingId}` : "/api/rules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        throw new Error(error || "Failed to save rule.");
      }

      await loadRules();
      resetForm();
      notify("success", editingId ? "Rule updated." : "Rule added.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        throw new Error(error || "Failed to delete rule.");
      }
      setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
      notify("success", "Rule deleted.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Delete failed.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Response rules
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Keyword routing rules</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          When a user message contains a phrase, the assistant will respond using the
          rule response. The first matched rule (by priority) wins.
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

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
            Trigger phrase (substring match)
            <input
              name="phrase"
              value={form.phrase}
              onChange={handleChange}
              disabled={isSaving}
              placeholder="Example: refund; return policy; cancel order"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="text-xs text-[color:var(--muted)]">
              Use a semicolon (;) to separate multiple phrases.
            </span>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
            Rule response (will be polished by LLM)
            <textarea
              name="response"
              value={form.response}
              onChange={handleChange}
              disabled={isSaving}
              rows={4}
              placeholder="Write the response that should be enforced."
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Priority (lower runs first)
            <input
              name="priority"
              type="number"
              value={form.priority}
              onChange={handleChange}
              disabled={isSaving}
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              name="enabled"
              type="checkbox"
              checked={form.enabled}
              onChange={handleChange}
              disabled={isSaving}
              className="h-4 w-4 accent-[color:var(--accent-1)]"
            />
            Enabled
          </label>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[color:var(--accent-1)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : editingId
                  ? "Update rule"
                  : "Add rule"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[color:var(--panel-border)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved rules</h2>
          <button
            type="button"
            onClick={loadRules}
            disabled={isLoading}
            className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--background)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Phrase(s)</th>
                <th className="px-4 py-3 font-semibold">Response</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={5}>
                    No rules yet.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-4 font-medium">{rule.phrase}</td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {rule.response}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {rule.priority}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(rule)}
                          className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rule.id)}
                          className="rounded-full border border-red-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 transition hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
