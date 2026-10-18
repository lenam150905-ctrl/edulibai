import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isAuthorized = roles.includes("SCHOOL_ADMIN") || roles.includes("SUPER_ADMIN");

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập thống kê trường." },
        { status: 403 }
      );
    }

    const schoolId = user.schoolId ? BigInt(user.schoolId) : null;
    if (!schoolId && !roles.includes("SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, message: "Tài khoản chưa được gán vào trường học nào." },
        { status: 400 }
      );
    }

    const whereSchool = schoolId ? { SchoolId: schoolId } : {};

    const [
      totalDocuments,
      sharedDocuments,
      totalUsers,
      totalCategories,
      recentDocuments,
    ] = await prisma.$transaction([
      // 1. Tổng tài liệu của trường
      prisma.document.count({ where: whereSchool }),
      // 2. Tài liệu chia sẻ công khai
      prisma.document.count({
        where: { ...whereSchool, Visibility: "PUBLIC" },
      }),
      // 3. Tổng người dùng của trường
      prisma.user.count({ where: whereSchool }),
      // 4. Tổng số danh mục
      prisma.category.count({ where: whereSchool }),
      // 5. 5 tài liệu mới nhất
      prisma.document.findMany({
        where: whereSchool,
        include: {
          Category: { select: { CategoryName: true } },
          User: { select: { FullName: true, Username: true } },
        },
        orderBy: { DocumentId: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalDocuments,
        sharedDocuments,
        totalUsers,
        totalCategories,
      },
      recentDocuments: recentDocuments.map((doc) => ({
        documentId: doc.DocumentId.toString(),
        documentCode: doc.DocumentCode,
        title: doc.Title,
        fileType: doc.FileType || "PDF",
        categoryName: doc.Category?.CategoryName || "Chưa phân loại",
        uploaderName: doc.User?.FullName || doc.User?.Username || "N/A",
        createdAt: doc.CreatedAt?.toISOString(),
        visibility: doc.Visibility,
      })),
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi lấy thống kê trường:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi lấy thống kê." },
      { status: 500 }
    );
  }
}