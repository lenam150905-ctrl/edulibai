import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET: Lấy danh sách thông báo và số lượng chưa đọc của người dùng
 */
export async function GET(request) {
  try {
    const auth = await requireAuth();
    const userId = Number(auth.userId);
    const schoolId = auth.schoolId ? Number(auth.schoolId) : null;

    // Dùng raw query an toàn, tương thích trực tiếp với bảng dbo.Notification trong SQL Server
    const query = `
      SELECT NotificationId, UserId, SchoolId, Title, Message, Type, IsRead, Link, CreatedAt
      FROM dbo.Notification
      WHERE (UserId = ${userId} 
             ${schoolId ? `OR (SchoolId = ${schoolId} AND UserId IS NULL)` : ""}
             OR (UserId IS NULL AND SchoolId IS NULL))
      ORDER BY CreatedAt DESC
    `;

    const notifications = await prisma.$queryRawUnsafe(query);

    const unreadCount = notifications.filter((n) => !n.IsRead).length;

    const formatted = notifications.map((n) => ({
      notificationId: n.NotificationId.toString(),
      title: n.Title,
      message: n.Message,
      type: n.Type,
      isRead: Boolean(n.IsRead),
      link: n.Link || null,
      createdAt: n.CreatedAt ? new Date(n.CreatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      unreadCount,
      data: formatted,
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi lấy thông báo:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi lấy thông báo." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Đánh dấu đã đọc một thông báo hoặc toàn bộ thông báo
 */
export async function PATCH(request) {
  try {
    const auth = await requireAuth();
    const userId = Number(auth.userId);
    const body = await request.json();
    const { notificationId, markAll = false } = body;

    if (markAll) {
      await prisma.$executeRawUnsafe(`
        UPDATE dbo.Notification
        SET IsRead = 1
        WHERE UserId = ${userId} AND IsRead = 0
      `);

      return NextResponse.json({
        success: true,
        message: "Đã đánh dấu tất cả thông báo là đã đọc.",
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "Vui lòng cung cấp notificationId." },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(`
      UPDATE dbo.Notification
      SET IsRead = 1
      WHERE NotificationId = ${Number(notificationId)}
    `);

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật trạng thái thông báo.",
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi cập nhật thông báo:", error);
    return NextResponse.json(
      { success: false, message: "Không thể cập nhật thông báo." },
      { status: 500 }
    );
  }
}

/**
 * POST: Tạo thông báo mới (phục vụ Real-time / hệ thống gửi thông báo)
 */
export async function POST(request) {
  try {
    const auth = await requireAuth();
    const body = await request.json();
    const { userId, schoolId, title, message, type = "INFO", link = null } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: "Tiêu đề và nội dung thông báo là bắt buộc." },
        { status: 400 }
      );
    }

    const safeTitle = title.replace(/'/g, "''");
    const safeMessage = message.replace(/'/g, "''");
    const safeLink = link ? `'${link.replace(/'/g, "''")}'` : "NULL";
    const targetUserId = userId ? Number(userId) : "NULL";
    const targetSchoolId = schoolId ? Number(schoolId) : "NULL";

    await prisma.$executeRawUnsafe(`
      INSERT INTO dbo.Notification (UserId, SchoolId, Title, Message, Type, IsRead, Link, CreatedAt)
      VALUES (${targetUserId}, ${targetSchoolId}, N'${safeTitle}', N'${safeMessage}', '${type}', 0, ${safeLink}, SYSDATETIME())
    `);

    return NextResponse.json({
      success: true,
      message: "Đã tạo thông báo thành công.",
    });
  } catch (error) {
    console.error("Lỗi tạo thông báo:", error);
    return NextResponse.json(
      { success: false, message: "Không thể tạo thông báo." },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Xóa thông báo
 */
export async function DELETE(request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { success: false, message: "Vui lòng cung cấp id thông báo cần xóa." },
        { status: 400 }
      );
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM dbo.Notification
      WHERE NotificationId = ${Number(notificationId)}
    `);

    return NextResponse.json({
      success: true,
      message: "Đã xóa thông báo thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa thông báo:", error);
    return NextResponse.json(
      { success: false, message: "Không thể xóa thông báo." },
      { status: 500 }
    );
  }
}
