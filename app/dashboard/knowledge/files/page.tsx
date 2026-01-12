"use client";

import { useEffect, useState } from "react";

type KnowledgeFileItem = {
  id: string;
  title: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export default function KnowledgeFilesPage() {
  const [items, setItems] = useState<KnowledgeFileItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

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
          setStatus("Failed to load knowledge files.");
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
  }, []);

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus("Please select a file.");
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const response = await fetch("/api/knowledge/file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string };
        throw new Error(error || "Failed to upload document.");
      }

      setStatus("Document uploaded.");
      setFile(null);
      setTitle("");
      (event.currentTarget as HTMLFormElement).reset();

      const listResponse = await fetch("/api/knowledge/file");
      const listData = (await listResponse.json()) as { items?: KnowledgeFileItem[] };
      setItems(listData.items ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setStatus(null);
    try {
      const response = await fetch("/api/knowledge/file", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete document.");
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setStatus("Document deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
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

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Upload document</h2>
        <form onSubmit={handleUpload} className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isUploading}
                placeholder="Example: Product brief Q4"
                className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              File
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={isUploading}
                className="text-sm text-[color:var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent-1)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
            </label>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-full bg-[color:var(--accent-1)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
            {status ? (
              <span className="ml-3 text-xs font-semibold text-[color:var(--muted)]">
                {status}
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)] p-6">
        <h2 className="text-lg font-semibold">Saved files</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[color:var(--background)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">File</th>
                <th className="px-4 py-3 font-semibold">Uploaded at</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-[color:var(--muted)]" colSpan={4}>
                    No uploaded files yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 font-medium">
                      {item.title || "Untitled"}
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
                        onClick={() => handleDelete(item.id)}
                        className="rounded-full border border-[color:var(--panel-border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
                      >
                        Delete
                      </button>
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
