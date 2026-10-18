import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildSchoolFilter } from "@/lib/auth/school-access";

export async function GET(request) {
  try {
    const user = await requireAuth();
    const schoolFilter = buildSchoolFilter(user);

    // 1. Lọc theo trường cho các bảng có SchoolId trực tiếp
    const schoolCondition = user.schoolId ? { SchoolId: BigInt(user.schoolId) } : {};

    // 2. Chạy transaction lấy số liệu thống kê tổng thể
    const [
      totalDocuments,
      totalConversations,
      totalMessages,
      totalDownloads,
      totalCitations,
    ] = await prisma.$transaction([
      // Tổng số tài liệu ACTIVE
      prisma.document.count({
        where: {
          ...schoolFilter,
          Status: "ACTIVE",
        },
      }),
      // Tổng số phiên hội thoại
      prisma.conversation.count({
        where: schoolCondition,
      }),
      // Tổng số tin nhắn hỏi đáp
      prisma.conversationMessage.count({
        where: {
          Conversation: schoolCondition,
        },
      }),
      // Tổng số lượt tải xuống
      prisma.downloadHistory.count({
        where: {
          Document: schoolFilter,
        },
      }),
      // Tổng số lượt trích dẫn nguồn RAG
      prisma.messageSource.count({
        where: {
          Document: schoolFilter,
        },
      }),
    ]);

    // 3. Thống kê Top 5 tài liệu được trích dẫn nhiều nhất trong RAG
    const topCitedDocuments = await prisma.messageSource.groupBy({
      by: ["DocumentId"],
      where: {
        Document: schoolFilter,
      },
      _count: {
        DocumentId: true,
      },
      orderBy: {
        _count: {
          DocumentId: "desc",
        },
      },
      take: 5,
    });

    // Lấy thông tin chi tiết tên tài liệu cho Top trích dẫn
    const docIds = topCitedDocuments.map((item) => item.DocumentId);
    const docsInfo = await prisma.document.findMany({
      where: {
        DocumentId: { in: docIds },
      },
      select: {
        DocumentId: true,
        DocumentCode: true,
        Title: true,
      },
    });

    const docInfoMap = new Map(docsInfo.map((d) => [d.DocumentId.toString(), d]));

    const formattedTopDocs = topCitedDocuments.map((item) => {
      const doc = docInfoMap.get(item.DocumentId.toString());
      return {
        documentId: item.DocumentId.toString(),
        documentCode: doc ? doc.DocumentCode : "N/A",
        title: doc ? doc.Title : "Tài liệu không xác định",
        citationCount: item._count.DocumentId,
      };
    });

    // 4. Thống kê 5 phiên hội thoại gần nhất có bảo mật đa trường
    const recentConversations = await prisma.conversation.findMany({
      where: schoolCondition,
      select: {
        ConversationId: true,
        Title: true,
        CreatedAt: true,
        User: {
          select: {
            FullName: true,
            Username: true,
          },
        },
        _count: {
          select: { ConversationMessage: true },
        },
      },
      orderBy: {
        CreatedAt: "desc",
      },
      take: 5,
    });

    const formattedRecentConversations = recentConversations.map((c) => ({
      conversationId: c.ConversationId.toString(),
      title: c.Title,
      createdAt: c.CreatedAt.toISOString(),
      userName: c.User?.FullName || c.User?.Username || "Ẩn danh",
      messageCount: c._count.ConversationMessage,
    }));

    // 5. Trả kết quả thống kê
    return NextResponse.json({
      success: true,
      scope: user.schoolId ? `SCHOOL_${user.schoolId}` : "GLOBAL_SYSTEM",
      overview: {
        totalDocuments,
        totalConversations,
        totalMessages,
        totalDownloads,
        totalCitations,
        averageMessagesPerConversation:
          totalConversations > 0
            ? Number((totalMessages / totalConversations).toFixed(2))
            : 0,
      },
      topCitedDocuments: formattedTopDocs,
      recentConversations: formattedRecentConversations,
    });
  } catch (error) {
    if (
      error.message === "UNAUTHORIZED" ||
      error.message === "SCHOOL_REQUIRED"
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập thống kê." },
        { status: 401 }
      );
    }

    console.error("Lỗi API Analytics:", error);

    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tải dữ liệu thống kê." },
      { status: 500 }
    );
  }
}