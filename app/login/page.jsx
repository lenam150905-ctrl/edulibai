
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }

    setLoading(true);

   try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        setError(result.message || result.error || "Tên đăng nhập hoặc mật khẩu không chính xác.");
        return;
      }


      // 1. Đọc vai trò từ kết quả đăng nhập
      const rawRoles =
        result.user?.Roles ??
        result.user?.roles ??
        result.user?.roles?.map?.((r) => r) ??
        [];

      const roleCodes = (
        Array.isArray(rawRoles) ? rawRoles : [rawRoles]
      )
        .map((r) =>
          typeof r === "string"
            ? r
            : r?.RoleCode ?? r?.roleCode ?? r?.RoleName ?? r?.roleName
        )
        .filter(Boolean);

      const userRole =
        result.user?.role ??
        result.data?.role ??
        result.user?.Role ??
        "";

      const allRoles = [...roleCodes, userRole].map((r) =>
        String(r).toUpperCase()
      );

      const isSuperAdmin = allRoles.some((r) =>
        ["SUPER_ADMIN", "SUPERADMIN"].includes(r)
      );

      const isSchoolAdmin = allRoles.some((r) =>
        ["SCHOOL_ADMIN", "SCHOOLADMIN"].includes(r)
      );

      const isStudent = allRoles.some((r) =>
        ["STUDENT", "SINHVIEN", "SINH_VIEN", "NGUOIDUNG"].includes(r)
      );

      // 2. Chọn trang đích
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get("callbackUrl");

      let targetUrl;

      if (isSuperAdmin) {
        targetUrl =
          callbackUrl?.startsWith("/admin") ? callbackUrl : "/admin";
      } else if (isSchoolAdmin) {
        targetUrl =
          callbackUrl?.startsWith("/school-admin")
            ? callbackUrl
            : "/school-admin";
      } else if (isStudent) {
        targetUrl =
          callbackUrl?.startsWith("/student")
            ? callbackUrl
            : "/student";
      } else {
        console.error("Không xác định được vai trò:", {
          user: result.user,
          data: result.data,
        });

        setError("Đăng nhập thành công nhưng không xác định được vai trò tài khoản.");
        return;
      }

      console.log("Vai trò đăng nhập:", allRoles);
      console.log("Trang sẽ chuyển đến:", targetUrl);

      window.location.replace(targetUrl);
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-background-shape shape-one" />
      <div className="login-background-shape shape-two" />

      <header className="login-header">
        <a href="/login" className="login-brand" aria-label="EduLib AI">
          <span className="brand-icon">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M4 13 23 4l20 9v25L24 46 4 37V13Z" fill="#F7C844" />
              <path d="M24 12 8 19v17l16 7V12Z" fill="#FBE28A" />
              <path d="M24 12 40 19v17l-16 7V12Z" fill="#F29B17" />
              <path d="M24 12 8 19l16 8 16-8-16-7Z" fill="#FFF0B3" />
              <path d="M24 27v16" stroke="#D98512" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="brand-copy">
            <span className="brand-name">
              EduLib <span>AI</span>
            </span>
            <span className="brand-tagline">Tri thức kết nối tương lai</span>
          </span>
        </a>

        <div className="header-security">
          <span className="security-dot" />
          Không gian học tập số
        </div>
      </header>

      <section className="login-layout">
        <div className="login-introduction">
          <div className="intro-label">
            <span className="intro-label-dot" />
            NỀN TẢNG THƯ VIỆN SỐ THÔNG MINH
          </div>

          <h1>
            Mở rộng tri thức,
            <br />
            <span>kết nối tương lai.</span>
          </h1>

          <p className="intro-description">
            Khám phá nguồn học liệu phong phú, tìm kiếm thông minh
            và kết nối tri thức trong một không gian học tập hiện đại.
          </p>

          <div className="intro-illustration" aria-hidden="true">
            <div className="illustration-glow" />
            <div className="floating-book book-back" />
            <div className="floating-book book-middle" />
            <div className="floating-book book-front" />

            <div className="open-book">
              <svg viewBox="0 0 280 180" fill="none">
                <path
                  d="M140 47C110 27 65 24 22 39v103c44-15 87-11 118 10V47Z"
                  fill="#FFFDF4"
                  stroke="#1C665D"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  d="M140 47c30-20 75-23 118-8v103c-44-15-87-11-118 10V47Z"
                  fill="#FFF9E8"
                  stroke="#1C665D"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path d="M140 48v104" stroke="#1C665D" strokeWidth="3" />
                <path d="M42 60c25-6 47-4 69 5M42 76c25-6 47-4 69 5M42 92c25-6 47-4 69 5" stroke="#E7B947" strokeWidth="3" strokeLinecap="round" />
                <path d="M169 65c24-8 46-9 68-5M169 81c24-8 46-9 68-5M169 97c24-8 46-9 68-5" stroke="#E7B947" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>

            <div className="ai-orbit">
              <span>AI</span>
            </div>

            <div className="floating-note note-top">
              <span className="note-icon">✦</span>
              Tìm kiếm thông minh
            </div>
            <div className="floating-note note-bottom">
              <span className="note-check">✓</span>
              Tri thức trong tầm tay
            </div>
          </div>

          <div className="intro-quote">
            <span className="quote-mark">“</span>
            <div>
              <p>Sách là ngọn đèn thắp sáng con đường tri thức.</p>
              <span>Học tập · Chia sẻ · Phát triển</span>
            </div>
          </div>

          <div className="intro-footer">
            <span>THƯ VIỆN SỐ EDUlib AI</span>
            <span>Học liệu · Công nghệ · Cộng đồng</span>
          </div>
        </div>

        <div className="login-panel-wrap">
          <div className="login-card">
            <div className="card-topline">
              <span className="card-eyebrow">CHÀO MỪNG BẠN TRỞ LẠI</span>
              <span className="card-sparkle">✦</span>
            </div>

            <h2>Đăng nhập</h2>
            <p className="card-description">
              Đăng nhập để tiếp tục hành trình khám phá tri thức.
            </p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-field">
                <label htmlFor="username">Tên đăng nhập</label>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M4.5 20c.5-4 3-6 7.5-6s7 2 7.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <div className="label-row">
                  <label htmlFor="password">Mật khẩu</label>
                </div>
                <div className="input-shell">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="4.5" y="10" width="15" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    <circle cx="12" cy="15" r="1.2" fill="currentColor" />
                  </svg>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span className="custom-checkbox" />
                  Ghi nhớ tên đăng nhập
                </label>
                <span className="forgot-note">Bảo mật tài khoản</span>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <span className="error-symbol">!</span>
                  {error}
                </div>
              )}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading-spinner" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <span className="submit-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="login-divider">
              <span />
              <p>KHÔNG GIAN TRI THỨC CỦA BẠN</p>
              <span />
            </div>

            <div className="login-benefits">
              <div className="benefit-item">
                <span className="benefit-icon benefit-green">⌕</span>
                <span>
                  <strong>Tìm kiếm thông minh</strong>
                  <small>Khám phá học liệu nhanh chóng</small>
                </span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon benefit-orange">▤</span>
                <span>
                  <strong>Học liệu tập trung</strong>
                  <small>Kết nối nguồn tri thức đa dạng</small>
                </span>
              </div>
            </div>

            <div className="login-security">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2.5 16 5v4.7c0 3.7-2.5 6.3-6 7.8-3.5-1.5-6-4.1-6-7.8V5l6-2.5Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="m7 10 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Phiên đăng nhập được bảo vệ an toàn
            </div>
          </div>

          <p className="login-copyright">
            © {new Date().getFullYear()} EduLib AI · Tri thức kết nối tương lai
          </p>
        </div>
      </section>
    </main>
  );
}
