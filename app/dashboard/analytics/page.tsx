"use client";

import { useEffect, useState } from "react";
import Notification from "@/components/Notification";

type QuestionItem = {
  text: string;
  count: number;
  lastAskedAt: string;
};

type KeywordItem = {
  keyword: string;
  count: number;
  lastUsedAt: string;
};

type PagedResponse<T> = {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
};

export default function AnalyticsPage() {
  const [questions, setQuestions] = useState<PagedResponse<QuestionItem> | null>(
    null,
  );
  const [keywords, setKeywords] = useState<PagedResponse<KeywordItem> | null>(
    null,
  );
  const [questionPage, setQuestionPage] = useState(1);
  const [keywordPage, setKeywordPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    tone: "success" | "error" | "warning" | "info";
  } | null>(null);

  const notify = (tone: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ tone, message });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [questionsRes, keywordsRes] = await Promise.all([
        fetch(`/api/analytics/questions?page=${questionPage}`),
        fetch(`/api/analytics/keywords?page=${keywordPage}`),
      ]);
      if (!questionsRes.ok || !keywordsRes.ok) {
        throw new Error("Failed to load analytics data.");
      }
      const questionsData = (await questionsRes.json()) as PagedResponse<QuestionItem>;
      const keywordsData = (await keywordsRes.json()) as PagedResponse<KeywordItem>;
      setQuestions(questionsData);
      setKeywords(keywordsData);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Load failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [questionPage, keywordPage]);

  const questionTotalPages = questions
    ? Math.max(1, Math.ceil(questions.total / questions.pageSize))
    : 1;
  const keywordTotalPages = keywords
    ? Math.max(1, Math.ceil(keywords.total / keywords.pageSize))
    : 1;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Analytics detail
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Questions & keywords</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Review the most frequent questions and keyword themes from public chat.
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top questions</h2>
          <button
            type="button"
            onClick={loadData}
            className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--background)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Question</th>
                <th className="px-4 py-3 font-semibold">Count</th>
                <th className="px-4 py-3 font-semibold">Last asked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={3}>
                    Loading...
                  </td>
                </tr>
              ) : questions?.items?.length ? (
                questions.items.map((item) => (
                  <tr key={item.text}>
                    <td className="px-4 py-4 font-medium">{item.text}</td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {item.count}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {new Date(item.lastAskedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={3}>
                    No questions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          <span>{questions?.total ?? 0} result(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuestionPage((prev) => Math.max(1, prev - 1))}
              disabled={questionPage === 1}
              className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Prev
            </button>
            <span>
              Page {questionPage} of {questionTotalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuestionPage((prev) => Math.min(questionTotalPages, prev + 1))
              }
              disabled={questionPage >= questionTotalPages}
              className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Top keywords</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--background)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Keyword</th>
                <th className="px-4 py-3 font-semibold">Count</th>
                <th className="px-4 py-3 font-semibold">Last used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={3}>
                    Loading...
                  </td>
                </tr>
              ) : keywords?.items?.length ? (
                keywords.items.map((item) => (
                  <tr key={item.keyword}>
                    <td className="px-4 py-4 font-medium">{item.keyword}</td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {item.count}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {new Date(item.lastUsedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={3}>
                    No keywords found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          <span>{keywords?.total ?? 0} result(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKeywordPage((prev) => Math.max(1, prev - 1))}
              disabled={keywordPage === 1}
              className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Prev
            </button>
            <span>
              Page {keywordPage} of {keywordTotalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setKeywordPage((prev) => Math.min(keywordTotalPages, prev + 1))
              }
              disabled={keywordPage >= keywordTotalPages}
              className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
