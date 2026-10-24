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

function SchoolAdminLayoutContent({ children }) {
  const pathname = usePathname();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 1. Tải thông tin người dùng đang đăng nhập từ /api/auth/me
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

  // Xử lý Đăng xuất
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
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
    { name: "Tổng quan trường", href: "/school-admin", icon: "📊" },
    { name: "Quản lý danh mục", href: "/school-admin/categories", icon: "📂" },
    { name: "Quản lý học liệu", href: "/school-admin/documents", icon: "📚" },
    { name: "Quản lý người dùng", href: "/school-admin/users", icon: "👥" },
    { name: "Lịch sử & Hoạt động", href: "/school-admin/activity", icon: "🕒" },
    { name: "Tra cứu & Tìm kiếm", href: "/school-admin/search", icon: "🔍" },
    { name: "Trung tâm thông báo", href: "/school-admin/notifications", icon: "🔔" },
  ];

  const avatarText = (currentUser?.FullName || currentUser?.Username || "AD")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] flex flex-col font-sans">
      {/* TỰ ĐỘNG LÀM MỚI ACCESS TOKEN KHI HẾT HẠN */}
      <TokenAutoRefresher />

      {/* TOP NAVBAR HEADER */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40 gap-4">
        {/* LOGO CHÍNH THỨC */}
        <EduLibLogo href="/school-admin" subtitle="Cổng Quản Trị Trường Học" />

        {/* THANH TÌM KIẾM THỜI GIAN THỰC CHO TRƯỜNG */}
        <HeaderSearchBar
          basePath="/school-admin"
          selectedSchool={currentUser?.SchoolId ? currentUser.SchoolId.toString() : ""}
        />

        {/* RIGHT CONTROLS: BADGE TRƯỜNG, CHUÔNG THÔNG BÁO, USER PROFILE & NÚT ĐĂNG XUẤT */}
        <div className="flex items-center gap-3 shrink-0">
          {/* BADGE TÊN TRƯỜNG TRỰC THUỘC */}
          <div className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs">
            <span className="text-base">🎓</span>
            <span className="truncate max-w-xs">
              {currentUser?.School?.SchoolName || "Đang kết nối trường học..."}
            </span>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">
              {currentUser?.School?.SchoolCode || "CODE"}
            </span>
          </div>

          {/* CHUÔNG THÔNG BÁO (KÈM DROPDOWN) */}
          <NotificationDropdown basePath="/school-admin" />

          {/* USER PROFILE AVATAR CÓ MODAL ĐỔI MẬT KHẨU / HỒ SƠ */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 pl-2 border-l border-gray-200 hover:opacity-80 transition cursor-pointer text-left"
            title="Nhấn để xem thông tin cá nhân & Đổi mật khẩu"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {avatarText}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-gray-800 leading-tight">
                {currentUser?.FullName || currentUser?.Username || "School Admin"}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">Quản trị viên trường 🎓</div>
            </div>
          </button>

          {/* NÚT ĐĂNG XUẤT NỔI BẬT */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 ml-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition duration-150 disabled:opacity-50 shadow-2xs cursor-pointer"
            title="Đăng xuất khỏi hệ thống"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">{loggingOut ? "Đang thoát..." : "Đăng xuất"}</span>
          </button>
        </div>
      </header>

      {/* BODY WITH SIDEBAR */}
      <div className="flex flex-1">
        {/* SIDEBAR TRÁI */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between py-5 px-4 shrink-0">
          <div className="space-y-4">
            {/* LOGO ĐẦY ĐỦ TRÊN ĐẦU SIDEBAR */}
            <div className="px-2 pb-3.5 border-b border-gray-100">
              <EduLibLogo href="/school-admin" subtitle="School Admin Panel" size="sm" />
            </div>

            <div className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Bảng điều khiển trường
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#FFF4E5] text-[#FF9800] shadow-sm font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>


         
{/* THÔNG TIN TRƯỜNG */}

{/* THÔNG TIN TRƯỜNG */}
<div className="school-tooltip-wrapper">
  <div
    className="school-badge"
    style={{
      color: isDark ? "#dbeafe" : "#1e3a8a",
      backgroundColor: isDark ? "#172554" : "#eff6ff",
      borderColor: isDark ? "#1e40af" : "#bfdbfe",
    }}
  >
    <span aria-hidden="true">🎓</span>

    <span className="school-name">
      {currentUser?.School?.SchoolName || "EduLib University"}
    </span>

    <span className="school-code">
      {currentUser?.School?.SchoolCode || "SINH VIÊN"}
    </span>
  </div>

  <div
    className="school-tooltip"
    style={{
      color: isDark ? "#f8fafc" : "#0f172a",
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      borderColor: isDark ? "#475569" : "#cbd5e1",
    }}
  >
    <p className="font-bold">
      {currentUser?.School?.SchoolName || "EduLib University"}
    </p>

    <p className="mt-2 text-xs">
      {t("Mã trường", "School code")}:{" "}
      {currentUser?.School?.SchoolCode || "SINH VIÊN"}
    </p>
  </div>
</div>

        </aside>

        {/* NỘI DUNG CHÍNH */}
        <main className="flex-1 p-8 overflow-y-auto max-w-[1600px]">{children}</main>
      </div>

      {/* MODAL XEM HỒ SƠ & ĐỔI MẬT KHẨU */}
      {showProfileModal && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
            setShowProfileModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function SchoolAdminLayout({ children }) {
  return (
    <ToastProvider>
      <SchoolAdminLayoutContent>{children}</SchoolAdminLayoutContent>
    </ToastProvider>
  );
}