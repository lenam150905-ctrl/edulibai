import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * PATCH: Cập nhật thông tin hoặc trạng thái kích hoạt của trường học
 */
export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền chỉnh sửa trường học." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const schoolId = BigInt(id);
    const body = await request.json();
    const { schoolName, email, phone, address, isActive } = body;

    const existingSchool = await prisma.school.findUnique({
      where: { SchoolId: schoolId },
    });

    if (!existingSchool) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy trường học." },
        { status: 404 }
      );
    }

    const updated = await prisma.school.update({
      where: { SchoolId: schoolId },
      data: {
        ...(schoolName !== undefined && { SchoolName: schoolName.trim() }),
        ...(email !== undefined && { Email: email ? email.trim().toLowerCase() : null }),
        ...(phone !== undefined && { Phone: phone ? phone.trim() : null }),
        ...(address !== undefined && { Address: address ? address.trim() : null }),
        ...(isActive !== undefined && { IsActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin trường thành công!",
      data: {
        schoolId: updated.SchoolId.toString(),
        schoolCode: updated.SchoolCode,
        schoolName: updated.SchoolName,
        email: updated.Email,
        phone: updated.Phone,
        address: updated.Address,
        isActive: updated.IsActive,
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi cập nhật trường:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi cập nhật thông tin trường." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Xóa trường học
 */
export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xóa trường học." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const schoolId = BigInt(id);

    const existingSchool = await prisma.school.findUnique({
      where: { SchoolId: schoolId },
      include: {
        _count: {
          select: {
            User: true,
            Document: true,
          },
        },
      },
    });

    if (!existingSchool) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy trường học." },
        { status: 404 }
      );
    }

    if (existingSchool._count.User > 0 || existingSchool._count.Document > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa trường '${existingSchool.SchoolName}' vì đang có ${existingSchool._count.User} tài khoản và ${existingSchool._count.Document} tài liệu liên kết. Bạn có thể tạm dừng hoạt động thay vì xóa.`,
        },
        { status: 400 }
      );
    }

    await prisma.school.delete({
      where: { SchoolId: schoolId },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa trường học '${existingSchool.SchoolName}' thành công.`,
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi xóa trường học:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa trường học này do có dữ liệu liên kết." },
      { status: 500 }
    );
  }
}