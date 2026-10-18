import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * Tự động tạo mã danh mục tiếp theo: CT000001 -> CT000002...
 */
async function generateNextCategoryCode() {
  const lastCategory = await prisma.category.findFirst({
    orderBy: { CategoryId: "desc" },
    select: { CategoryCode: true },
  });

  if (!lastCategory?.CategoryCode) return "CT000001";
  const match = lastCategory.CategoryCode.match(/^CT(\d+)$/);
  if (!match) return "CT000001";
  const nextNum = parseInt(match[1], 10) + 1;
  return `CT${nextNum.toString().padStart(6, "0")}`;
}

export async function GET(request) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập danh mục." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get("schoolId");

    let targetSchoolId = null;
    if (!isSuperAdmin) {
      targetSchoolId = user.schoolId ? BigInt(user.schoolId) : null;
    } else if (requestedSchoolId && requestedSchoolId !== "all") {
      targetSchoolId = BigInt(requestedSchoolId);
    }

    const categories = await prisma.category.findMany({
      where: {
        ...(targetSchoolId ? { SchoolId: targetSchoolId } : {}),
      },
      include: {
        School: {
          select: { SchoolId: true, SchoolName: true, SchoolCode: true },
        },
      },
      orderBy: { CategoryId: "asc" },
    });

    const data = categories.map((c) => ({
      categoryId: c.CategoryId.toString(),
      categoryCode: c.CategoryCode || `CT${c.CategoryId.toString().padStart(6, "0")}`,
      categoryName: c.CategoryName,
      description: c.Description || null,
      isActive: c.IsActive,
      school: c.School
        ? {
            schoolId: c.School.SchoolId.toString(),
            schoolName: c.School.SchoolName,
            schoolCode: c.School.SchoolCode,
          }
        : null,
    }));

    return NextResponse.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi nạp danh mục môn học." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isAuthorized = roles.includes("SCHOOL_ADMIN") || roles.includes("SUPER_ADMIN");

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Chỉ School Admin hoặc Super Admin mới được tạo danh mục." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { categoryName, description, schoolId } = body;

    if (!categoryName || !categoryName.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên danh mục không được để trống." },
        { status: 400 }
      );
    }

    const targetSchoolId = roles.includes("SUPER_ADMIN") && schoolId
      ? BigInt(schoolId)
      : user.schoolId
      ? BigInt(user.schoolId)
      : (await prisma.school.findFirst())?.SchoolId;

    const nextCode = await generateNextCategoryCode();

    const newCategory = await prisma.category.create({
      data: {
        CategoryCode: nextCode,
        CategoryName: categoryName.trim(),
        Description: description ? description.trim() : null,
        SchoolId: targetSchoolId,
        IsActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tạo danh mục '${newCategory.CategoryName}' (${nextCode}) thành công!`,
      data: {
        categoryId: newCategory.CategoryId.toString(),
        categoryCode: newCategory.CategoryCode,
        categoryName: newCategory.CategoryName,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo danh mục:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tạo danh mục mới." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isAuthorized = roles.includes("SCHOOL_ADMIN") || roles.includes("SUPER_ADMIN");

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Không có quyền sửa danh mục." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { categoryId, categoryName, description, isActive } = body;

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "Mã định danh danh mục là bắt buộc." },
        { status: 400 }
      );
    }

    const existingCat = await prisma.category.findUnique({
      where: { CategoryId: BigInt(categoryId) },
    });

    if (!existingCat) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy danh mục." },
        { status: 404 }
      );
    }

    // Bảo vệ: School admin chỉ sửa được danh mục trường mình
    if (!roles.includes("SUPER_ADMIN") && existingCat.SchoolId?.toString() !== user.schoolId) {
      return NextResponse.json(
        { success: false, message: "Bạn chỉ có thể chỉnh sửa danh mục thuộc trường của mình." },
        { status: 403 }
      );
    }

    const updated = await prisma.category.update({
      where: { CategoryId: BigInt(categoryId) },
      data: {
        ...(categoryName !== undefined && { CategoryName: categoryName.trim() }),
        ...(description !== undefined && { Description: description ? description.trim() : null }),
        ...(isActive !== undefined && { IsActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật danh mục thành công!",
      data: {
        categoryId: updated.CategoryId.toString(),
        categoryName: updated.CategoryName,
        isActive: updated.IsActive,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi cập nhật danh mục." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isAuthorized = roles.includes("SCHOOL_ADMIN") || roles.includes("SUPER_ADMIN");

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Không có quyền xóa danh mục." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: "Thiếu ID danh mục cần xóa." },
        { status: 400 }
      );
    }

    const existingCat = await prisma.category.findUnique({
      where: { CategoryId: BigInt(categoryId) },
    });

    if (!existingCat) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy danh mục." },
        { status: 404 }
      );
    }

    if (!roles.includes("SUPER_ADMIN") && existingCat.SchoolId?.toString() !== user.schoolId) {
      return NextResponse.json(
        { success: false, message: "Bạn chỉ có thể xóa danh mục thuộc trường của mình." },
        { status: 403 }
      );
    }

    await prisma.category.delete({
      where: { CategoryId: BigInt(categoryId) },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa danh mục '${existingCat.CategoryName}' thành công.`,
    });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa danh mục này do có dữ liệu liên kết." },
      { status: 500 }
    );
  }
}