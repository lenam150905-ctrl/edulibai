"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function MyLibraryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/student/history/reading", {
        method: "GET",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("Máy chủ không trả về dữ liệu JSON.");
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải lịch sử đọc.");
      }

      const data = Array.isArray(result.data) ? result.data : [];
      setHistory(data);
    } catch (err) {
      console.error("Lỗi tải lịch sử đọc:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải lịch sử đọc.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function formatDate(value) {
    if (!value) return "Chưa có thông tin";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Chưa có thông tin";

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/student/documents"
              className="mb-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <span aria-hidden="true">←</span>
              Quay lại kho tài liệu
            </Link>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Lịch sử đọc
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Theo dõi tài liệu bạn đã đọc và tiếp tục từ vị trí gần nhất.
            </p>
          </div>

          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "↻ Làm mới"}
          </button>
        </div>

        {!loading && !error && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Tài liệu đã đọc</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">
              {history.length}
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-slate-500">Đang tải lịch sử đọc...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="font-semibold text-red-600">
              Không thể tải lịch sử đọc
            </p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={loadHistory}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-4 text-5xl" aria-hidden="true">
              📚
            </div>
            <h2 className="text-lg font-semibold">
              Bạn chưa có lịch sử đọc
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Khi mở và đọc tài liệu, lịch sử đọc sẽ xuất hiện tại đây.
            </p>
            <Link
              href="/student/documents"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Khám phá tài liệu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => {
              const doc = item.Document;
              if (!doc) return null;

              const progress = Math.max(
                0,
                Math.min(100, Number(item.ProgressPercent) || 0)
              );

              return (
                <article
                  key={item.ReadingHistoryId || doc.DocumentId || index}
                  className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:p-5"
                >
                  <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:w-28">
                    {doc.CoverImageUrl ? (
                      <img
                        src={doc.CoverImageUrl}
                        alt={`Bìa tài liệu ${doc.Title}`}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-4xl" aria-hidden="true">
                        📖
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                          {doc.DocumentCode || "Tài liệu"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold leading-snug">
                          {doc.Title || "Chưa có tiêu đề"}
                        </h2>
                      </div>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {progress}% hoàn thành
                      </span>
                    </div>

                    {doc.Authors?.length > 0 && (
                      <p className="mt-2 text-sm text-slate-600">
                        Tác giả: {doc.Authors.join(", ")}
                      </p>
                    )}

                    {doc.School && (
                      <p className="mt-1 text-sm text-slate-500">
                        Đơn vị: {doc.School}
                      </p>
                    )}

                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-xs text-slate-500">
                        <span>
                          Trang {item.LastPage || 0}
                          {doc.PageCount ? ` / ${doc.PageCount}` : ""}
                        </span>
                        <span>{formatDate(item.LastReadAt)}</span>
                      </div>

                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-label={`Tiến độ đọc ${doc.Title}`}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/student/documents/${doc.DocumentId}`}
                        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Đọc tiếp <span className="ml-2" aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}