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

// GET: Lấy danh sách tất cả các phiên chat của sinh viên
export async function GET(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        UserId: currentUserId,
      },
      orderBy: {
        UpdatedAt: "desc",
      },
      select: {
        ConversationId: true,
        Title: true,
        CreatedAt: true,
        UpdatedAt: true,
        _count: {
          select: { ConversationMessage: true },
        },
      },
    });

    const data = conversations.map((c) => ({
      ConversationId: c.ConversationId.toString(),
      Title: c.Title || "Đoạn chat mới",
      MessageCount: c._count.ConversationMessage,
      CreatedAt: c.CreatedAt,
      UpdatedAt: c.UpdatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách cuộc hội thoại:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lấy danh sách hội thoại." },
      { status: 500 }
    );
  }
}