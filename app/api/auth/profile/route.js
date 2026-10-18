import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { verifyPassword } from "@/lib/auth/password";

/**
 * PATCH: Cập nhật thông tin cá nhân hoặc Đổi mật khẩu (TC1)
 */
export async function PATCH(request) {
  try {
    const auth = await requireAuth();
    const userId = BigInt(auth.userId);
    const body = await request.json();
    const { action, fullName, email, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { UserId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Người dùng không tồn tại." },
        { status: 404 }
      );
    }

    // 1. ĐỔI MẬT KHẨU
    if (action === "CHANGE_PASSWORD") {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới." },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
          { status: 400 }
        );
      }

      const isMatch = await verifyPassword(currentPassword, user.PasswordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu hiện tại không chính xác." },
          { status: 400 }
        );
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { UserId: userId },
        data: {
          PasswordHash: newHash,
          UpdatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới.",
      });
    }

    // 2. CẬP NHẬT THÔNG TIN CÁ NHÂN
    if (action === "UPDATE_PROFILE") {
      if (!fullName || !fullName.trim()) {
        return NextResponse.json(
          { success: false, message: "Họ và tên không được để trống." },
          { status: 400 }
        );
      }

      if (email && email.trim() !== user.Email) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            Email: email.trim().toLowerCase(),
            UserId: { not: userId },
          },
        });
        if (existingEmail) {
          return NextResponse.json(
            { success: false, message: "Email này đã được sử dụng bởi tài khoản khác." },
            { status: 409 }
          );
        }
      }

      const updated = await prisma.user.update({
        where: { UserId: userId },
        data: {
          FullName: fullName.trim(),
          Email: email ? email.trim().toLowerCase() : null,
          UpdatedAt: new Date(),
        },
        select: {
          UserId: true,
          Username: true,
          FullName: true,
          Email: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Cập nhật thông tin cá nhân thành công!",
        data: {
          userId: updated.UserId.toString(),
          username: updated.Username,
          fullName: updated.FullName,
          email: updated.Email,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ." },
      { status: 400 }
    );
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi cập nhật profile:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi xử lý yêu cầu." },
      { status: 500 }
    );
  }
}
