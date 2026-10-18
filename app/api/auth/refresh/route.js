import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth/token";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const refreshToken =
      cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Refresh token không tồn tại",
        },
        { status: 401 }
      );
    }

    const payload = await verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: {
        UserId: BigInt(payload.userId),
      },
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
      },
    });

    if (!user || !user.IsActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản không hợp lệ",
        },
        { status: 401 }
      );
    }

    // Rotation:
    // refresh token cũ được dùng để cấp refresh token mới.
    const newAccessToken = await createAccessToken(user);
    const newRefreshToken = await createRefreshToken(user);

    const response = NextResponse.json({
      success: true,
      message: "Token đã được làm mới",
    });

    response.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });

    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Refresh token error:", error);

    const response = NextResponse.json(
      {
        success: false,
        message: "Refresh token không hợp lệ hoặc đã hết hạn",
      },
      { status: 401 }
    );

    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");

    return response;
  }
}