
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request, { params }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "Mã hội thoại không hợp lệ." },
        { status: 400 }
      );
    }

    const conversationId = BigInt(id);
    const userId = (
      user.userId ?? user.UserId ?? user.id
    )?.toString();

    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") ||
      user?.role === "SUPER_ADMIN";

    const conversation = await prisma.conversation.findUnique({
      where: { ConversationId: conversationId },
      select: {
        ConversationId: true,
        UserId: true,
        Title: true,
        CreatedAt: true,
        UpdatedAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy hội thoại." },
        { status: 404 }
      );
    }

    if (
      !isSuperAdmin &&
      (!userId || conversation.UserId.toString() !== userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Bạn không có quyền xem hội thoại này.",
        },
        { status: 403 }
      );
    }

    const messages = await prisma.conversationMessage.findMany({
      where: { ConversationId: conversationId },
      orderBy: [
        { CreatedAt: "asc" },
        { MessageId: "asc" },
      ],
      select: {
        MessageId: true,
        Role: true,
        Content: true,
        CreatedAt: true,
      },
    });

    const assistantIds = messages
      .filter((m) => m.Role === "ASSISTANT")
      .map((m) => m.MessageId);

    const sources = assistantIds.length
      ? await prisma.messageSource.findMany({
          where: { MessageId: { in: assistantIds } },
          select: {
            MessageId: true,
            ChunkId: true,
            DocumentId: true,
            PageNumber: true,
            SourceRank: true,
            Score: true,
            CitationText: true,
          },
          orderBy: { SourceRank: "asc" },
        })
      : [];

    const sourceMap = new Map();

    for (const source of sources) {
      const key = source.MessageId.toString();

      if (!sourceMap.has(key)) {
        sourceMap.set(key, []);
      }

      sourceMap.get(key).push({
        sourceNumber: source.SourceRank,
        chunkId: source.ChunkId.toString(),
        documentId: source.DocumentId.toString(),
        pageNumber: source.PageNumber,
        score: source.Score,
        snippet: source.CitationText,
      });
    }

    const data = {
      conversationId: conversation.ConversationId.toString(),
      title: conversation.Title || "Đoạn chat mới",
      createdAt: conversation.CreatedAt,
      updatedAt: conversation.UpdatedAt,
      messages: messages.map((m) => ({
        id: m.MessageId.toString(),
        role:
          m.Role.toUpperCase() === "USER"
            ? "user"
            : "assistant",
        content: m.Content,
        createdAt: m.CreatedAt,
        citations: sourceMap.get(m.MessageId.toString()) || [],
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập lại." },
        { status: 401 }
      );
    }

    console.error("Lỗi lấy chi tiết hội thoại:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không thể tải nội dung hội thoại.",
      },
      { status: 500 }
    );
  }
}
