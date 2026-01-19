"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import Notification from "@/components/Notification";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type KnowledgeFileItem = {
  id: string;
  title: string | null;
  tag: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

type NotificationTone = "success" | "error" | "warning" | "info";

export default function KnowledgeFilesPage() {
  const [items, setItems] = useState<KnowledgeFileItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    tone: NotificationTone;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeFileItem | null>(
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        const response = await fetch("/api/knowledge/file");
        if (!response.ok) {
          throw new Error("Failed to load knowledge files.");
        }
        const data = (await response.json()) as { items?: KnowledgeFileItem[] };
        if (isMounted) {
          setItems(data.items ?? []);
        }
      } catch {
        if (isMounted) {
          notify("error", "Failed to load knowledge files.");
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
      const fileName = item.fileName.toLowerCase();
      return (
        title.includes(normalized) ||
        tag.includes(normalized) ||
        fileName.includes(normalized)
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

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      notify("warning", "Please select a file.");
      return;
    }

    setIsUploading(true);
    notify("info", "Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      if (tag.trim()) {
        formData.append("tag", tag.trim());
      }

      const response = await fetch("/api/knowledge/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload document.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            errorMessage = payload.error;
          }
        } catch {
          // Ignore JSON parse errors and fall back to default message.
        }
        throw new Error(errorMessage);
      }

      const payload = (await response.json()) as { item?: KnowledgeFileItem };

      notify("success", "Document uploaded.");
      setFile(null);
      setTitle("");
      setTag("");
      formRef.current?.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (payload.item) {
        setItems((prev) => [payload.item as KnowledgeFileItem, ...prev]);
      } else {
        const listResponse = await fetch("/api/knowledge/file");
        if (listResponse.ok) {
          const listData = (await listResponse.json()) as {
            items?: KnowledgeFileItem[];
          };
          setItems(listData.items ?? []);
        } else {
          notify("warning", "Upload succeeded, but refresh list failed.");
        }
      }
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const requestDelete = (item: KnowledgeFileItem) => {
    setPendingDelete(item);
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const { id } = pendingDelete;
    setDeletingId(id);
    notify("info", "Deleting...");
    try {
      const response = await fetch("/api/knowledge/file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        let message = "Failed to delete document.";
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
      notify("success", "Document deleted.");
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

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-gradient-to-br from-[#1f4bd8]/10 via-transparent to-[#3b82f6]/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Knowledge files
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Document knowledge</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--muted)]">
          Upload PDF, DOCX, or TXT documents to ground AI responses.
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
        <h2 className="text-lg font-semibold">Upload document</h2>
        <form
          ref={formRef}
          onSubmit={handleUpload}
          className="mt-4 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isUploading}
              placeholder="Example: Product brief Q4"
              className="w-full rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Tag
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              disabled={isUploading}
              placeholder="Example: onboarding"
              className="w-full rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium md:flex-1">
              File
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={isUploading}
                className="w-full text-sm text-[color:var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent-1)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className="rounded-full bg-[color:var(--accent-1)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved files</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files..."
            className="w-48 rounded-full border border-[color:var(--panel-border)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] outline-none transition focus:ring-2 focus:ring-[color:var(--ring)]"
          />
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--background)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Tag</th>
                <th className="px-4 py-3 font-semibold">File</th>
                <th className="px-4 py-3 font-semibold">Uploaded at</th>
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
                    No uploaded files yet.
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
                      {item.fileName}
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => requestDelete(item)}
                        disabled={isUploading || deletingId === item.id}
                        className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
                      </button>
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
        title="Delete document?"
        description="This action will permanently remove the document from your knowledge base."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        isBusy={Boolean(deletingId)}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
