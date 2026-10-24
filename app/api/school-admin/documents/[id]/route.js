"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function PersonalPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("favorites");
  const [favorites, setFavorites] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [favoritesRes, historyRes] = await Promise.all([
        fetch("/api/student/favorites", { cache: "no-store" }),
        fetch("/api/student/history/reading", { cache: "no-store" }),
      ]);

      const [favoritesData, historyData] = await Promise.all([
        favoritesRes.json(),
        historyRes.json(),
      ]);

      if (!favoritesRes.ok || !favoritesData.success) {
        throw new Error(
          favoritesData.message || "Không thể tải tài liệu yêu thích."
        );
      }

      setFavorites(
        Array.isArray(favoritesData.data) ? favoritesData.data : []
      );

      if (historyRes.ok && historyData.success) {
        setReadingHistory(
          Array.isArray(historyData.data) ? historyData.data : []
        );
      } else {
        setReadingHistory([]);
        console.error(
          "Không thể tải lịch sử đọc:",
          historyData.message
        );
      }
    } catch (err) {
      console.error("Lỗi tải góc học tập:", err);
      setError(err.message || "Không thể tải dữ liệu học tập.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemoveFavorite = async (documentId) => {
    if (removingId !== null) return;

    setRemovingId(documentId);

    try {
      const response = await fetch("/api/student/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật yêu thích.");
      }

      setFavorites((current) =>
        current.filter(
          (item) => item.Document.DocumentId !== documentId
        )
      );

      toast.success(result.message || "Đã bỏ yêu thích tài liệu.");
    } catch (err) {
      console.error("Lỗi bỏ yêu thích:", err);
      toast.error(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Chưa có thông tin";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Chưa có thông tin";

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getProgress = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;

    return Math.min(100, Math.max(0, number));
  };

  const renderCover = (document) => (
    <div className="flex h-44 items-center justify-center overflow-hidden border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-100">
      {document.CoverImageUrl ? (
        <img
          src={document.CoverImageUrl}
          alt={document.Title || "Bìa tài liệu"}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="text-6xl" aria-hidden="true">
          📚
        </span>
      )}
    </div>
  );

  return (
    <main className="min-h-screen space-y-6 pb-10">
      {/* Tiêu đề */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-md md:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
            🎓 Không gian học tập cá nhân
          </span>

          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Góc học tập của tôi
          </h1>

          <p className="text-sm leading-relaxed text-blue-100">
            Quản lý tài liệu yêu thích, theo dõi tiến độ đọc và tiếp tục
            hành trình học tập của bạn.
          </p>

          <Link
            href="/student/documents"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            📖 Khám phá học liệu
          </Link>
        </div>

        <div
          className="pointer-events-none absolute -right-4 -top-8 text-[130px] opacity-15 md:right-8"
          aria-hidden="true"
        >
          🎓
        </div>
      </section>

      {/* Thống kê */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
              ❤️
            </div>
            <div>
              <p className="text-sm text-gray-500">Tài liệu yêu thích</p>
              <p className="text-2xl font-extrabold text-gray-800">
                {favorites.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              📖
            </div>
            <div>
              <p className="text-sm text-gray-500">Tài liệu đã đọc gần đây</p>
              <p className="text-2xl font-extrabold text-gray-800">
                {readingHistory.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tab điều hướng */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-gray-100 p-3 md:p-4">
          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "favorites"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ❤️ Yêu thích ({favorites.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📚 Lịch sử đọc ({readingHistory.length})
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="ml-auto rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "↻ Làm mới"}
          </button>
        </div>

        <div className="p-4 md:p-6">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
              <p className="font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Thử tải lại
              </button>
            </div>
          ) : activeTab === "favorites" ? (
            favorites.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mb-3 text-5xl">💝</div>
                <h2 className="font-bold text-gray-800">
                  Bạn chưa lưu tài liệu nào
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Hãy tìm tài liệu hữu ích và thêm vào danh sách yêu thích.
                </p>
                <Link
                  href="/student/documents"
                  className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Khám phá tài liệu
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((item) => {
                  const document = item.Document;

                  return (
                    <article
                      key={document.DocumentId}
                      className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                    >
                      {renderCover(document)}

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveFavorite(document.DocumentId)
                        }
                        disabled={removingId !== null}
                        aria-label={`Bỏ yêu thích ${document.Title}`}
                        title="Bỏ yêu thích"
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-100 bg-white/95 text-red-500 shadow-sm transition hover:scale-110 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === document.DocumentId
                          ? "…"
                          : "♥"}
                      </button>

                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            {document.DocumentType || "Học liệu"}
                          </span>
                          {document.PageCount && (
                            <span className="text-xs text-gray-400">
                              {document.PageCount} trang
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/student/documents/${document.DocumentId}`}
                          className="line-clamp-2 block min-h-10 text-sm font-bold leading-5 text-gray-800 transition hover:text-blue-600"
                        >
                          {document.Title}
                        </Link>

                        <p className="line-clamp-1 text-xs text-gray-500">
                          {document.Authors?.length
                            ? document.Authors.join(", ")
                            : "Chưa cập nhật tác giả"}
                        </p>

                        <p className="line-clamp-1 text-xs text-gray-500">
                          🏫 {document.School?.SchoolName || "Chưa rõ trường"}
                        </p>

                        <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
                          Đã lưu: {formatDate(item.SavedAt)}
                        </div>

                        <Link
                          href={`/student/documents/${document.DocumentId}`}
                          className="block rounded-xl bg-blue-50 px-3 py-2.5 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white"
                        >
                          Đọc tài liệu →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : readingHistory.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mb-3 text-5xl">📖</div>
              <h2 className="font-bold text-gray-800">
                Chưa có lịch sử đọc
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Khi bạn đọc tài liệu và hệ thống lưu tiến độ, dữ liệu sẽ xuất
                hiện tại đây.
              </p>
              <Link
                href="/student/documents"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Tìm tài liệu để đọc
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {readingHistory.map((item) => {
                const document = item.Document;
                const progress = getProgress(item.ProgressPercent);

                return (
                  <article
                    key={item.ReadingHistoryId}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 transition hover:border-blue-100 hover:shadow-sm sm:flex-row"
                  >
                    <Link
                      href={`/student/documents/${document.DocumentId}`}
                      className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 sm:w-28"
                    >
                      {document.CoverImageUrl ? (
                        <img
                          src={document.CoverImageUrl}
                          alt={document.Title || "Bìa tài liệu"}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-5xl">📘</span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <Link
                          href={`/student/documents/${document.DocumentId}`}
                          className="line-clamp-2 text-base font-bold text-gray-800 hover:text-blue-600"
                        >
                          {document.Title}
                        </Link>

                        <p className="mt-1 text-xs text-gray-500">
                          🏫 {document.School || "Chưa rõ trường"}
                        </p>
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-gray-600">
                            Trang {item.LastPage || 1}
                            {document.PageCount
                              ? ` / ${document.PageCount}`
                              : ""}
                          </span>
                          <span className="font-bold text-blue-600">
                            {progress}%
                          </span>
                        </div>

                        <div
                          className="h-2 overflow-hidden rounded-full bg-gray-100"
                          role="progressbar"
                          aria-label={`Tiến độ đọc ${document.Title}`}
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-gray-400">
                          Lần đọc gần nhất: {formatDate(item.LastReadAt)}
                        </p>

                        <Link
                          href={`/student/documents/${document.DocumentId}`}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                        >
                          Đọc tiếp →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
