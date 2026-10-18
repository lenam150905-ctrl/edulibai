import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import {
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth/token";

export async function POST(request) {
  try {
    const body = await request.json();

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username và password là bắt buộc",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        Username: username,
      },
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
        School: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Username hoặc password không đúng",
        },
        { status: 401 }
      );
    }

    if (!user.IsActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản đã bị khóa",
        },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(
      password,
      user.PasswordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Username hoặc password không đúng",
        },
        { status: 401 }
      );
    }
const accessToken = await createAccessToken(user);
const refreshToken = await createRefreshToken(user);
    const response = NextResponse.json({
  success: true,
  message: "Đăng nhập thành công",
  user: {
    UserId: user.UserId.toString(),
    Username: user.Username,
    Email: user.Email,
    FullName: user.FullName,
    SchoolId: user.SchoolId
      ? user.SchoolId.toString()
      : null,
    Roles: user.UserRole.map((item) => ({
      RoleId: item.Role.RoleId.toString(),
      RoleCode: item.Role.RoleCode,
      RoleName: item.Role.RoleName,
    })),
  },
});
response.cookies.set("access_token", accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 15,
});

response.cookies.set("refresh_token", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 60 * 60 * 24 * 7,
});

return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Có lỗi xảy ra khi đăng nhập",
      },
      { status: 500 }
    );
  }
}