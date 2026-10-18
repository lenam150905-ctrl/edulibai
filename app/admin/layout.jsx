"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToastProvider, useToast } from "@/components/Toast";
import NotificationDropdown from "@/components/NotificationDropdown";
import HeaderSearchBar from "@/components/HeaderSearchBar";
import UserProfileModal from "@/components/UserProfileModal";
import EduLibLogo from "@/components/EduLibLogo";
import TokenAutoRefresher from "@/components/TokenAutoRefresher";

function AdminLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(searchParams.get("schoolId") || "all");
  const [loggingOut, setLoggingOut] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 1. Tải thông tin người dùng đang đăng nhập từ /api/auth/me
  const fetchMe = () => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((err) => console.error("Lỗi lấy thông tin user:", err));
  };

  useEffect(() => {
    fetchMe();
  }, []);

  // 2. Tải danh sách trường cho Combobox Header
  useEffect(() => {
    fetch("/api/admin/schools")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSchools(json.data);
        }
      })
      .catch((err) => console.error("Lỗi lấy danh sách trường:", err));
  }, []);

  // 3. Đồng bộ khi URL thay đổi param schoolId
  useEffect(() => {
    const sId = searchParams.get("schoolId") || "all";
    setSelectedSchool(sId);
  }, [searchParams]);

  // Xử lý khi đổi lựa chọn trường trong Combobox
  const handleSchoolChange = (schoolId) => {
    setSelectedSchool(schoolId);

    // Bắn Custom Event để các trang con tự động re-fetch theo trường mới
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("schoolChanged", { detail: { schoolId } })
      );
    }

    // Cập nhật tham số query lên URL hiện tại mà không reload
    const currentParams = new URLSearchParams(searchParams.toString());
    if (schoolId === "all") {
      currentParams.delete("schoolId");
    } else {
      currentParams.set("schoolId", schoolId);
    }
    const query = currentParams.toString() ? `?${currentParams.toString()}` : "";
    router.push(`${pathname}${query}`);

    const targetSchool = schools.find((s) => s.schoolId === schoolId);
    const label = targetSchool ? targetSchool.schoolName : "Toàn bộ hệ thống";
    toast.info(`Đã đổi phạm vi lọc hệ thống: ${label}`);
  };

  const isSuperAdmin =
    currentUser?.roles?.includes("SUPER_ADMIN") ||
    currentUser?.role === "SUPER_ADMIN";

  // Xử lý Đăng xuất
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
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Quản lý trường học", href: "/admin/schools", icon: "🏫" },
    { name: "Quản lý người dùng", href: "/admin/users", icon: "👥" },
    { name: "Quản lý học liệu", href: "/admin/documents", icon: "📚" },
    { name: "Lịch sử & Hoạt động", href: "/admin/activity", icon: "🕒" },
    { name: "Tra cứu & Tìm kiếm", href: "/admin/search", icon: "🔍" },
    { name: "Bản quyền & RAG", href: "/admin/licenses", icon: "🔑" },
    { name: "Thí nghiệm & Benchmark", href: "/admin/benchmark", icon: "🧪" },
    { name: "Trung tâm thông báo", href: "/admin/notifications", icon: "🔔" },
  ];

  const avatarText = isSuperAdmin
    ? "SA"
    : (currentUser?.FullName || currentUser?.Username || "AD")
        .substring(0, 2)
        .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] flex flex-col font-sans">
      {/* TỰ ĐỘNG LÀM MỚI ACCESS TOKEN KHI HẾT HẠN */}
      <TokenAutoRefresher />

      {/* TOP NAVBAR HEADER */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40 gap-4">
        {/* LOGO CHÍNH THỨC */}
        <EduLibLogo href="/admin" subtitle="Hệ Thống Quản Trị Cấp Cao" />

        {/* THANH TÌM KIẾM THỜI GIAN THỰC CÓ LIVE PREVIEW */}
        <HeaderSearchBar basePath="/admin" selectedSchool={selectedSchool} />

        {/* RIGHT CONTROLS: COMBOBOX CHỌN TRƯỜNG & PROFILE & NÚT ĐĂNG XUẤT */}
        <div className="flex items-center gap-3 shrink-0">
          {/* COMBOBOX CHỌN TRƯỜNG CÓ CHỨC NĂNG LỌC TOÀN HỆ THỐNG */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 font-medium hover:border-[#FF9800] transition">
            <span className="mr-2">🏛️</span>
            <select
              value={selectedSchool}
              onChange={(e) => handleSchoolChange(e.target.value)}
              className="bg-transparent border-none outline-none cursor-pointer pr-2 text-xs font-semibold text-gray-800"
              title="Lọc toàn bộ dữ liệu hệ thống theo trường"
            >
              <option value="all">🌐 Toàn bộ hệ thống (Tất cả trường)</option>
              {schools.map((s) => (
                <option key={s.schoolId} value={s.schoolId}>
                  {s.schoolCode} - {s.schoolName}
                </option>
              ))}
            </select>
          </div>

          {/* CHUÔNG THÔNG BÁO THỜI GIAN THỰC */}
          <NotificationDropdown basePath="/admin" />

          {/* USER PROFILE AVATAR CÓ MODAL ĐỔI MẬT KHẨU / HỒ SƠ */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 pl-2 border-l border-gray-200 hover:opacity-80 transition cursor-pointer text-left"
            title="Nhấn để xem thông tin cá nhân & Đổi mật khẩu"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {avatarText}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-gray-800 leading-tight">
                {currentUser?.FullName || currentUser?.Username || "Super Admin"}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">Quản trị viên tối cao ⚙️</div>
            </div>
          </button>

          {/* NÚT ĐĂNG XUẤT NỔI BẬT */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 ml-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition duration-150 disabled:opacity-50 shadow-2xs cursor-pointer"
            title="Đăng xuất khỏi hệ thống"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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
              <EduLibLogo href="/admin" subtitle="Super Admin Panel" size="sm" />
            </div>

            <div className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Bảng điều khiển Super Admin
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

          {/* BANNER PHỤ TRANG TRÍ SIDEBAR */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9800] to-[#E65100] mx-auto flex items-center justify-center p-1.5 mb-2 shadow-xs">
              <svg viewBox="0 0 48 48" fill="none" className="w-full h-full" aria-hidden="true">
                <path d="M4 13 23 4l20 9v25L24 46 4 37V13Z" fill="#F7C844" />
                <path d="M24 12 8 19v17l16 7V12Z" fill="#FBE28A" />
                <path d="M24 12 40 19v17l-16 7V12Z" fill="#F29B17" />
                <path d="M24 12 8 19l16 8 16-8-16-7Z" fill="#FFF0B3" />
                <path d="M24 27v16" stroke="#D98512" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-xs font-bold text-gray-800">EduLib AI v2.0</p>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Hệ thống thư viện số liên trường & nghiên cứu khoa học
            </p>
          </div>
        </aside>

        {/* KHÔNG GIAN NỘI DUNG CHÍNH (MAIN CONTENT) */}
        <main className="flex-1 p-8 overflow-y-auto max-w-[1600px]">{children}</main>
      </div>

      {/* MODAL PROFILE & ĐỔI MẬT KHẨU */}
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

export default function AdminLayout({ children }) {
  return (
    <ToastProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ToastProvider>
  );
}