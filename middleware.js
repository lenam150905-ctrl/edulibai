import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Lấy Secret Key từ biến môi trường (phải khớp với JWT_ACCESS_SECRET lúc tạo token)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    "edulib-ai-access-secret-change-this"
);

// Danh sách các route công khai (không cần đăng nhập)
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Bỏ qua các file tĩnh, favicon, assets nội bộ của Next.js
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Lấy cookie access_token (hoặc accessToken)
  const token =
    request.cookies.get("access_token")?.value ||
    request.cookies.get("accessToken")?.value;

  let userPayload = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userPayload = payload;
    } catch {
      // Token hết hạn hoặc không hợp lệ -> xóa cookie hỏng
      userPayload = null;
    }
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // 3. NẾU ĐÃ ĐĂNG NHẬP
  // 3. NẾU ĐÃ ĐĂNG NHẬP
  if (userPayload) {
    const roles = userPayload.roles || (userPayload.role ? [userPayload.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");
    const isStudent = roles.includes("STUDENT");

   if (pathname === "/login" || pathname === "/") {
  if (isSuperAdmin) return NextResponse.redirect(new URL("/admin", request.url));
  if (isSchoolAdmin) return NextResponse.redirect(new URL("/school-admin", request.url));
  if (isStudent) return NextResponse.redirect(new URL("/student", request.url));
  return NextResponse.next(); // Không khớp role thì cho qua chứ không redirect
}

    // 1. Phân luồng vùng /admin: CHỈ DÀNH CHO SUPER_ADMIN
    if (pathname.startsWith("/admin")) {
      if (!isSuperAdmin) {
        const redirectUrl = isSchoolAdmin ? "/school-admin" : isStudent ? "/student" : "/login";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }

    // 2. Phân luồng vùng /school-admin: CHỈ DÀNH CHO SCHOOL_ADMIN
    if (pathname.startsWith("/school-admin")) {
      if (!isSchoolAdmin) {
        const redirectUrl = isSuperAdmin ? "/admin" : isStudent ? "/student" : "/login";
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }

    // 3. Phân luồng vùng /student: DÀNH CHO SINH VIÊN (hoặc Admin kiểm thử)
    if (pathname.startsWith("/student")) {
      // Cho phép Sinh viên, hoặc Super Admin / School Admin vào xem giao diện sinh viên
      if (!isStudent && !isSuperAdmin && !isSchoolAdmin) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.next();
  }
  // 4. NẾU CHƯA ĐĂNG NHẬP (KHÔNG CÓ TOKEN HỢP LỆ HOẶC TOKEN ĐÃ HẾT HẠN)
  if (!isPublicPath) {
    // Chặn các route API: trả về 401 JSON để client interceptor TokenAutoRefresher tự động gọi /api/auth/refresh
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập hoặc token đã hết hạn." },
        { status: 401 }
      );
    }

    // Chặn các trang web thông thường: redirect về /login kèm lưu vết callbackUrl
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("accessToken");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};