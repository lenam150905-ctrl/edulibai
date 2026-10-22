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

// 1. GET: Lấy danh sách tài liệu đọc gần đây của sinh viên
export async function GET(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);

    const readingList = await prisma.readingHistory.findMany({
      where: { UserId: currentUserId },
      orderBy: { LastReadAt: "desc" },
      take: 10, // Lấy 10 tài liệu đọc gần nhất
      include: {
        Document: {
          include: {
            School: {
              select: {
                SchoolId: true,
                SchoolName: true,
                SchoolCode: true,
              },
            },
            DocumentAuthor: {
              include: {
                Author: {
                  select: { FullName: true },
                },
              },
              orderBy: { AuthorOrder: "asc" },
            },
          },
        },
      },
    });

    const data = readingList.map((item) => ({
      ReadingHistoryId: item.ReadingHistoryId.toString(),
      LastPage: item.LastPage || 1,
      ProgressPercent: item.ProgressPercent ? Number(item.ProgressPercent) : 0,
      LastReadAt: item.LastReadAt,
      Document: {
        DocumentId: item.Document.DocumentId.toString(),
        DocumentCode: item.Document.DocumentCode,
        Title: item.Document.Title,
        CoverImageUrl: item.Document.CoverImageUrl,
        PageCount: item.Document.PageCount || 1,
        School: item.Document.School.SchoolName,
        Authors: item.Document.DocumentAuthor.map((da) => da.Author.FullName),
      },
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử đọc:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lấy lịch sử đọc." },
      { status: 500 }
    );
  }
}

// 2. POST: Ghi nhận trang đang đọc & % tiến độ
export async function POST(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);

    const body = await request.json();
    const { documentId, currentPage, totalPages } = body;

    if (!documentId || !currentPage) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin documentId hoặc currentPage." },
        { status: 400 }
      );
    }

    const docId = BigInt(documentId);
    const pageNum = parseInt(currentPage, 10);

    // Tính % tiến độ đọc (nếu có truyền tổng số trang)
    let percent = null;
    if (totalPages && totalPages > 0) {
      percent = Math.min(100, Math.round((pageNum / totalPages) * 100 * 100) / 100);
    }

    // Upsert vào bảng ReadingHistory
    const result = await prisma.readingHistory.upsert({
      where: {
        UserId_DocumentId: {
          UserId: currentUserId,
          DocumentId: docId,
        },
      },
      update: {
        LastPage: pageNum,
        ...(percent !== null && { ProgressPercent: percent }),
        LastReadAt: new Date(),
      },
      create: {
        UserId: currentUserId,
        DocumentId: docId,
        LastPage: pageNum,
        ProgressPercent: percent || 0,
        LastReadAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu tiến độ đọc.",
      data: {
        LastPage: result.LastPage,
        ProgressPercent: result.ProgressPercent ? Number(result.ProgressPercent) : 0,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lưu lịch sử đọc:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lưu lịch sử đọc." },
      { status: 500 }
    );
  }
}