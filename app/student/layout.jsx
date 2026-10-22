"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider, useToast } from "@/components/Toast";
import NotificationDropdown from "@/components/NotificationDropdown";
import HeaderSearchBar from "@/components/HeaderSearchBar";
import UserProfileModal from "@/components/UserProfileModal";
import EduLibLogo from "@/components/EduLibLogo";
import TokenAutoRefresher from "@/components/TokenAutoRefresher";

function StudentLayoutContent({ children }) {
  const pathname = usePathname();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Tải thông tin sinh viên đang đăng nhập
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.error("Lỗi lấy thông tin user:", err));
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Đăng xuất thành công. Đang chuyển về trang đăng nhập...");
        setTimeout(() => {
          window.location.replace("/login");
        }, 800);
      } else {
        toast.error("Không thể đăng xuất lúc này. Vui lòng thử lại!");
        setLoggingOut(false);
      }
    } catch {
      toast.error("Lỗi kết nối khi đăng xuất!");
      setLoggingOut(false);
    }
  };

  const navItems = [
    { name: "Trang chủ & Khám phá", href: "/student", icon: "🏠" },
    { name: "Kho học liệu liên trường", href: "/student/documents", icon: "📚" },
    { name: "Trợ lý học tập RAG AI", href: "/student/ai-assistant", icon: "🤖" },
    { name: "Góc học tập cá nhân", href: "/student/my-library", icon: "⭐" },
    { name: "Phiếu mượn liên trường", href: "/student/requests", icon: "📨" },
  ];

  const avatarText = (currentUser?.FullName || currentUser?.Username || "SV")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] flex flex-col font-sans">
      <TokenAutoRefresher />

      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40 gap-4">
        <EduLibLogo href="/student" subtitle="Cổng Học Tập Sinh Viên" />

        <HeaderSearchBar
          basePath="/student"
          selectedSchool={currentUser?.SchoolId ? currentUser.SchoolId.toString() : ""}
        />

        <div className="flex items-center gap-3 shrink-0">
          {/* BADGE TRƯỜNG CỦA SINH VIÊN */}
          <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-900 shadow-2xs">
            <span className="text-base">🎓</span>
            <span className="truncate max-w-[200px]">
              {currentUser?.School?.SchoolName || "EduLib University"}
            </span>
            <span className="text-[10px] bg-blue-200/80 text-blue-900 px-1.5 py-0.5 rounded font-bold">
              {currentUser?.School?.SchoolCode || "STUDENT"}
            </span>
          </div>

          <NotificationDropdown />

          {/* AVATAR PROFILE BUTTON */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-gray-50 rounded-xl transition cursor-pointer border border-transparent hover:border-gray-200"
            title="Hồ sơ sinh viên"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {avatarText}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-800 leading-tight">
                {currentUser?.FullName || currentUser?.Username || "Sinh viên"}
              </span>
              <span className="text-[10px] text-gray-500">Mã SV: {currentUser?.UserCode || "US000000"}</span>
            </div>
          </button>

          {/* NÚT ĐĂNG XUẤT */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 text-green-400 hover:text-purple-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            title="Đăng xuất"
          >
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* BODY WITH SIDEBAR */}
      <div className="flex flex-1">
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between shrink-0 p-4 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              Không gian học tập
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-green-500 text-white shadow-sm shadow-blue-200"
                      : "text-yellow-600 hover:bg-gray-50 hover:text-blue-600"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* TRỢ LÝ AI MINI CARD BANNER */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-purple-500/10 border border-blue-200/50 rounded-2xl p-4 text-center">
            <span className="text-3xl inline-block mb-1">🤖</span>
            <h4 className="text-xs font-bold text-gray-800">Cần giải đáp tài liệu?</h4>
            <p className="text-[11px] text-gray-500 mt-1">Hỏi AI để tra cứu nhanh kiến thức trong hàng nghìn giáo trình.</p>
            <Link
              href="/student/ai-assistant"
              className="mt-3 block w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Hỏi trợ lý ngay
            </Link>
          </div>
        </aside>

        {/* NỘI DUNG CHÍNH */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

export default function StudentLayout({ children }) {
  return (
    <ToastProvider>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </ToastProvider>
  );
}