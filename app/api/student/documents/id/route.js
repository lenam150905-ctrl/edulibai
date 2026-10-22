import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

function serializeBigInt(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(request, { params }) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);
    const userSchoolId = currentUser.schoolId ? BigInt(currentUser.schoolId) : null;

    // Lấy ID tài liệu từ URL param
    const resolvedParams = await params;
    const documentId = BigInt(resolvedParams.id);

    // 1. Truy vấn tài liệu và các bảng liên quan
    const document = await prisma.document.findUnique({
      where: { DocumentId: documentId },
      include: {
        School: {
          select: {
            SchoolId: true,
            SchoolName: true,
            SchoolCode: true,
            LogoUrl: true,
          },
        },
        DocumentType: {
          select: {
            TypeCode: true,
            TypeName: true,
          },
        },
        DocumentAuthor: {
          include: {
            Author: {
              select: {
                AuthorId: true,
                FullName: true,
                Biography: true,
              },
            },
          },
          orderBy: { AuthorOrder: "asc" },
        },
        // Lấy danh sách file đính kèm đang hoạt động
        DocumentFile: {
          where: { IsActive: true },
          select: {
            DocumentFileId: true,
            FileName: true,
            FileExtension: true,
            FileSizeBytes: true,
            MimeType: true,
            StorageKey: true,
          },
        },
        // Lấy thông tin bản quyền để kiểm tra quyền đọc/tải
        DocumentAccess: {
          where: { IsActive: true },
          include: {
            License: true,
          },
        },
      },
    });

    if (!document || document.Status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Tài liệu không tồn tại hoặc đã bị ẩn." },
        { status: 404 }
      );
    }

    // 2. Kiểm tra quyền hiển thị liên trường
    const isOwnerSchool = userSchoolId && document.SchoolId === userSchoolId;
    const isPublic = document.Visibility === "PUBLIC";

    if (!isPublic && !isOwnerSchool) {
      return NextResponse.json(
        {
          success: false,
          isRestricted: true,
          message: "Tài liệu này thuộc quyền sở hữu nội bộ của trường khác. Bạn có thể gửi yêu cầu mượn tài liệu.",
          data: {
            DocumentId: document.DocumentId.toString(),
            Title: document.Title,
            OwnerSchool: document.School.SchoolName,
          },
        },
        { status: 403 }
      );
    }

    // 3. Kiểm tra thông tin cá nhân: Đã yêu thích chưa & Lịch sử đọc gần nhất
    const [favorite, readingHistory] = await Promise.all([
      prisma.favorite.findUnique({
        where: {
          UserId_DocumentId: {
            UserId: currentUserId,
            DocumentId: documentId,
          },
        },
      }),
      prisma.readingHistory.findFirst({
        where: {
          UserId: currentUserId,
          DocumentId: documentId,
        },
        orderBy: { LastReadAt: "desc" },
      }),
    ]);

    // 4. Xác định quyền Đọc (CanView) và Tải (CanDownload) từ License
    let canView = true; // Mặc định được đọc nếu hợp lệ về Visibility
    let canDownload = false; // Mặc định không cho tải trừ khi License cho phép

    if (document.DocumentAccess && document.DocumentAccess.length > 0) {
      const activeLicense = document.DocumentAccess[0]?.License;
      if (activeLicense) {
        canView = activeLicense.CanView;
        canDownload = activeLicense.CanDownload;
      }
    }

    // 5. Chuẩn hóa dữ liệu phản hồi
    const responseData = {
      DocumentId: document.DocumentId.toString(),
      DocumentCode: document.DocumentCode,
      Title: document.Title,
      Description: document.Description,
      ISBN: document.ISBN,
      Publisher: document.Publisher,
      PublicationYear: document.PublicationYear,
      LanguageCode: document.LanguageCode,
      PageCount: document.PageCount,
      CoverImageUrl: document.CoverImageUrl,
      Visibility: document.Visibility,
      CreatedAt: document.CreatedAt,
      School: {
        SchoolId: document.School.SchoolId.toString(),
        SchoolName: document.School.SchoolName,
        SchoolCode: document.School.SchoolCode,
        LogoUrl: document.School.LogoUrl,
      },
      DocumentType: document.DocumentType?.TypeName || "Học liệu",
      Authors: document.DocumentAuthor.map((da) => ({
        AuthorId: da.Author.AuthorId.toString(),
        FullName: da.Author.FullName,
        Biography: da.Author.Biography,
      })),
      Files: document.DocumentFile.map((file) => ({
        DocumentFileId: file.DocumentFileId.toString(),
        FileName: file.FileName,
        FileExtension: file.FileExtension,
        FileSizeBytes: file.FileSizeBytes ? Number(file.FileSizeBytes) : 0,
        MimeType: file.MimeType,
        StorageKey: file.StorageKey,
      })),
      Permissions: {
        CanView: canView,
        CanDownload: canDownload,
        IsOwnerSchool: isOwnerSchool,
      },
      UserInteraction: {
        IsFavorited: !!favorite,
        LastPageRead: readingHistory?.LastPage || 1,
        ReadPercent: readingHistory?.ReadPercent ? Number(readingHistory.ReadPercent) : 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(responseData),
    });
  } catch (error) {
    console.error("Lỗi khi tải chi tiết tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi tải chi tiết tài liệu." },
      { status: 500 }
    );
  }
}