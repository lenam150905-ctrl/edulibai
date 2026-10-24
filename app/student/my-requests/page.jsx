"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/student/access-requests", {
        method: "GET",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error("Máy chủ không trả về dữ liệu JSON.");
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải danh sách yêu cầu."
        );
      }

      setRequests(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Lỗi tải yêu cầu mượn học liệu:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

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

  function getStatus(status) {
    const statuses = {
      PENDING: {
        label: "Chờ duyệt",
        className: "bg-amber-50 text-amber-700 ring-amber-200",
      },
      APPROVED: {
        label: "Đã duyệt",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      },
      REJECTED: {
        label: "Bị từ chối",
        className: "bg-red-50 text-red-700 ring-red-200",
      },
    };

    return (
      statuses[status] || {
        label: status || "Chưa xác định",
        className: "bg-slate-100 text-slate-600 ring-slate-200",
      }
    );
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
              Yêu cầu mượn học liệu
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Theo dõi các yêu cầu truy cập tài liệu thuộc trường khác.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "↻ Làm mới"}
          </button>
        </div>

        {!loading && !error && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Tổng yêu cầu",
                count: requests.length,
                color: "text-blue-600",
              },
              {
                label: "Chờ duyệt",
                count: requests.filter((item) => item.Status === "PENDING")
                  .length,
                color: "text-amber-600",
              },
              {
                label: "Đã duyệt",
                count: requests.filter((item) => item.Status === "APPROVED")
                  .length,
                color: "text-emerald-600",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className={`mt-1 text-3xl font-bold ${item.color}`}>
                  {item.count}
                </p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-slate-500">Đang tải danh sách yêu cầu...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="font-semibold text-red-600">
              Không thể tải yêu cầu mượn học liệu
            </p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={loadRequests}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mb-4 text-5xl" aria-hidden="true">
              📄
            </div>
            <h2 className="text-lg font-semibold">
              Bạn chưa gửi yêu cầu nào
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Khi bạn gửi yêu cầu truy cập tài liệu của trường khác, thông tin
              và trạng thái xét duyệt sẽ xuất hiện tại đây.
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
            {requests.map((item) => {
              const status = getStatus(item.Status);
              const doc = item.Document;
              const school = item.OwnerSchool;

              return (
                <article
                  key={item.AccessRequestId}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:p-5"
                >
                  <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:h-32 sm:w-24">
                    {doc?.CoverImageUrl ? (
                      <img
                        src={doc.CoverImageUrl}
                        alt={`Bìa ${doc.Title || "tài liệu"}`}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-4xl" aria-hidden="true">
                        📚
                      </span>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                          {doc?.DocumentCode || "Tài liệu"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold leading-snug">
                          {doc?.Title || "Chưa có tiêu đề"}
                        </h2>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-medium">Trường sở hữu:</span>{" "}
                      {school?.SchoolName || "Chưa có thông tin"}
                      {school?.SchoolCode ? ` (${school.SchoolCode})` : ""}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium">Lý do:</span>{" "}
                      {item.Reason || "Không có lý do"}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                      <p>Ngày gửi: {formatDate(item.CreatedAt)}</p>
                      {item.ReviewedAt && (
                        <p>Ngày xét duyệt: {formatDate(item.ReviewedAt)}</p>
                      )}
                      {item.ReviewedBy && (
                        <p>Người xét duyệt: {item.ReviewedBy}</p>
                      )}
                    </div>

                    {item.Status === "APPROVED" && (
                      <div className="mt-4">
                        <Link
                          href={`/student/documents/${doc?.DocumentId}`}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          Mở tài liệu <span className="ml-2" aria-hidden="true">→</span>
                        </Link>
                        <p className="mt-2 text-xs text-slate-500">
                          Quyền đọc thực tế vẫn được kiểm tra ở máy chủ.
                        </p>
                      </div>
                    )}
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
