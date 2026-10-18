import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET: Lấy danh sách toàn bộ License bản quyền học liệu
 */
export async function GET(request) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền thực hiện thao tác này." },
        { status: 403 }
      );
    }

    const licenses = await prisma.license.findMany({
      include: {
        _count: {
          select: { DocumentAccess: true },
        },
      },
      orderBy: { LicenseId: "asc" },
    });

    const data = licenses.map((lic) => ({
      licenseId: lic.LicenseId.toString(),
      licenseName: lic.LicenseName,
      canUseForRAG: lic.CanUseForRAG,
      canDownload: lic.CanDownload ?? true,
      description: lic.Description || null,
      totalAssignedDocuments: lic._count.DocumentAccess,
    }));

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi lấy danh sách giấy phép:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tải danh sách giấy phép." },
      { status: 500 }
    );
  }
}

/**
 * POST: Tạo gói License mới với thiết lập bản quyền và quyền RAG
 */
export async function POST(request) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";

    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ Super Admin mới có quyền tạo giấy phép." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { licenseName, canUseForRAG = true, canDownload = true, description } = body;

    if (!licenseName || !licenseName.trim()) {
      return NextResponse.json(
        { success: false, message: "Tên gói giấy phép là bắt buộc." },
        { status: 400 }
      );
    }

    const existing = await prisma.license.findFirst({
      where: { LicenseName: licenseName.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Tên giấy phép này đã tồn tại." },
        { status: 409 }
      );
    }

    const newLicense = await prisma.license.create({
      data: {
        LicenseName: licenseName.trim(),
        CanUseForRAG: Boolean(canUseForRAG),
        CanDownload: Boolean(canDownload),
        Description: description ? description.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tạo gói giấy phép thành công.",
      data: {
        licenseId: newLicense.LicenseId.toString(),
        licenseName: newLicense.LicenseName,
        canUseForRAG: newLicense.CanUseForRAG,
        canDownload: newLicense.CanDownload,
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi tạo giấy phép:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tạo giấy phép mới." },
      { status: 500 }
    );
  }
}