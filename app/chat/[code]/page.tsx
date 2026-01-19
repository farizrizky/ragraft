"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import ChatMessage from "@/components/ChatMessage";
import { Fraunces, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
});

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  createdAt: string;
};

type StreamSpeed = "INSTANT" | "SLOW" | "FAST" | "NORMAL";

const streamDelayBySpeed: Record<StreamSpeed, number> = {
  INSTANT: 0,
  FAST: 12,
  NORMAL: 24,
  SLOW: 45,
};

export default function PublicChatPage() {
  const params = useParams();
  const code = useMemo(() => {
    const raw = params?.code;
    if (Array.isArray(raw)) {
      return raw[0] ?? "";
    }
    return raw ?? "";
  }, [params]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [briefPrompt, setBriefPrompt] = useState<string | null>(null);
  const [openingLine, setOpeningLine] = useState<string | null>(null);
  const [streamSpeed, setStreamSpeed] = useState<StreamSpeed>("NORMAL");
  const [botName, setBotName] = useState("Assistant");
  const [description, setDescription] = useState("");
  const [chatLogoUrl, setChatLogoUrl] = useState("");
  const [headerColor, setHeaderColor] = useState("#1f4bd8");
  const [headerTextColor, setHeaderTextColor] = useState("#ffffff");
  const [error, setError] = useState<string | null>(null);
  const [typingVisible, setTypingVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const formatTime = (value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const resizeInput = () => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    let isMounted = true;
    async function loadPreference() {
      if (!code) {
        return;
      }
      try {
        const response = await fetch(`/api/public-chat/${code}`);
        if (!response.ok) {
          throw new Error("Chat not found.");
        }
        const data = (await response.json()) as {
          prompt?: string;
          openingMessage?: string;
          preference?: {
            streamSpeed?: StreamSpeed;
            name?: string;
            description?: string;
            chatLogoUrl?: string;
            headerColor?: string;
            headerTextColor?: string;
          };
        };
        if (isMounted) {
          setBriefPrompt(data.prompt ?? null);
          setOpeningLine(data.openingMessage ?? null);
          setStreamSpeed(data.preference?.streamSpeed ?? "NORMAL");
          setBotName(data.preference?.name?.trim() || "Assistant");
          setDescription(data.preference?.description?.trim() || "");
          setChatLogoUrl(data.preference?.chatLogoUrl?.trim() || "");
          setHeaderColor(data.preference?.headerColor?.trim() || "#1f4bd8");
          setHeaderTextColor(data.preference?.headerTextColor?.trim() || "#ffffff");
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load chat.");
        }
      }
    }

    loadPreference();

    return () => {
      isMounted = false;
    };
  }, [code]);

  useEffect(() => {
    resizeInput();
  }, [input]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const hadDark = html.classList.contains("dark");
    const hadLight = html.classList.contains("light");
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";
    html.classList.remove("dark");
    html.classList.add("light");
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
      if (hadDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
      if (hadLight) {
        html.classList.add("light");
      } else {
        html.classList.remove("light");
      }
    };
  }, []);

  useEffect(() => {
    if (!openingLine) {
      return;
    }
    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: "welcome",
            role: "ai",
            content: openingLine,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      if (prev[0]?.id === "welcome") {
        return [
          {
            id: "welcome",
            role: "ai",
            content: openingLine,
            createdAt: new Date().toISOString(),
          },
          ...prev.slice(1),
        ];
      }
      return prev;
    });
  }, [openingLine]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, typingVisible]);

  useEffect(() => {
    if (!isSending) {
      setTypingVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setTypingVisible(true);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [isSending]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending || !code) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const payloadMessages = [
        ...(briefPrompt ? [{ role: "system", content: briefPrompt }] : []),
        ...nextMessages.map((message) => ({
          role: message.role === "ai" ? "assistant" : "user",
          content: message.content,
        })),
      ];

      const response = await fetch(`/api/public-chat/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch AI response.");
      }

      const data = (await response.json()) as { text?: string };
      const reply = data.text?.trim() || "Maaf, belum ada balasan.";

      const delay = streamDelayBySpeed[streamSpeed];
      if (delay === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: reply,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        const messageId = `ai-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: messageId, role: "ai", content: "", createdAt: new Date().toISOString() },
        ]);

        let index = 0;
        const interval = setInterval(() => {
          index += 1;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === messageId
                ? { ...message, content: reply.slice(0, index) }
                : message,
            ),
          );
          if (index >= reply.length) {
            clearInterval(interval);
          }
        }, delay);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: "Terjadi masalah saat menghubungi AI.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setIsSending(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") {
      return;
    }
    if (event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    const form = event.currentTarget.form;
    if (form) {
      form.requestSubmit();
    }
  };

  const showBrandPanel = false;
  const showFooterBelowChat = !description;
  const isMultiline = input.includes("\n");

  const chatStyle = {
    "--chat-accent": headerColor,
    "--background": "#f2f6ff",
    "--foreground": "#0b1224",
    "--panel": "#ffffff",
    "--panel-border": "#dbe5f5",
    "--muted": "#42506b",
    "--accent-1": "#1f4bd8",
    "--accent-2": "#3b82f6",
    "--accent-3": "#0b1224",
    "--ring": "#2563eb",
    "--gradient-start": "#e8f0ff",
    "--gradient-mid": "#d9e7ff",
    "--gradient-end": "#f6f9ff",
    backgroundColor: "#f2f6ff",
    color: "#0b1224",
    colorScheme: "light",
  } as CSSProperties;

  return (
    <div
      className={`public-chat-bg light fixed inset-0 overflow-hidden text-[color:var(--foreground)] ${spaceGrotesk.className}`}
      style={chatStyle}
    >
      <div className="relative flex h-screen min-h-0 flex-col">
        <header
          className="w-full border-b border-[color:var(--panel-border)] md:border-b-0"
          style={{ backgroundColor: headerColor, color: headerTextColor }}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {chatLogoUrl ? (
                  <img
                    src={chatLogoUrl}
                    alt="Chat logo"
                    className="h-12 w-12 rounded-full border-4 border-white/50 object-cover shadow-sm"
                    style={{
                      boxShadow: `0 0 0 3px color-mix(in srgb, ${headerColor} 70%, transparent)`,
                    }}
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white/50 bg-white/20 text-xs font-semibold shadow-sm"
                    style={{
                      boxShadow: `0 0 0 3px color-mix(in srgb, ${headerColor} 70%, transparent)`,
                    }}
                  >
                    AI
                  </div>
                )}
                <span className="absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-full">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              </div>
              <div>
                <h1 className={`text-2xl font-semibold ${fraunces.className}`}>
                  {botName}
                </h1>
                {description ? (
                  <p className="mt-1 text-sm text-white/80">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="flex w-full flex-1 min-h-0 flex-col px-0 py-0 md:px-6 md:py-10">
          {showBrandPanel ? <section /> : null}

          <section className="flex w-full flex-1 min-h-0 flex-col bg-white md:max-w-3xl md:self-center md:bg-transparent">
            <div
              ref={scrollRef}
              className="modern-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6 pb-32 text-sm md:pb-6"
            >
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={
                    message.role === "user"
                      ? {
                          backgroundColor: headerColor,
                          color: headerTextColor,
                          ["--bubble-color" as const]: headerColor,
                        }
                      : { ["--bubble-color" as const]: "var(--panel)" }
                  }
                  className={
                    message.role === "user"
                      ? "ml-auto w-fit max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm"
                      : "mr-auto w-fit max-w-[75%] rounded-2xl rounded-tl-sm border border-[color:var(--panel-border)] bg-white px-4 py-3 text-[color:var(--foreground)] shadow-sm"
                  }
                >
                  <ChatMessage
                    content={message.content}
                    className={
                      message.role === "user"
                        ? "text-inherit prose-a:text-inherit prose-code:text-inherit"
                        : "text-[color:var(--foreground)] prose-a:text-[color:var(--accent-1)] prose-code:text-[color:var(--foreground)]"
                    }
                  />
                  <div className="mt-2 text-right text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              ))}
              {typingVisible ? (
                <div className="mr-auto w-fit max-w-[75%] rounded-2xl rounded-tl-sm border border-[color:var(--panel-border)] bg-white px-4 py-3 text-[color:var(--foreground)] shadow-sm">
                  <div className="flex items-center gap-2 text-[color:var(--muted)]">
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="text-xs font-semibold">{botName} is typing</p>
                  </div>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2 border-t border-[color:var(--panel-border)] bg-[color:var(--background)]/95 px-5 py-3 backdrop-blur md:static md:border-t-0 md:bg-transparent md:backdrop-blur-0"
            >
              <div className="relative flex w-full items-end md:mx-auto md:w-full md:max-w-3xl">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={isSending}
                  placeholder="Ketik pesan..."
                  rows={1}
                  className={
                    isMultiline
                      ? "w-full resize-none rounded-2xl border border-[color:var(--panel-border)] bg-white px-4 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                      : "w-full resize-none rounded-full border border-[color:var(--panel-border)] bg-white px-4 py-2 pr-12 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
                  }
                  style={{ minHeight: "44px", overflow: "hidden" }}
                />
                <button
                  type="submit"
                  aria-label="Kirim pesan"
                  disabled={isSending}
                  style={{ backgroundColor: headerColor, color: headerTextColor }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <p className="pt-2 text-center text-[10px] uppercase tracking-[0.35em] text-[color:var(--muted)] md:mx-auto md:w-full md:max-w-3xl">
                Generated by Ragnara
              </p>
            </form>
          </section>

          {showFooterBelowChat ? (
            <p className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Powered by Ragnara
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}
