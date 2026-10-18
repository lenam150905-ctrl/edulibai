"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

export default function SchoolNotificationsPage() {
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotice, setNewNotice] = useState({
    title: "",
    message: "",
    type: "SUCCESS",
  });

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error("Lỗi cập nhật thông báo:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    // Real-time auto-refresh: Tự động cập nhật mỗi 4 giây
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã đánh dấu thông báo là đã đọc!");
        fetchNotifications(false);
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Lỗi khi cập nhật thông báo.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc!");
        fetchNotifications(false);
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Lỗi khi cập nhật thông báo.");
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã xóa thông báo!");
        fetchNotifications(false);
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Lỗi khi xóa thông báo.");
    }
  };

  // Tạo thông báo mới (Phát real-time)
  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNotice),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Đã phát thông báo mới theo thời gian thực!");
        setShowCreateModal(false);
        setNewNotice({ title: "", message: "", type: "SUCCESS" });
        fetchNotifications(false);
      } else {
        toast.error(json.message || "Không thể gửi thông báo.");
      }
    } catch {
      toast.error("Lỗi kết nối khi gửi thông báo.");
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Trung Tâm Thông Báo</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Thời gian thực
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Cập nhật tin tức học liệu số, phân quyền và cảnh báo hệ thống theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#FF9800] hover:bg-[#F57C00] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span> Phát thông báo mới
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <span>✓</span> Đọc tất cả
            </button>
          )}
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filter === "all"
              ? "bg-[#FF9800] text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filter === "unread"
              ? "bg-[#FF9800] text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          onClick={() => setFilter("read")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filter === "read"
              ? "bg-[#FF9800] text-white shadow-xs"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Đã đọc ({notifications.length - unreadCount})
        </button>
      </div>

      {/* DANH SÁCH THÔNG BÁO */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-500">
          <span className="inline-block animate-spin mr-2">⏳</span> Đang đồng bộ thông báo thời gian thực...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-sm font-semibold text-gray-700">Không có thông báo nào</p>
          <p className="text-xs text-gray-400 mt-1">
            Bạn đã xem hết các thông báo hoặc chưa có thông báo mới.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.notificationId}
              className={`p-4 bg-white border rounded-2xl shadow-2xs transition-all flex items-start gap-4 ${
                !item.isRead
                  ? "border-amber-200 bg-gradient-to-r from-amber-50/30 to-white"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              {/* ICON PHÂN BIỆT */}
              <div className="shrink-0 mt-0.5">
                {item.type === "SUCCESS" && (
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                    ✓
                  </div>
                )}
                {item.type === "ERROR" && (
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                    ✕
                  </div>
                )}
                {item.type === "WARNING" && (
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm shadow-2xs">
                    ⚠️
                  </div>
                )}
                {item.type === "INFO" && (
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm shadow-2xs">
                    ℹ️
                  </div>
                )}
              </div>

              {/* NỘI DUNG */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm ${!item.isRead ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {!item.isRead && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-md">
                        Mới
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {item.message}
                </p>

                {/* THAO TÁC */}
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-50 text-xs">
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(item.notificationId)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                    >
                      ✓ Đánh dấu đã đọc
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(item.notificationId)}
                    className="text-gray-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PHÁT THÔNG BÁO TEST REAL-TIME */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📢</span> Phát Thông Báo Mới (Real-time)
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNotification} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Loại thông báo
                </label>
                <select
                  value={newNotice.type}
                  onChange={(e) => setNewNotice({ ...newNotice, type: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
                >
                  <option value="SUCCESS">Thành công (Tích xanh ✓)</option>
                  <option value="INFO">Tin tức hệ thống (Xanh dương ℹ️)</option>
                  <option value="WARNING">Cảnh báo (Vàng ⚠️)</option>
                  <option value="ERROR">Khẩn cấp / Lỗi (Đỏ ✕)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tiêu đề thông báo (*)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Cập nhật học liệu môn Trí tuệ nhân tạo..."
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung chi tiết (*)
                </label>
                <textarea
                  rows="3"
                  placeholder="Nhập nội dung cần thông báo đến người dùng..."
                  value={newNotice.message}
                  onChange={(e) => setNewNotice({ ...newNotice, message: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#FF9800] hover:bg-[#F57C00] rounded-xl transition shadow-xs cursor-pointer"
                >
                  Phát thông báo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
