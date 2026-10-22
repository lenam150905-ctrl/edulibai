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

// 1. GET: Lấy danh sách tài liệu yêu thích của sinh viên đang đăng nhập
export async function GET(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);

    const favorites = await prisma.favorite.findMany({
      where: { UserId: currentUserId },
      orderBy: { CreatedAt: "desc" },
      include: {
        Document: {
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
                    FullName: true,
                  },
                },
              },
              orderBy: { AuthorOrder: "asc" },
            },
          },
        },
      },
    });

    const data = favorites.map((fav) => ({
      SavedAt: fav.CreatedAt,
      Document: {
        DocumentId: fav.Document.DocumentId.toString(),
        DocumentCode: fav.Document.DocumentCode,
        Title: fav.Document.Title,
        Description: fav.Document.Description,
        Publisher: fav.Document.Publisher,
        PublicationYear: fav.Document.PublicationYear,
        PageCount: fav.Document.PageCount,
        CoverImageUrl: fav.Document.CoverImageUrl,
        Visibility: fav.Document.Visibility,
        School: {
          SchoolId: fav.Document.School.SchoolId.toString(),
          SchoolName: fav.Document.School.SchoolName,
          SchoolCode: fav.Document.School.SchoolCode,
        },
        DocumentType: fav.Document.DocumentType?.TypeName || "Học liệu",
        Authors: fav.Document.DocumentAuthor.map((da) => da.Author.FullName),
      },
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu thích:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lấy danh sách yêu thích." },
      { status: 500 }
    );
  }
}

// 2. POST: Thêm hoặc Hủy yêu thích (Toggle Favorite)
export async function POST(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);

    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tài liệu (documentId)." },
        { status: 400 }
      );
    }

    const docId = BigInt(documentId);

    // Kiểm tra xem tài liệu này đã được lưu trước đó chưa
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        UserId_DocumentId: {
          UserId: currentUserId,
          DocumentId: docId,
        },
      },
    });

    if (existingFavorite) {
      // Nếu đã lưu rồi -> Xóa (Bỏ lưu)
      await prisma.favorite.delete({
        where: {
          UserId_DocumentId: {
            UserId: currentUserId,
            DocumentId: docId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        isFavorited: false,
        message: "Đã bỏ lưu tài liệu khỏi danh mục yêu thích.",
      });
    } else {
      // Nếu chưa lưu -> Thêm mới vào Favorite
      await prisma.favorite.create({
        data: {
          UserId: currentUserId,
          DocumentId: docId,
        },
      });

      return NextResponse.json({
        success: true,
        isFavorited: true,
        message: "Đã thêm tài liệu vào danh mục yêu thích.",
      });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật yêu thích:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi cập nhật yêu thích." },
      { status: 500 }
    );
  }
}