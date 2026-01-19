"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import Notification from "@/components/Notification";
import { useCallback, useEffect, useMemo, useState } from "react";

type KnowledgeTextItem = {
  id: string;
  title: string | null;
  tag: string | null;
  content: string;
  updatedAt: string;
};

type NotificationTone = "success" | "error" | "warning" | "info";

export default function KnowledgeTextPage() {
  const [items, setItems] = useState<KnowledgeTextItem[]>([]);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    tone: NotificationTone;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeTextItem | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const notify = useCallback((tone: NotificationTone, message: string) => {
    setNotification({ tone, message });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        const response = await fetch("/api/knowledge/text");
        if (!response.ok) {
          throw new Error("Failed to load knowledge.");
        }
        const data = (await response.json()) as { items?: KnowledgeTextItem[] };
        if (isMounted) {
          setItems(data.items ?? []);
        }
      } catch {
        if (isMounted) {
          notify("error", "Failed to load knowledge list.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [notify]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }
    return items.filter((item) => {
      const title = item.title?.toLowerCase() ?? "";
      const tag = item.tag?.toLowerCase() ?? "";
      const content = item.content.toLowerCase();
      return (
        title.includes(normalized) ||
        tag.includes(normalized) ||
        content.includes(normalized)
      );
    });
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const resetForm = () => {
    setTitle("");
    setTag("");
    setContent("");
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      notify("warning", "Please paste some text.");
      return;
    }

    setIsSaving(true);
    notify("info", editingId ? "Updating..." : "Saving...");

    try {
      const response = await fetch(
        editingId ? `/api/knowledge/text/${editingId}` : "/api/knowledge/text",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || undefined,
            tag: tag.trim() || undefined,
            content: trimmed,
          }),
        },
      );

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        throw new Error(error || "Failed to save knowledge.");
      }

      notify("success", editingId ? "Knowledge updated." : "Knowledge saved.");
      resetForm();

      const listResponse = await fetch("/api/knowledge/text");
      const listData = (await listResponse.json()) as {
        items?: KnowledgeTextItem[];
      };
      setItems(listData.items ?? []);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: KnowledgeTextItem) => {
    setEditingId(item.id);
    setTitle(item.title ?? "");
    setTag(item.tag ?? "");
    setContent(item.content);
    setNotification(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    notify("info", "Deleting...");
    try {
      const response = await fetch(`/api/knowledge/text/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        let message = "Failed to delete knowledge.";
        const errorText = await response.text();
        try {
          const payload = JSON.parse(errorText) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          } else if (errorText) {
            message = errorText;
          }
        } catch {
          if (errorText) {
            message = errorText;
          }
        }
        throw new Error(message);
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
      notify("success", "Knowledge deleted.");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Delete failed.",
      );
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const requestDelete = (item: KnowledgeTextItem) => {
    setPendingDelete(item);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Knowledge text
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Text knowledge</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Add, update, or remove text knowledge for the assistant.
        </p>
      </section>
      {notification ? (
        <Notification
          message={notification.message}
          tone={notification.tone}
          floating
          onDismiss={() => setNotification(null)}
        />
      ) : null}

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">
          {editingId ? "Edit text" : "Add text"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSaving}
              placeholder="Example: Product FAQ"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Tag
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              disabled={isSaving}
              placeholder="Example: onboarding"
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Description
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={isSaving}
              rows={6}
              placeholder="Paste knowledge here..."
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[color:var(--accent-1)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : editingId
                  ? "Update text"
                  : "Save text"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[color:var(--panel-border)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved text</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search text..."
            className="w-48 rounded-full border border-[color:var(--panel-border)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] outline-none transition focus:ring-2 focus:ring-[color:var(--ring)]"
          />
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--background)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Tag</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
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
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={5}>
                    No saved knowledge yet.
                  </td>
                </tr>
              ) : (
                pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-medium">
                      {item.title || "Untitled"}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {item.tag || "-"}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {item.content.length > 120
                        ? `${item.content.slice(0, 120)}...`
                        : item.content}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(item)}
                          disabled={isSaving || deletingId === item.id}
                          className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          <span>
            {filteredItems.length} result
            {filteredItems.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete knowledge?"
        description="This action will permanently remove the text knowledge."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        isBusy={Boolean(deletingId)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
