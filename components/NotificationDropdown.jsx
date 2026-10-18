"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";

export default function NotificationDropdown({ basePath = "/school-admin" }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const lastSeenIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const pollingIntervalRef = useRef(null);

  // Hàm tải thông báo và phát hiện Real-time
  const fetchNotifications = async (isPolling = false) => {
    try {
      const res = await fetch("/api/notifications");
      if (res.status === 401) {
        // Hết hạn phiên đăng nhập -> Dừng polling ngay lập tức để tránh lặp vô tận
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        const list = json.data;
        const currentUnread = json.unreadCount || 0;

        // Nếu là Polling theo thời gian thực và có thông báo mới hơn thông báo đã biết
        if (isPolling && !isFirstLoadRef.current && list.length > 0) {
          const newest = list[0];
          const newestId = Number(newest.notificationId);

          if (lastSeenIdRef.current && newestId > lastSeenIdRef.current) {
            // CÓ THÔNG BÁO MỚI THEO THỜI GIAN THỰC!
            // Tự động kích hoạt Toast thông báo trên màn hình
            if (newest.type === "SUCCESS") {
              toast.success(newest.message, `🔔 ${newest.title}`);
            } else if (newest.type === "WARNING") {
              toast.info(newest.message, `⚠️ ${newest.title}`);
            } else if (newest.type === "ERROR") {
              toast.error(newest.message, `🚨 ${newest.title}`);
            } else {
              toast.info(newest.message, `ℹ️ ${newest.title}`);
            }
          }
        }

        // Cập nhật ID mới nhất
        if (list.length > 0) {
          lastSeenIdRef.current = Number(list[0].notificationId);
        }
        isFirstLoadRef.current = false;

        setNotifications(list);
        setUnreadCount(currentUnread);
      }
    } catch {
      // Bỏ qua lỗi ngắt kết nối tạm thời khi chuyển trang
    }
  };

  useEffect(() => {
    // 1. Tải lần đầu tiên ngay khi mount
    fetchNotifications(false);

    // 2. Kích hoạt cơ chế Real-time Polling: Kiểm tra mỗi 5 giây
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications(true);
    }, 5000);

    // 3. Đóng dropdown khi click ra ngoài
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id, link) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      fetchNotifications(false);
    } catch {
      // ignore
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
      }
    } catch {
      toast.error("Không thể cập nhật lúc này.");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* NÚT CHUÔNG */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications(false);
        }}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition focus:outline-none cursor-pointer"
        aria-label="Thông báo thời gian thực"
        title="Thông báo hệ thống (Thời gian thực)"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden transform transition-all duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Thông báo</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Trực tiếp
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
              >
                Đọc tất cả ({unreadCount})
              </button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                <span>📭</span> Chưa có thông báo nào.
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.notificationId}
                  onClick={() => handleMarkAsRead(n.notificationId, n.link)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-gray-50/80 transition cursor-pointer ${
                    !n.isRead ? "bg-amber-50/25" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5">
                    {n.type === "SUCCESS" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shadow-2xs">
                        ✓
                      </div>
                    )}
                    {n.type === "ERROR" && (
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shadow-2xs">
                        ✕
                      </div>
                    )}
                    {n.type === "WARNING" && (
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold shadow-2xs">
                        ⚠️
                      </div>
                    )}
                    {n.type === "INFO" && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shadow-2xs">
                        ℹ️
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${!n.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"} truncate`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <span className="text-[9px] text-gray-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleDateString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer link to full notification page */}
          <div className="p-2.5 bg-gray-50/60 border-t border-gray-100 text-center">
            <Link
              href={`${basePath}/notifications`}
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-[#FF9800] hover:text-[#F57C00] transition block py-1"
            >
              Xem tất cả thông báo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
