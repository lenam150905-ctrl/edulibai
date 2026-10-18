"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function ActivityHistoryPage({ roleType = "super-admin" }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const schoolIdParam = searchParams.get("schoolId") || "all";

  const [activeTab, setActiveTab] = useState("conversations"); // conversations | downloads | reading | favorites
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    conversations: [],
    downloads: [],
    reading: [],
    favorites: [],
  });
  const [counts, setCounts] = useState({
    conversations: 0,
    downloads: 0,
    reading: 0,
    favorites: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (roleType === "super-admin" && schoolIdParam !== "all") {
        params.set("schoolId", schoolIdParam);
      }
      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData((prev) => ({
          ...prev,
          [activeTab]: json.data[activeTab] || [],
        }));
        setCounts(json.counts);
      } else {
        toast.error(json.message || "Không thể tải nhật ký hoạt động.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối khi tải dữ liệu hoạt động.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, roleType, schoolIdParam, searchTerm, toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Format file size
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕒</span>
            <h1 className="text-xl font-bold text-gray-900">
              Nhật Ký & Hoạt Động Người Dùng (TC10)
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi phiên tìm kiếm AI (RAG), lượt tải học liệu, tiến độ đọc và tài liệu lưu yêu thích
          </p>
        </div>
        <button
          onClick={fetchActivities}
          className="px-3.5 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 flex items-center gap-1.5 transition"
        >
          <span>🔄</span> Làm mới
        </button>
      </div>

      {/* FILTER & TABS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* TABS */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl text-xs font-semibold overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("conversations")}
            className={`px-3.5 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "conversations"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>💬</span> Hội thoại RAG
            {counts.conversations > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {counts.conversations}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("downloads")}
            className={`px-3.5 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "downloads"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>📥</span> Lịch sử Tải về
            {counts.downloads > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {counts.downloads}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("reading")}
            className={`px-3.5 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "reading"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>📖</span> Tiến trình Đọc
            {counts.reading > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {counts.reading}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-3.5 py-2 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "favorites"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>⭐</span> Đã Lưu Yêu Thích
            {counts.favorites > 0 && (
              <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {counts.favorites}
              </span>
            )}
          </button>
        </div>

        {/* SEARCH BOX */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Tìm theo người dùng, tài liệu, câu hỏi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9800]/20 focus:border-[#FF9800] transition"
          />
        </div>
      </div>

      {/* CONTENT TABLES / CARDS */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            <span className="inline-block animate-spin mr-2">⏳</span> Đang tải dữ liệu hoạt động...
          </div>
        ) : (
          <>
            {/* TAB 1: CONVERSATIONS */}
            {activeTab === "conversations" && (
              <div className="divide-y divide-gray-100">
                {data.conversations.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    Chưa có phiên hỏi đáp AI RAG nào được ghi nhận.
                  </div>
                ) : (
                  data.conversations.map((conv) => (
                    <div
                      key={conv.conversationId}
                      className="p-4 hover:bg-gray-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-200/50">
                            RAG CHAT
                          </span>
                          <span className="text-xs font-bold text-gray-900">
                            {conv.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                          <span>
                            👤 <strong className="text-gray-700">{conv.user?.fullName || conv.user?.username}</strong>
                          </span>
                          {conv.school && <span>🏫 {conv.school.schoolName}</span>}
                          <span>💬 {conv.messageCount} tin nhắn</span>
                          <span>🕒 {formatDate(conv.updatedAt || conv.createdAt)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedConversation(conv)}
                        className="px-3 py-1.5 text-xs font-semibold bg-gray-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-gray-200 rounded-xl text-gray-700 transition self-start md:self-auto shrink-0"
                      >
                        👁️ Xem chi tiết đối thoại
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: DOWNLOADS */}
            {activeTab === "downloads" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Thời gian</th>
                      <th className="px-4 py-3 font-semibold">Người dùng</th>
                      <th className="px-4 py-3 font-semibold">Tài liệu tải xuống</th>
                      <th className="px-4 py-3 font-semibold">Trường học</th>
                      <th className="px-4 py-3 font-semibold">Định dạng & Dung lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.downloads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400">
                          Chưa có lượt tải học liệu nào.
                        </td>
                      </tr>
                    ) : (
                      data.downloads.map((dl) => (
                        <tr key={dl.downloadId} className="hover:bg-gray-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {formatDate(dl.downloadedAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {dl.user?.fullName || dl.user?.username}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-800 line-clamp-1">
                              {dl.document?.title || "Tài liệu #" + dl.document?.documentId}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Mã: {dl.document?.documentCode || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {dl.document?.schoolName || "Hệ thống"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] mr-2 uppercase">
                              {dl.file?.fileExtension || "PDF"}
                            </span>
                            <span className="text-gray-400 text-[11px]">
                              {formatBytes(dl.file?.fileSize)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: READING */}
            {activeTab === "reading" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Thời gian đọc</th>
                      <th className="px-4 py-3 font-semibold">Người đọc</th>
                      <th className="px-4 py-3 font-semibold">Tên tài liệu</th>
                      <th className="px-4 py-3 font-semibold">Trang cuối / Tổng</th>
                      <th className="px-4 py-3 font-semibold">Tiến độ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.reading.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400">
                          Chưa có lịch sử đọc tài liệu nào.
                        </td>
                      </tr>
                    ) : (
                      data.reading.map((r) => (
                        <tr key={r.readingId} className="hover:bg-gray-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {formatDate(r.lastReadAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {r.user?.fullName || r.user?.username}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-800 line-clamp-1">
                              {r.document?.title}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            Trang {r.lastPage} {r.document?.totalPages ? `/ ${r.document.totalPages}` : ""}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(r.progressPercent || 0, 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-gray-700">
                                {r.progressPercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: FAVORITES */}
            {activeTab === "favorites" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Ngày lưu</th>
                      <th className="px-4 py-3 font-semibold">Thành viên</th>
                      <th className="px-4 py-3 font-semibold">Tài liệu yêu thích</th>
                      <th className="px-4 py-3 font-semibold">Trường lưu trữ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.favorites.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400">
                          Chưa có tài liệu yêu thích nào.
                        </td>
                      </tr>
                    ) : (
                      data.favorites.map((fav, idx) => (
                        <tr key={`${fav.userId}-${fav.documentId}-${idx}`} className="hover:bg-gray-50/60 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {formatDate(fav.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {fav.user?.fullName || fav.user?.username}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-800 line-clamp-1">
                              ⭐ {fav.document?.title}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {fav.document?.schoolName || "Toàn hệ thống"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL XEM CHI TIẾT ĐỐI THOẠI RAG */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded">
                  Hội thoại RAG Chi Tiết
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {selectedConversation.title}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Người dùng: <strong>{selectedConversation.user?.fullName}</strong> ({selectedConversation.user?.username})
                </p>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Messages */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.messageId}
                    className={`flex flex-col ${
                      msg.role === "USER" || msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="text-[10px] text-gray-400 mb-1">
                      {msg.role === "USER" || msg.role === "user" ? "👤 Bạn" : "🤖 Trợ lý AI (EduLib RAG)"} • {formatDate(msg.createdAt)}
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                        msg.role === "USER" || msg.role === "user"
                          ? "bg-[#FF9800] text-white rounded-tr-none"
                          : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200/60"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-gray-400">
                  Không có nội dung tin nhắn chi tiết.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedConversation(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
