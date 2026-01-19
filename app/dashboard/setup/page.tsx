"use client";

import { useEffect, useState } from "react";

const providerOptions = [
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "mistral", label: "Mistral" },
  { value: "custom", label: "Custom" },
];

const defaultForm = {
  provider: "groq",
  model: "llama-3.1-8b-instant",
  aiApiKey: "",
  supermemoryApiKey: "",
  routingProvider: "",
  routingModel: "",
  routingApiKey: "",
};

type TestResults = {
  ai: { ok: boolean; message: string };
  supermemory: { ok: boolean; message: string };
  routing: { ok: boolean; message: string };
};

export default function SetupPage() {
  const [form, setForm] = useState(defaultForm);
  const [hasAiKey, setHasAiKey] = useState(false);
  const [hasSupermemoryKey, setHasSupermemoryKey] = useState(false);
  const [hasRoutingKey, setHasRoutingKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<TestResults | null>(null);
  const [activeTab, setActiveTab] = useState<"answer" | "routing">("answer");

  const statusItems = [
    { label: "Answer model", result: results?.ai },
    { label: "Routing model", result: results?.routing },
    { label: "Supermemory", result: results?.supermemory },
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/setup");
        if (!response.ok) {
          throw new Error("Failed to load setup.");
        }
        const data = (await response.json()) as {
          setting?: typeof defaultForm | null;
          hasAiKey?: boolean;
          hasSupermemoryKey?: boolean;
          hasRoutingKey?: boolean;
        };

        if (isMounted && data.setting) {
          setForm({
            provider: data.setting.provider ?? "groq",
            model: data.setting.model ?? "llama-3.1-8b-instant",
            aiApiKey: "",
            supermemoryApiKey: "",
            routingProvider: data.setting.routingProvider ?? "",
            routingModel: data.setting.routingModel ?? "",
            routingApiKey: "",
          });
          setHasAiKey(Boolean(data.hasAiKey));
          setHasSupermemoryKey(Boolean(data.hasSupermemoryKey));
          setHasRoutingKey(Boolean(data.hasRoutingKey));
        }
      } catch {
        if (isMounted) {
          setStatus("Unable to load setup.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        throw new Error(error || "Failed to save setup.");
      }

      const data = (await response.json()) as {
        hasAiKey?: boolean;
        hasSupermemoryKey?: boolean;
        hasRoutingKey?: boolean;
      };

      setHasAiKey(Boolean(data.hasAiKey) || hasAiKey || Boolean(form.aiApiKey));
      setHasSupermemoryKey(
        Boolean(data.hasSupermemoryKey) || hasSupermemoryKey || Boolean(form.supermemoryApiKey),
      );
      setHasRoutingKey(Boolean(data.hasRoutingKey) || hasRoutingKey || Boolean(form.routingApiKey));
      setForm((prev) => ({
        ...prev,
        aiApiKey: "",
        supermemoryApiKey: "",
        routingApiKey: "",
      }));
      setStatus("Setup saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save setup.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setStatus(null);
    setLogs(["Running tests..."]);
    setResults(null);

    try {
      const response = await fetch("/api/setup/test", {
        method: "POST",
      });

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        throw new Error(error || "Test failed.");
      }

      const data = (await response.json()) as {
        results: TestResults;
        logs: string[];
      };

      setLogs(data.logs);
      setResults(data.results);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        error instanceof Error ? error.message : "Test failed.",
      ]);
      setResults({
        ai: { ok: false, message: "Test failed." },
        supermemory: { ok: false, message: "Test failed." },
        routing: { ok: false, message: "Test failed." },
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Setup
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Provider configuration</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Configure the inference provider, model, and API keys. Keys are encrypted before
          storage.
        </p>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          <button
            type="button"
            onClick={() => setActiveTab("answer")}
            className={
              activeTab === "answer"
                ? "rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel)] px-4 py-2 text-[color:var(--foreground)] shadow-sm"
                : "rounded-full border border-[color:var(--panel-border)] px-4 py-2 transition hover:text-[color:var(--foreground)]"
            }
          >
            Answer Model &amp; Supermemory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("routing")}
            className={
              activeTab === "routing"
                ? "rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel)] px-4 py-2 text-[color:var(--foreground)] shadow-sm"
                : "rounded-full border border-[color:var(--panel-border)] px-4 py-2 transition hover:text-[color:var(--foreground)]"
            }
          >
            Routing Model
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-6 grid gap-4 md:grid-cols-2">
          {activeTab === "answer" ? (
            <>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Provider
                <select
                  name="provider"
                  value={form.provider}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Model
                <input
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  placeholder="Example: llama-3.1-8b-instant"
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="text-xs text-[color:var(--muted)]">
                  Avoid typos: model IDs are sensitive and will affect connectivity.
                </p>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                Provider API Key
                <input
                  name="aiApiKey"
                  type="password"
                  value={form.aiApiKey}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  placeholder={hasAiKey ? "Stored. Enter a new key to replace." : "Enter API key"}
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                Supermemory API Key
                <input
                  name="supermemoryApiKey"
                  type="password"
                  value={form.supermemoryApiKey}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  placeholder={
                    hasSupermemoryKey ? "Stored. Enter a new key to replace." : "Enter API key"
                  }
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Routing Provider
                <select
                  name="routingProvider"
                  value={form.routingProvider}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Use answering provider</option>
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Routing Model
                <input
                  name="routingModel"
                  value={form.routingModel}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  placeholder="Leave empty to use answering model"
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                Routing API Key
                <input
                  name="routingApiKey"
                  type="password"
                  value={form.routingApiKey}
                  onChange={handleChange}
                  disabled={isLoading || isSaving}
                  placeholder={
                    hasRoutingKey
                      ? "Stored. Enter a new key to replace, or leave empty to use answer model."
                      : "Leave empty to use answer model"
                  }
                  className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </>
          )}

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isLoading || isSaving}
              className="rounded-full bg-[color:var(--accent-1)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save setup"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={isLoading || isSaving || isTesting}
              className="rounded-full border border-[color:var(--panel-border)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTesting ? "Testing..." : "Test connections"}
            </button>
            {status ? (
              <span className="text-xs font-semibold text-[color:var(--muted)]">{status}</span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[#0b1220] p-6 text-xs text-white">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            Console
          </p>
          <span className="text-[11px] text-white/50">
            Connection logs
          </span>
        </div>
        <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
          {statusItems.map((item) => {
            const status = item.result?.ok === true
              ? "OK"
              : item.result?.ok === false
                ? "Fail"
                : "Not tested";
            const tone =
              status === "OK"
                ? "text-emerald-300"
                : status === "Fail"
                  ? "text-red-300"
                  : "text-white/60";
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="uppercase tracking-[0.2em] text-white/50">
                  {item.label}
                </p>
                <p className={`mt-2 text-sm font-semibold ${tone}`}>
                  {status}
                </p>
                <p className="mt-1 text-white/60">
                  {item.result?.message ?? "Run a test to see details."}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 space-y-1 font-mono">
          {logs.length === 0 ? (
            <p className="text-white/60">Run a test to see connection logs.</p>
          ) : (
            logs.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
          )}
        </div>
      </section>
    </div>
  );
}
