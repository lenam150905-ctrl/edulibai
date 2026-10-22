
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function StudentDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async (query = "") => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        limit: "50",
        page: "1",
      });

      if (query.trim()) params.set("search", query.trim());

      const response = await fetch(
        `/api/student/documents?${params.toString()}`,
        { credentials: "same-origin" }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Không tải được học liệu.");
      }

      const items = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.documents)
          ? result.data.documents
          : [];

      setDocuments(items);
    } catch (err) {
      console.error("Lỗi tải kho học liệu:", err);
      setError(err.message || "Không thể tải kho học liệu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function handleSearch(event) {
    event.preventDefault();
    setSearch(keyword.trim());
    loadDocuments(keyword.trim());
  }

  function getAuthors(doc) {
    const authors = doc.Authors ??
      doc.DocumentAuthor?.map((item) => item.Author) ??
      [];

    return authors
      .map((author) =>
        typeof author === "string"
          ? author
          : author?.FullName || author?.fullName || ""
      )
      .filter(Boolean)
      .join(", ");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/student"
          className="text-sm font-medium text-teal-700 hover:underline"
        >
          ← Trang chủ sinh viên
        </Link>

        <div className="mb-7 mt-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            EDUlib AI
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Kho học liệu liên trường
          </h1>
          <p className="mt-2 text-slate-600">
            Khám phá tài liệu học tập và nghiên cứu từ thư viện số.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-6 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Nhập tên sách, tài liệu..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            Tìm học liệu
          </button>
        </form>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {search ? `Kết quả: "${search}"` : "Tất cả học liệu"}
          </h2>
          <span className="text-sm text-slate-500">
            {documents.length} tài liệu
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500">
            Đang tải học liệu...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => loadDocuments(search)}
              className="mt-3 font-semibold text-teal-700 hover:underline"
            >
              Thử tải lại
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center">
            <p className="font-semibold text-slate-800">
              Chưa tìm thấy học liệu
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Thử từ khóa khác hoặc kiểm tra dữ liệu trong thư viện.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <article
                key={String(doc.DocumentId)}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-teal-50 to-amber-50">
                  {doc.CoverImageUrl ? (
                    <img
                      src={doc.CoverImageUrl}
                      alt={doc.Title || "Bìa tài liệu"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">📚</span>
                  )}
                </div>

                <div className="p-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {doc.DocumentType?.TypeName || "Chưa phân loại"}
                  </span>

                  <h3 className="mt-2 line-clamp-2 text-lg font-bold text-slate-900">
                    {doc.Title || "Chưa có tiêu đề"}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {getAuthors(doc) || "Chưa cập nhật tác giả"}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    {doc.School?.SchoolName || "Thư viện liên trường"}
                    {doc.PublicationYear
                      ? ` · ${doc.PublicationYear}`
                      : ""}
                  </p>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {doc.Description || "Chưa có mô tả cho tài liệu này."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
