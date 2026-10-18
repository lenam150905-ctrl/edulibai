import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * PATCH: Cập nhật thông tin, trạng thái kích hoạt, đặt lại mật khẩu hoặc vai trò của người dùng
 */
export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
    const isSchoolAdmin =
      user?.roles?.includes("SCHOOL_ADMIN") || user?.role === "SCHOOL_ADMIN";

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền sửa thông tin người dùng." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = BigInt(id);
    const body = await request.json();
    const { fullName, email, isActive, status, schoolId, roleCode, newPassword } = body;

    const existingUser = await prisma.user.findUnique({
      where: { UserId: targetUserId },
      include: {
        UserRole: { include: { Role: true } },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng." },
        { status: 404 }
      );
    }

    // Bảo vệ: School Admin không được sửa tài khoản thuộc trường khác hoặc tài khoản Super Admin
    if (!isSuperAdmin) {
      const isTargetSuper = existingUser.UserRole.some((ur) => ur.Role.RoleCode === "SUPER_ADMIN");
      if (isTargetSuper || existingUser.SchoolId?.toString() !== user.schoolId) {
        return NextResponse.json(
          { success: false, message: "Bạn chỉ có quyền quản trị người dùng thuộc trường của mình." },
          { status: 403 }
        );
      }
    }

    let finalIsActive = undefined;
    if (isActive !== undefined) {
      finalIsActive = Boolean(isActive);
    } else if (status !== undefined) {
      finalIsActive = status === "ACTIVE";
    }

    let passwordHash = undefined;
    if (newPassword && newPassword.trim().length >= 6) {
      passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    // Cập nhật thông tin và vai trò trong Transaction
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật bảng User
      const userUpdate = await tx.user.update({
        where: { UserId: targetUserId },
        data: {
          ...(fullName !== undefined && { FullName: fullName.trim() }),
          ...(email !== undefined && { Email: email ? email.trim().toLowerCase() : null }),
          ...(finalIsActive !== undefined && { IsActive: finalIsActive }),
          ...(passwordHash && { PasswordHash: passwordHash }),
          ...(isSuperAdmin && schoolId !== undefined && {
            SchoolId: schoolId ? BigInt(schoolId) : null,
          }),
        },
      });

      // 2. Nếu có thay đổi vai trò (RoleCode)
      if (roleCode) {
        // School Admin không được cấp SUPER_ADMIN
        if (!isSuperAdmin && roleCode === "SUPER_ADMIN") {
          throw new Error("FORBIDDEN_ROLE");
        }

        const targetRole = await tx.role.findFirst({
          where: { RoleCode: roleCode },
        });

        if (targetRole) {
          await tx.userRole.deleteMany({
            where: { UserId: targetUserId },
          });

          await tx.userRole.create({
            data: {
              UserId: targetUserId,
              RoleId: targetRole.RoleId,
            },
          });
        }
      }

      return userUpdate;
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật người dùng thành công.",
      data: {
        userId: updated.UserId.toString(),
        username: updated.Username,
        fullName: updated.FullName,
        email: updated.Email,
        isActive: updated.IsActive,
        schoolId: updated.SchoolId ? updated.SchoolId.toString() : null,
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    if (error.message === "FORBIDDEN_ROLE") {
      return NextResponse.json(
        { success: false, message: "Không có quyền gán vai trò này." },
        { status: 403 }
      );
    }
    console.error("Lỗi cập nhật người dùng:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi cập nhật người dùng." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Xóa tài khoản người dùng
 */
export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
    const isSchoolAdmin =
      user?.roles?.includes("SCHOOL_ADMIN") || user?.role === "SCHOOL_ADMIN";

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xóa người dùng." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = BigInt(id);

    // Không được tự xóa chính mình
    if (user.userId === id) {
      return NextResponse.json(
        { success: false, message: "Không thể tự xóa tài khoản đang đăng nhập." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { UserId: targetUserId },
      include: {
        UserRole: { include: { Role: true } },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng." },
        { status: 404 }
      );
    }

    // Bảo vệ: Không được xóa Super Admin; School Admin chỉ được xóa user trường mình
    const isTargetSuper = existingUser.UserRole.some((ur) => ur.Role.RoleCode === "SUPER_ADMIN");
    if (isTargetSuper) {
      return NextResponse.json(
        { success: false, message: "Không thể xóa tài khoản Super Admin." },
        { status: 403 }
      );
    }

    if (!isSuperAdmin && existingUser.SchoolId?.toString() !== user.schoolId) {
      return NextResponse.json(
        { success: false, message: "Bạn chỉ có quyền xóa tài khoản thuộc trường của mình." },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { UserId: targetUserId },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa tài khoản @${existingUser.Username} thành công.`,
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi xóa người dùng:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa người dùng do có dữ liệu liên kết." },
      { status: 500 }
    );
  }
}