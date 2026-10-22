"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function StudentDashboard() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [readingHistory, setReadingHistory] = useState([]);
  const [user, setUser] = useState(null);


useEffect(() => {
  async function loadDashboardData() {
    try {
      setLoading(true);

      const requests = [
        ["/api/auth/me", "Thông tin người dùng"],
        ["/api/student/documents?limit=8", "Danh sách học liệu"],
        ["/api/student/history/reading", "Lịch sử đọc"],
      ];

      const results = await Promise.all(
        requests.map(async ([url, label]) => {
          const response = await fetch(url);
          const contentType = response.headers.get("content-type") || "";

          if (!contentType.includes("application/json")) {
            const body = await response.text();

            console.error(
              `${label}: API không trả JSON`,
              url,
              response.status,
              body.slice(0, 200)
            );

            throw new Error(`${label} trả về dữ liệu không phải JSON.`);
          }

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.message || `${label} lỗi HTTP ${response.status}`
            );
          }

          return data;
        })
      );

      const [meRes, docRes, historyRes] = results;

      if (meRes.success) {
        setUser(meRes.user);
      }

      if (docRes.success) {
        // API danh sách trả data là mảng
        setDocuments(
          Array.isArray(docRes.data)
            ? docRes.data
            : Array.isArray(docRes.data?.documents)
              ? docRes.data.documents
              : []
        );
      }

      if (historyRes.success) {
        setReadingHistory(
          Array.isArray(historyRes.data)
            ? historyRes.data
            : Array.isArray(historyRes.data?.history)
              ? historyRes.data.history
              : []
        );
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu dashboard sinh viên:", err);
    } finally {
      setLoading(false);
    }
  }

  loadDashboardData();
}, []);

  // Xử lý nút bấm Yêu thích (Bookmark)
  const handleToggleFavorite = async (docId) => {
    try {
      const res = await fetch("/api/student/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Không thể thực hiện.");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ.");
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. KHỐI HERO BANNER CHÀO MỪNG */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-lime-500 to-lime-600 text-white p-8 shadow-md">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/20">
            👋 Chào mừng trở lại, {user?.FullName || "Sinh viên"}!
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Kho thư viện số liên trường & Trợ lý học tập AI
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Tra cứu giáo trình, bài giảng và tài liệu học tập từ mạng lưới các trường đại học liên kết. Sử dụng AI để tóm tắt và trích xuất kiến thức nhanh chóng.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/student/ai-assistant"
              className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
            >
              <span>🤖</span> Trò chuyện với RAG AI
            </Link>
            <Link
              href="/student/documents"
              className="px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 border border-white/20 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2"
            >
              <span>📚</span> Khám phá toàn bộ học liệu
            </Link>
          </div>
        </div>
        {/* Họa tiết trang trí */}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-15 pointer-events-none flex items-center justify-center text-9xl">
          📖
        </div>
      </div>

      {/* 2. TIẾP TỤC ĐỌC (NẾU CÓ LỊCH SỬ ĐỌC GẦN ĐÂY) */}
      {readingHistory.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>📖</span> Tiếp tục đọc gần đây
            </h2>
            <Link href="/student/my-library" className="text-xs font-bold text-blue-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readingHistory.slice(0, 3).map((item) => (
              <div
                key={item.ReadingHistoryId}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs hover:shadow-md transition flex gap-4 items-center group"
              >
                <div className="w-16 h-22 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200/80 flex items-center justify-center text-2xl">
                  {item.Document.CoverImageUrl ? (
                    <img
                      src={item.Document.CoverImageUrl}
                      alt={item.Document.Title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "📘"
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition">
                    {item.Document.Title}
                  </h3>
                  <p className="text-[11px] text-gray-500 truncate">
                    {item.Document.School}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                      <span>Đang ở trang {item.LastPage}</span>
                      <span>{item.ProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${item.ProgressPercent}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/student/documents/${item.Document.DocumentId}`}
                    className="inline-block text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    Đọc tiếp →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. TÀI LIỆU MỚI CẬP NHẬT TRONG MẠNG LƯỚI LIÊN TRƯỜNG */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="ico-star" /> Tài liệu mới nhất
            </h2>
            <p className="text-xs text-gray-500">Giáo trình, bài giảng được chia sẻ công khai và nội bộ trường</p>
          </div>
          <Link href="/student/documents" className="text-xs font-bold text-blue-600 hover:underline">
            Xem kho học liệu →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
            Chưa có tài liệu nào sẵn sàng.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {documents.map((doc) => (
              <div
                key={doc.DocumentId}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col group relative"
              >
                {/* NÚT YÊU THÍCH QUICK ACTION */}
                <button
                  onClick={() => handleToggleFavorite(doc.DocumentId)}
                  className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs border border-gray-100 text-gray-400 hover:text-red-500 hover:scale-110 flex items-center justify-center transition shadow-xs cursor-pointer"
                  title="Lưu vào danh sách yêu thích"
                >
                  <i className="ico-heart" />
                </button>

                {/* ẢNH BÌA TÀI LIỆU */}
                <Link
                  href={`/student/documents/${doc.DocumentId}`}
                  className="h-44 bg-gradient-to-tr from-gray-100 to-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden relative"
                >
                  {doc.CoverImageUrl ? (
                    <img
                      src={doc.CoverImageUrl}
                      alt={doc.Title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <span className="text-5xl group-hover:scale-110 transition duration-300">📚</span>
                  )}
                  {doc.IsMySchool && (
                    <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                      Trường của bạn
                    </span>
                  )}
                </Link>

                {/* THÔNG TIN TÀI LIỆU */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      {doc.DocumentType?.TypeName || "Chưa phân loại"}
                    </span>
                    <Link
                      href={`/student/documents/${doc.DocumentId}`}
                      className="block text-sm font-bold text-gray-800 line-clamp-2 hover:text-blue-600 transition"
                      title={doc.Title}
                    >
                      {doc.Title}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">
                      {doc.Authors && doc.Authors.length > 0 ? doc.Authors.join(", ") : "Nhiều tác giả"}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-400">
                    <span className="truncate max-w-[120px]">{doc.School.SchoolName}</span>
                    <span>{doc.PageCount ? `${doc.PageCount} tr.` : ""}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}