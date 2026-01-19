"use client";

import { useEffect, useState } from "react";

const speedOptions = [
  { value: "INSTANT", label: "Instant" },
  { value: "SLOW", label: "Slow" },
  { value: "FAST", label: "Fast" },
  { value: "NORMAL", label: "Normal" },
];

const minTemperature = 0;
const maxTemperature = 0.8;

const defaultForm = {
  name: "",
  tone: "",
  description: "",
  chatLogoUrl: "",
  headerColor: "#1f4bd8",
  headerTextColor: "#ffffff",
  streamSpeed: "NORMAL",
  openingLine: "",
  temperature: 0.4,
  developerMode: false,
  maxOutputTokens: 0,
  historyMessageLimit: 0,
  ragMaxChunks: 0,
  ragChunkMaxChars: 0,
  ragMaxContextChars: 0,
};

export default function ChatPreferencesPage() {
  const [form, setForm] = useState(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const embedCode = "48470508";

  useEffect(() => {
    let isMounted = true;

    async function loadPreference() {
      try {
        const response = await fetch("/api/chat-preferences");
        if (!response.ok) {
          throw new Error("Failed to load preferences.");
        }
        const data = (await response.json()) as {
          preference?: (typeof defaultForm & { publicCode?: string | null }) | null;
        };

        if (data.preference && isMounted) {
          setForm({
            name: data.preference.name ?? "",
            tone: data.preference.tone ?? "",
            description: data.preference.description ?? "",
            chatLogoUrl: data.preference.chatLogoUrl ?? "",
            headerColor: data.preference.headerColor ?? "#1f4bd8",
            headerTextColor: data.preference.headerTextColor ?? "#ffffff",
            streamSpeed: data.preference.streamSpeed ?? "NORMAL",
            openingLine: data.preference.openingLine ?? "",
            temperature: data.preference.temperature ?? 0.4,
            developerMode: data.preference.developerMode ?? false,
            maxOutputTokens: data.preference.maxOutputTokens ?? 0,
            historyMessageLimit: data.preference.historyMessageLimit ?? 0,
            ragMaxChunks: data.preference.ragMaxChunks ?? 0,
            ragChunkMaxChars: data.preference.ragChunkMaxChars ?? 0,
            ragMaxContextChars: data.preference.ragMaxContextChars ?? 0,
          });
          setPublicCode(data.preference.publicCode ?? null);
        }
      } catch {
        if (isMounted) {
          setStatus("Unable to load preferences.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPreference();

    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : name === "temperature" ||
              name === "maxOutputTokens" ||
              name === "historyMessageLimit" ||
              name === "ragMaxChunks" ||
              name === "ragChunkMaxChars" ||
              name === "ragMaxContextChars"
            ? Number(value)
            : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/chat-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences.");
      }

      const data = (await response.json()) as {
        preference?: { publicCode?: string | null };
      };
      setPublicCode(data.preference?.publicCode ?? publicCode);
      setStatus("Preferences saved.");
    } catch {
      setStatus("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Chat preferences
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Chat Configuration</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Define the assistant personality, opening line, temperature, and streaming tempo.
        </p>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <form
          id="chat-preferences-form"
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-2"
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="Example: Atlas"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Language Style
            <input
              name="tone"
              value={form.tone}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="Example: Warm, concise, confident"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Stream Speed
            <select
              name="streamSpeed"
              value={form.streamSpeed}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {speedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Temperature
            <input
              name="temperature"
              type="range"
              min={minTemperature}
              max={maxTemperature}
              step={0.1}
              value={form.temperature}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              className="accent-[color:var(--accent-1)]"
            />
            <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
              <span>{form.temperature.toFixed(1)}</span>
              <span>{minTemperature.toFixed(1)} - {maxTemperature.toFixed(1)}</span>
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              Lower values keep replies focused and consistent. Higher values add creativity, but can reduce accuracy.
            </p>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
            Opening Line
            <textarea
              name="openingLine"
              value={form.openingLine}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              rows={4}
              placeholder="Example: Hi! I can help summarize campaign updates."
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Max Answer Tokens
            <input
              name="maxOutputTokens"
              type="number"
              min={0}
              value={form.maxOutputTokens}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="0"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-[color:var(--muted)]">
              Set 0 to use the provider default.
            </p>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Context Messages Limit
            <input
              name="historyMessageLimit"
              type="number"
              min={0}
              value={form.historyMessageLimit}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="0"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-[color:var(--muted)]">
              Limits how many recent messages are sent back for context. Set 0 for no limit.
            </p>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            RAG Max Chunks
            <input
              name="ragMaxChunks"
              type="number"
              min={0}
              value={form.ragMaxChunks}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="0"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-[color:var(--muted)]">
              Limits how many knowledge chunks are added. Set 0 for default.
            </p>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            RAG Chunk Max Characters
            <input
              name="ragChunkMaxChars"
              type="number"
              min={0}
              value={form.ragChunkMaxChars}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="0"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-[color:var(--muted)]">
              Truncates each chunk to this length. Set 0 for default.
            </p>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            RAG Total Context Max Characters
            <input
              name="ragMaxContextChars"
              type="number"
              min={0}
              value={form.ragMaxContextChars}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="0"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-[color:var(--muted)]">
              Caps the total length of all chunks combined. Set 0 for default.
            </p>
          </label>

        </form>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Customize logos and header colors for your public chat page.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Description
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="Describe what the assistant does."
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Chat Avatar URL
            <input
              name="chatLogoUrl"
              value={form.chatLogoUrl}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              placeholder="https://example.com/avatar.png"
              className="w-full rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Chat Header Color
            <input
              name="headerColor"
              type="color"
              value={form.headerColor}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              className="h-10 w-full cursor-pointer rounded-xl border border-[color:var(--panel-border)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Header Font Color
            <input
              name="headerTextColor"
              type="color"
              value={form.headerTextColor}
              onChange={handleChange}
              disabled={isLoading || isSaving}
              className="h-10 w-full cursor-pointer rounded-xl border border-[color:var(--panel-border)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Developer Mode</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Enable server-side logging for public chat requests.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium">
          <input
            name="developerMode"
            type="checkbox"
            checked={form.developerMode}
            onChange={handleChange}
            disabled={isLoading || isSaving}
            className="h-4 w-4 accent-[color:var(--accent-1)]"
          />
          Enable developer logs
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          form="chat-preferences-form"
          disabled={isLoading || isSaving}
          className="rounded-full bg-[color:var(--accent-1)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save preferences"}
        </button>
        {status ? (
          <span className="text-xs font-semibold text-[color:var(--muted)]">
            {status}
          </span>
        ) : null}
      </div>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Public chat link</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Share this link publicly to allow anyone to chat with your assistant.
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            URL
          </span>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--background)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]">
        {publicCode && origin ? `${origin}/chat/${publicCode}` : "Loading..."}
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!publicCode || !origin) {
                  return;
                }
                try {
                  await navigator.clipboard.writeText(
                    `${origin}/chat/${publicCode}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  setCopied(false);
                }
              }}
              className="rounded-full border border-[color:var(--panel-border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Embed widget</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Use this script to embed the chat widget on your website.
        </p>
        <div className="mt-4 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--background)] p-4 text-xs">
          <pre className="whitespace-pre-wrap break-words font-mono text-[color:var(--foreground)]">
{`<script
  src="${origin ? `${origin}/ragnara-chat.js` : "https://YOUR-DOMAIN.com/ragnara-chat.js"}"
  data-code="${embedCode}"
  data-position="bottom-right"
  data-width="380px"
  data-height="620px"
  data-button-text="Chat"
></script>`}
          </pre>
        </div>
      </section>
    </div>
  );
}
