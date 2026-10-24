import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET: Lấy danh sách tài liệu học liệu (cho School Admin và Super Admin)
 */
export async function GET(request) {
  try {
    const user = await requireAuth();

    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập khu vực quản trị tài liệu." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const requestedSchoolId = searchParams.get("schoolId");
    const documentTypeId = searchParams.get("documentTypeId");
    const status = searchParams.get("status");
    const visibility = searchParams.get("visibility");

    // Nếu là School Admin thì bắt buộc lọc theo trường của họ; nếu là Super Admin thì dùng param hoặc all
    let targetSchoolId = null;
    if (!isSuperAdmin) {
      if (!user.schoolId) {
        return NextResponse.json(
          { success: false, message: "Tài khoản chưa được gán vào trường học nào." },
          { status: 400 }
        );
      }
      targetSchoolId = BigInt(user.schoolId);
    } else if (requestedSchoolId && requestedSchoolId !== "all") {
      targetSchoolId = BigInt(requestedSchoolId);
    }

    const whereClause = {
      ...(targetSchoolId ? { SchoolId: targetSchoolId } : {}),
      ...(status && status !== "all" ? { Status: status } : {}),
      ...(visibility && visibility !== "all" ? { Visibility: visibility } : {}),
      ...(documentTypeId && documentTypeId !== "all" ? { DocumentTypeId: BigInt(documentTypeId) } : {}),
      ...(search
        ? {
            OR: [
              { Title: { contains: search } },
              { DocumentCode: { contains: search } },
              { Description: { contains: search } },
              { Publisher: { contains: search } },
            ],
          }
        : {}),
    };

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        DocumentType: {
          select: { DocumentTypeId: true, TypeName: true, TypeCode: true },
        },
        School: {
          select: { SchoolId: true, SchoolName: true, SchoolCode: true },
        },
        User: {
          select: { UserId: true, FullName: true, Username: true },
        },
        DocumentFile: {
          where: { IsActive: true },
          take: 1,
          select: {
            DocumentFileId: true,
            FileName: true,
            FileExtension: true,
            FileSizeBytes: true,
            StorageKey: true,
          },
        },
        _count: {
          select: {
            DocumentChunk: true,
            DownloadHistory: true,
            Favorite: true,
          },
        },
      },
      orderBy: { DocumentId: "desc" },
    });

    const data = documents.map((doc) => {
      const activeFile = doc.DocumentFile?.[0];
      return {
        documentId: doc.DocumentId.toString(),
        documentCode: doc.DocumentCode || "DOC" + doc.DocumentId.toString().padStart(6, "0"),
        title: doc.Title,
        description: doc.Description,
        fileType: activeFile?.FileExtension?.toUpperCase() || "PDF",
        fileName: activeFile?.FileName || null,
        fileSize: activeFile?.FileSizeBytes ? Number(activeFile.FileSizeBytes) : 0,
        visibility: doc.Visibility,
        status: doc.Status,
        createdAt: doc.CreatedAt?.toISOString(),
        updatedAt: doc.UpdatedAt?.toISOString(),
        documentType: doc.DocumentType
          ? {
              typeId: doc.DocumentType.DocumentTypeId.toString(),
              typeName: doc.DocumentType.TypeName,
              typeCode: doc.DocumentType.TypeCode,
            }
          : null,
        school: doc.School
          ? {
              schoolId: doc.School.SchoolId.toString(),
              schoolName: doc.School.SchoolName,
              schoolCode: doc.School.SchoolCode,
            }
          : null,
        uploader: {
          userId: doc.User?.UserId ? doc.User.UserId.toString() : null,
          fullName: doc.User?.FullName || doc.User?.Username || "N/A",
        },
        stats: {
          chunksCount: doc._count?.DocumentChunk || 0,
          downloadsCount: doc._count?.DownloadHistory || 0,
          favouritesCount: doc._count?.Favorite || 0,
        },
      };
    });

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
    console.error("Lỗi lấy danh sách tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tải danh sách tài liệu." },
      { status: 500 }
    );
  }
}