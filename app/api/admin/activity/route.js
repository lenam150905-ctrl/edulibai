import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET: Lấy nhật ký hoạt động người dùng và lịch sử theo TC10:
 * - Lịch sử tìm kiếm & hỏi đáp RAG (Conversation)
 * - Lịch sử tải học liệu (DownloadHistory)
 * - Lịch sử đọc tài liệu (ReadingHistory)
 * - Danh sách lưu tài liệu yêu thích (Favorite)
 */
export async function GET(request) {
  try {
    const user = await requireAuth();

    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập nhật ký hoạt động." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedSchoolId = searchParams.get("schoolId");
    const tab = searchParams.get("tab") || "all"; // all | conversations | downloads | reading | favorites
    const search = (searchParams.get("search") || "").trim();
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Xác định SchoolId áp dụng
    let effectiveSchoolId = null;
    if (!isSuperAdmin) {
      if (!user.schoolId) {
        return NextResponse.json(
          { success: false, message: "Tài khoản chưa được gán vào trường học nào." },
          { status: 400 }
        );
      }
      effectiveSchoolId = BigInt(user.schoolId);
    } else if (requestedSchoolId && requestedSchoolId !== "all") {
      effectiveSchoolId = BigInt(requestedSchoolId);
    }

    const userSchoolFilter = effectiveSchoolId ? { User: { SchoolId: effectiveSchoolId } } : {};
    const docSchoolFilter = effectiveSchoolId ? { Document: { SchoolId: effectiveSchoolId } } : {};

    let conversations = [];
    let downloads = [];
    let reading = [];
    let favourites = [];

    // 1. LẤY HỘI THOẠI / LỊCH SỬ TÌM KIẾM RAG
    if (tab === "all" || tab === "conversations") {
      const convWhere = {
        ...userSchoolFilter,
        ...(search
          ? {
              OR: [
                { Title: { contains: search } },
                { User: { FullName: { contains: search } } },
                { User: { Username: { contains: search } } },
                {
                  ConversationMessage: {
                    some: { Content: { contains: search } },
                  },
                },
              ],
            }
          : {}),
      };

      const rawConversations = await prisma.conversation.findMany({
        where: convWhere,
        include: {
          User: {
            select: { UserId: true, FullName: true, Username: true, AvatarUrl: true },
          },
          School: {
            select: { SchoolId: true, SchoolName: true },
          },
          ConversationMessage: {
            orderBy: { CreatedAt: "asc" },
            take: 10,
            select: {
              MessageId: true,
              Role: true,
              Content: true,
              CreatedAt: true,
            },
          },
          _count: {
            select: { ConversationMessage: true },
          },
        },
        orderBy: { UpdatedAt: "desc" },
        take: limit,
      });

      conversations = rawConversations.map((c) => ({
        conversationId: c.ConversationId.toString(),
        title: c.Title || "Hội thoại tra cứu RAG",
        createdAt: c.CreatedAt?.toISOString(),
        updatedAt: c.UpdatedAt?.toISOString(),
        user: {
          userId: c.User?.UserId.toString(),
          fullName: c.User?.FullName,
          username: c.User?.Username,
          avatarUrl: c.User?.AvatarUrl,
        },
        school: c.School
          ? {
              schoolId: c.School.SchoolId.toString(),
              schoolName: c.School.SchoolName,
            }
          : null,
        messageCount: c._count.ConversationMessage,
        messages: c.ConversationMessage.map((m) => ({
          messageId: m.MessageId.toString(),
          role: m.Role,
          content: m.Content,
          createdAt: m.CreatedAt?.toISOString(),
        })),
      }));
    }

    // 2. LẤY LỊCH SỬ TẢI XUỐNG
    if (tab === "all" || tab === "downloads") {
      const dlWhere = {
        ...userSchoolFilter,
        ...(search
          ? {
              OR: [
                { Document: { Title: { contains: search } } },
                { User: { FullName: { contains: search } } },
                { User: { Username: { contains: search } } },
              ],
            }
          : {}),
      };

      const rawDownloads = await prisma.downloadHistory.findMany({
        where: dlWhere,
        include: {
          User: {
            select: { UserId: true, FullName: true, Username: true },
          },
          Document: {
            select: {
              DocumentId: true,
              DocumentCode: true,
              Title: true,
              Visibility: true,
              School: { select: { SchoolName: true } },
            },
          },
          DocumentFile: {
            select: { FileName: true, FileExtension: true, FileSizeBytes: true },
          },
        },
        orderBy: { DownloadedAt: "desc" },
        take: limit,
      });

      downloads = rawDownloads.map((d) => ({
        downloadId: d.DownloadHistoryId.toString(),
        downloadedAt: d.DownloadedAt?.toISOString(),
        user: {
          userId: d.User?.UserId.toString(),
          fullName: d.User?.FullName,
          username: d.User?.Username,
        },
        document: {
          documentId: d.Document?.DocumentId.toString(),
          documentCode: d.Document?.DocumentCode,
          title: d.Document?.Title,
          schoolName: d.Document?.School?.SchoolName,
        },
        file: d.DocumentFile
          ? {
              fileName: d.DocumentFile.FileName,
              fileExtension: d.DocumentFile.FileExtension,
              fileSize: d.DocumentFile.FileSizeBytes
                ? Number(d.DocumentFile.FileSizeBytes)
                : 0,
            }
          : null,
      }));
    }

    // 3. LẤY LỊCH SỬ ĐỌC TÀI LIỆU
    if (tab === "all" || tab === "reading") {
      const readWhere = {
        ...userSchoolFilter,
        ...(search
          ? {
              OR: [
                { Document: { Title: { contains: search } } },
                { User: { FullName: { contains: search } } },
                { User: { Username: { contains: search } } },
              ],
            }
          : {}),
      };

      const rawReading = await prisma.readingHistory.findMany({
        where: readWhere,
        include: {
          User: {
            select: { UserId: true, FullName: true, Username: true },
          },
          Document: {
            select: {
              DocumentId: true,
              DocumentCode: true,
              Title: true,
              PageCount: true,
              School: { select: { SchoolName: true } },
            },
          },
        },
        orderBy: { LastReadAt: "desc" },
        take: limit,
      });

      reading = rawReading.map((r) => ({
        readingId: r.ReadingHistoryId.toString(),
        lastReadAt: r.LastReadAt?.toISOString(),
        lastPage: r.LastPage || 1,
        progressPercent: r.ProgressPercent ? Number(r.ProgressPercent) : 0,
        user: {
          userId: r.User?.UserId.toString(),
          fullName: r.User?.FullName,
          username: r.User?.Username,
        },
        document: {
          documentId: r.Document?.DocumentId.toString(),
          documentCode: r.Document?.DocumentCode,
          title: r.Document?.Title,
          totalPages: r.Document?.PageCount || 0,
          schoolName: r.Document?.School?.SchoolName,
        },
      }));
    }

    // 4. LẤY TÀI LIỆU YÊU THÍCH ĐƯỢC LƯU
    if (tab === "all" || tab === "favorites") {
      const favWhere = {
        ...userSchoolFilter,
        ...(search
          ? {
              OR: [
                { Document: { Title: { contains: search } } },
                { User: { FullName: { contains: search } } },
                { User: { Username: { contains: search } } },
              ],
            }
          : {}),
      };

      const rawFavourites = await prisma.favorite.findMany({
        where: favWhere,
        include: {
          User: {
            select: { UserId: true, FullName: true, Username: true },
          },
          Document: {
            select: {
              DocumentId: true,
              DocumentCode: true,
              Title: true,
              School: { select: { SchoolName: true } },
            },
          },
        },
        orderBy: { CreatedAt: "desc" },
        take: limit,
      });

      favorites = rawFavorites.map((f) => ({
        userId: f.UserId.toString(),
        documentId: f.DocumentId.toString(),
        createdAt: f.CreatedAt?.toISOString(),
        user: {
          fullName: f.User?.FullName,
          username: f.User?.Username,
        },
        document: {
          documentId: f.Document?.DocumentId.toString(),
          title: f.Document?.Title,
          schoolName: f.Document?.School?.SchoolName,
        },
      }));
    }

    return NextResponse.json({
      success: true,
      tab,
      data: {
        conversations,
        downloads,
        reading,
        favourites,
      },
      counts: {
        conversations: conversations.length,
        downloads: downloads.length,
        reading: reading.length,
        favourites: favourites.length,
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi Activity API:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi lấy nhật ký hoạt động." },
      { status: 500 }
    );
  }
}
