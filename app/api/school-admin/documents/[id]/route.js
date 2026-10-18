import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET: Xem chi tiết tài liệu
 */
export async function GET(request, { params }) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const documentId = BigInt(id);

    const doc = await prisma.document.findUnique({
      where: { DocumentId: documentId },
      include: {
        DocumentType: true,
        School: true,
        User: { select: { UserId: true, FullName: true, Username: true } },
        DocumentFile: { where: { IsActive: true } },
        _count: {
          select: {
            DocumentChunk: true,
            DownloadHistory: true,
            Favorite: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu." },
        { status: 404 }
      );
    }

    // Kiểm tra quyền trường
    if (!isSuperAdmin && doc.SchoolId?.toString() !== user.schoolId) {
      return NextResponse.json(
        { success: false, message: "Bạn chỉ có thể xem tài liệu thuộc trường của mình." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: doc.DocumentId.toString(),
        documentCode: doc.DocumentCode,
        title: doc.Title,
        description: doc.Description,
        status: doc.Status,
        visibility: doc.Visibility,
        publisher: doc.Publisher,
        publicationYear: doc.PublicationYear,
        createdAt: doc.CreatedAt?.toISOString(),
        school: doc.School ? { schoolId: doc.School.SchoolId.toString(), schoolName: doc.School.SchoolName } : null,
        documentType: doc.DocumentType ? { typeName: doc.DocumentType.TypeName } : null,
        file: doc.DocumentFile?.[0] ? {
          fileName: doc.DocumentFile[0].FileName,
          fileExtension: doc.DocumentFile[0].FileExtension,
          fileSizeBytes: Number(doc.DocumentFile[0].FileSizeBytes || 0),
          storageKey: doc.DocumentFile[0].StorageKey,
        } : null,
        stats: {
          chunksCount: doc._count.DocumentChunk,
          downloadsCount: doc._count.DownloadHistory,
          favoritesCount: doc._count.Favorite,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi xem tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tải thông tin tài liệu." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Cập nhật tài liệu (tiêu đề, mô tả, phạm vi visibility, trạng thái status)
 */
export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền sửa tài liệu." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const documentId = BigInt(id);
    const body = await request.json();
    const { title, description, visibility, status } = body;

    const existingDoc = await prisma.document.findUnique({
      where: { DocumentId: documentId },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu." },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && existingDoc.SchoolId?.toString() !== user.schoolId) {
      return NextResponse.json(
        { success: false, message: "Bạn chỉ có thể chỉnh sửa tài liệu thuộc trường của mình." },
        { status: 403 }
      );
    }

    const updated = await prisma.document.update({
      where: { DocumentId: documentId },
      data: {
        ...(title !== undefined && { Title: title.trim() }),
        ...(description !== undefined && { Description: description ? description.trim() : null }),
        ...(visibility !== undefined && { Visibility: visibility }),
        ...(status !== undefined && { Status: status }),
        UpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật tài liệu thành công!",
      data: {
        documentId: updated.DocumentId.toString(),
        title: updated.Title,
        visibility: updated.Visibility,
        status: updated.Status,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật tài liệu." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Xóa tài liệu
 */
export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền xóa tài liệu." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const documentId = BigInt(id);

    const existingDoc = await prisma.document.findUnique({
      where: { DocumentId: documentId },
    });

    if (!existingDoc) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu." },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && existingDoc.SchoolId?.toString() !== user.schoolId) {
      return NextResponse.json(
        { success: false, message: "Bạn chỉ có quyền xóa tài liệu thuộc trường của mình." },
        { status: 403 }
      );
    }

    await prisma.document.delete({
      where: { DocumentId: documentId },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa tài liệu '${existingDoc.Title}' thành công.`,
    });
  } catch (error) {
    console.error("Lỗi xóa tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa tài liệu này do có dữ liệu liên kết." },
      { status: 500 }
    );
  }
}