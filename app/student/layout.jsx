
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
  const [showSchoolTooltip, setShowSchoolTooltip] = useState(false);
  const pathname = usePathname();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("vi");
  const [mounted, setMounted] = useState(false);

  // Đọc cài đặt và tải thông tin sinh viên
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edulib-theme");
      const savedLanguage = localStorage.getItem("edulib-language");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }

      if (savedLanguage === "vi" || savedLanguage === "en") {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error("Không thể đọc cài đặt:", error);
    }

    setMounted(true);

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Không thể tải thông tin sinh viên");
        }
        return res.json();
      })
      .then((json) => {
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      })
      .catch((error) => {
        console.error("Lỗi lấy thông tin sinh viên:", error);
      });
  }, []);

  // Lưu và áp dụng giao diện
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");

    try {
      localStorage.setItem("edulib-theme", theme);
    } catch (error) {
      console.error("Không thể lưu giao diện:", error);
    }
  }, [theme, mounted]);

  // Lưu và áp dụng ngôn ngữ
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.lang = language;

    try {
      localStorage.setItem("edulib-language", language);
    } catch (error) {
      console.error("Không thể lưu ngôn ngữ:", error);
    }
  }, [language, mounted]);

  const t = (vi, en) => (language === "vi" ? vi : en);
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme((previous) => (previous === "light" ? "dark" : "light"));
  };

  const toggleLanguage = () => {
    setLanguage((previous) => (previous === "vi" ? "en" : "vi"));
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error("Đăng xuất thất bại");
      }

      toast.success(
        t(
          "Đăng xuất thành công. Đang chuyển về trang đăng nhập...",
          "Logged out successfully. Redirecting to login..."
        )
      );

      window.setTimeout(() => {
        window.location.replace("/login");
      }, 800);
    } catch (error) {
      toast.error(
        t(
          "Không thể đăng xuất. Vui lòng thử lại!",
          "Unable to log out. Please try again!"
        )
      );
      setLoggingOut(false);
    }
  };

  const navItems = [
    {
      name: t("Trang chủ & Khám phá", "Home & Explore"),
      href: "/student",
      icon: "🏠",
    },
    {
      name: t("Kho học liệu liên trường", "Inter-university Library"),
      href: "/student/documents",
      icon: "📚",
    },
    {
      name: t("Trợ lý học tập RAG AI", "RAG AI Study Assistant"),
      href: "/student/ai-assistant",
      icon: "🤖",
    },
    {
      name: t("Góc học tập cá nhân", "My Library"),
      href: "/student/my-library",
      icon: "⭐",
    },
    {
      name: t("Phiếu mượn liên trường", "Borrowing Requests"),
      href: "/student/my-requests",
      icon: "📨",
    },
  ];

  const avatarText = (
    currentUser?.FullName || currentUser?.Username || "SV"
  )
    .substring(0, 2)
    .toUpperCase();

  const colors = {
    page: isDark ? "#020617" : "#f8fafc",
    surface: isDark ? "#0f172a" : "#ffffff",
    text: isDark ? "#f1f5f9" : "#1e293b",
    muted: isDark ? "#cbd5e1" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    control: isDark ? "#1e293b" : "#f8fafc",
    navText: isDark ? "#e2e8f0" : "#334155",
  };

  const controlStyle = {
    color: colors.text,
    backgroundColor: colors.control,
    borderColor: colors.border,
  };

  return (
    <div
      className="flex min-h-screen flex-col font-sans"
      style={{
        backgroundColor: colors.page,
        color: colors.text,
      }}
    >
      <TokenAutoRefresher />

      {/* HEADER */}
      <header
        className="sticky top-0 z-50 w-full shrink-0 border-b"
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          borderColor: colors.border,
        }}
      >
        <div className="flex min-h-[88px] w-full items-center gap-5 px-5 py-3">
          {/* LOGO */}
          <div className="w-[190px] shrink-0">
            <EduLibLogo
              href="/student"
              subtitle={t(
                "Cổng Học Tập Sinh Viên",
                "Student Learning Portal"
              )}
            />
          </div>

          {/* THANH TÌM KIẾM */}
          <div className="min-w-[180px] flex-1">
            <HeaderSearchBar
              basePath="/student"
              selectedSchool={
                currentUser?.SchoolId
                  ? currentUser.SchoolId.toString()
                  : ""
              }
            />
          </div>

          {/* NHÓM ĐIỀU KHIỂN */}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {/* CHẾ ĐỘ SÁNG / TỐI */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
              title={t("Chuyển chế độ sáng tối", "Toggle light/dark mode")}
              style={controlStyle}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <span aria-hidden="true">
                {isDark ? "☀️" : "🌙"}
              </span>
              <span className="whitespace-nowrap">
                {isDark
                  ? t("Chế độ tối", "Dark mode")
                  : t("Chế độ sáng", "Light mode")}
              </span>
            </button>

            {/* CHUYỂN NGÔN NGỮ */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t("Chuyển đổi ngôn ngữ", "Change language")}
              style={{
                color: isDark ? "#bfdbfe" : "#1d4ed8",
                backgroundColor: isDark ? "#172554" : "#eff6ff",
                borderColor: isDark ? "#1e40af" : "#bfdbfe",
              }}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <span aria-hidden="true">🌐</span>
              <span className="whitespace-nowrap">
                {language === "vi" ? "Tiếng Việt" : "English"}
              </span>
            </button>

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

            {/* THÔNG BÁO */}
            <div className="flex shrink-0 items-center">
              <NotificationDropdown />
            </div>

            {/* HỒ SƠ SINH VIÊN */}
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              title={t("Hồ sơ sinh viên", "Student profile")}
              style={{ color: colors.text }}
              className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-transparent px-2 text-left transition-colors hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white">
                {avatarText}
              </span>

              <span className="flex min-w-0 flex-col">
                <span className="max-w-[130px] truncate text-xs font-bold">
                  {currentUser?.FullName ||
                    currentUser?.Username ||
                    t("Sinh viên", "Student")}
                </span>

                <span
                  style={{ color: colors.muted }}
                  className="mt-1 whitespace-nowrap text-[10px]"
                >
                  {t("Mã sinh viên", "Student ID")}:{" "}
                  {currentUser?.UserCode || "US000000"}
                </span>
              </span>
            </button>

            {/* ĐĂNG XUẤT - LUÔN Ở CUỐI CỤM BÊN PHẢI */}
            <div
              className="ml-2 shrink-0 border-l pl-4"
              style={{ borderColor: colors.border }}
            >
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title={t("Đăng xuất tài khoản", "Log out")}
                style={{
                  color: isDark ? "#fecaca" : "#b91c1c",
                  backgroundColor: isDark ? "#450a0a" : "#fef2f2",
                  borderColor: isDark ? "#991b1b" : "#fecaca",
                }}
                className="inline-flex h-12 min-w-[112px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-4 text-sm font-bold transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut
                  ? t("Đang xử lý...", "Processing...")
                  : t("Đăng xuất", "Log out")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR VÀ NỘI DUNG */}
      <div className="flex min-h-0 flex-1">
        <aside
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
          className="sticky top-[88px] flex h-[calc(100vh-88px)] w-64 shrink-0 flex-col justify-between overflow-y-auto border-r p-4"
        >
          <div className="space-y-1">
            <div
              style={{ color: colors.muted }}
              className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
            >
              {t("Không gian học tập", "Learning Space")}
            </div>

            {navItems.map((item) => {
              const isActive =
                item.href === "/student"
                  ? pathname === "/student"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    color: isActive ? "#ffffff" : colors.navText,
                    backgroundColor: isActive
                      ? "#2563eb"
                      : "transparent",
                  }}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <span
                    className="shrink-0 text-base"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* THẺ TRỢ LÝ AI */}
          <div
            style={{
              backgroundColor: isDark ? "#172033" : "#f5f3ff",
              borderColor: isDark ? "#3730a3" : "#ddd6fe",
            }}
            className="mt-6 rounded-2xl border p-4 text-center"
          >
            <span
              className="mb-2 inline-block text-3xl"
              aria-hidden="true"
            >
              🤖
            </span>

            <h4
              style={{ color: colors.text }}
              className="text-xs font-bold"
            >
              {t(
                "Cần giải đáp tài liệu?",
                "Need help with study materials?"
              )}
            </h4>

            <p
              style={{ color: colors.muted }}
              className="mt-2 text-[11px] leading-5"
            >
              {t(
                "Hỏi AI để tra cứu nhanh kiến thức trong hàng nghìn giáo trình.",
                "Ask AI to explore knowledge across thousands of textbooks."
              )}
            </p>

            <Link
              href="/student/ai-assistant"
              style={{
                color: "#ffffff",
                backgroundColor: "#2563eb",
              }}
              className="mt-3 block w-full rounded-xl px-3 py-2 text-xs font-bold transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {t("Hỏi trợ lý ngay", "Ask AI now")}
            </Link>
          </div>
        </aside>

        {/* NỘI DUNG TRANG */}
        <main
          style={{
            backgroundColor: colors.page,
            color: colors.text,
          }}
          className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>

      {/* HỒ SƠ SINH VIÊN */}
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
