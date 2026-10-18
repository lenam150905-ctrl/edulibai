"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "success", title, message, duration = 4000 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast = { id, type, title, message };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = {
    success: (message, title = "Thao tác thành công") =>
      addToast({ type: "success", title, message, duration: 3500 }),
    error: (message, title = "Đã xảy ra lỗi") =>
      addToast({ type: "error", title, message, duration: 5000 }),
    info: (message, title = "Thông báo") =>
      addToast({ type: "info", title, message, duration: 4000 }),
  };

  // Hỗ trợ window.notify cho các component con gọi nhanh mà không cần hook
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.notify = toast;
    }
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* KHÔNG GIAN HIỂN THỊ CÁC TOAST NỔI */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="assertive"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out flex items-start gap-3 p-3.5 rounded-xl border shadow-xl ${
              item.type === "success"
                ? "bg-white border-emerald-200 shadow-emerald-500/10 text-gray-800"
                : item.type === "error"
                ? "bg-white border-rose-200 shadow-rose-500/10 text-gray-800"
                : "bg-white border-blue-200 shadow-blue-500/10 text-gray-800"
            }`}
            style={{ animation: "slideInRight 0.25s ease-out" }}
          >
            {/* ICON PHÂN BIỆT */}
            <div className="shrink-0 mt-0.5">
              {item.type === "success" && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                  {/* TÍCH XANH CHUẨN */}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {item.type === "error" && (
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shadow-xs">
                  {/* X ĐỎ CHUẨN */}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}

              {item.type === "info" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* NỘI DUNG THÔNG BÁO */}
            <div className="flex-1 min-w-0 pr-1">
              <h4
                className={`text-xs font-bold leading-snug ${
                  item.type === "success"
                    ? "text-emerald-700"
                    : item.type === "error"
                    ? "text-rose-700"
                    : "text-blue-700"
                }`}
              >
                {item.title}
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed break-words">
                {item.message}
              </p>
            </div>

            {/* NÚT ĐÓNG */}
            <button
              onClick={() => removeToast(item.id)}
              className="shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              aria-label="Đóng thông báo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback an toàn nếu chưa wrap provider
    return {
      success: (msg, title) => (typeof window !== "undefined" && window.notify?.success ? window.notify.success(msg, title) : alert(msg)),
      error: (msg, title) => (typeof window !== "undefined" && window.notify?.error ? window.notify.error(msg, title) : alert(msg)),
      info: (msg, title) => (typeof window !== "undefined" && window.notify?.info ? window.notify.info(msg, title) : alert(msg)),
    };
  }
  return context;
}
