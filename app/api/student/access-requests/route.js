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

// 1. GET: Lấy danh sách các yêu cầu mượn học liệu của sinh viên
export async function GET(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);

    const requests = await prisma.accessRequest.findMany({
      where: {
        RequesterUserId: currentUserId,
      },
      orderBy: { CreatedAt: "desc" },
      include: {
        Document: {
          select: {
            DocumentId: true,
            DocumentCode: true,
            Title: true,
            CoverImageUrl: true,
          },
        },
        School_AccessRequest_OwnerSchoolIdToSchool: {
          select: {
            SchoolId: true,
            SchoolName: true,
            SchoolCode: true,
          },
        },
        User_AccessRequest_ReviewedByToUser: {
          select: {
            FullName: true,
          },
        },
      },
    });

    const data = requests.map((req) => ({
      AccessRequestId: req.AccessRequestId.toString(),
      Document: {
        DocumentId: req.Document.DocumentId.toString(),
        DocumentCode: req.Document.DocumentCode,
        Title: req.Document.Title,
        CoverImageUrl: req.Document.CoverImageUrl,
      },
      OwnerSchool: {
        SchoolId: req.School_AccessRequest_OwnerSchoolIdToSchool.SchoolId.toString(),
        SchoolName: req.School_AccessRequest_OwnerSchoolIdToSchool.SchoolName,
        SchoolCode: req.School_AccessRequest_OwnerSchoolIdToSchool.SchoolCode,
      },
      Reason: req.Reason,
      Status: req.Status, // PENDING, APPROVED, REJECTED
      ReviewedBy: req.User_AccessRequest_ReviewedByToUser?.FullName || null,
      ReviewedAt: req.ReviewedAt,
      CreatedAt: req.CreatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu mượn tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi lấy danh sách yêu cầu." },
      { status: 500 }
    );
  }
}

// 2. POST: Gửi phiếu yêu cầu mượn tài liệu liên trường mới
export async function POST(request) {
  try {
    const currentUser = await requireAuth();
    const currentUserId = BigInt(currentUser.userId);
    const requesterSchoolId = currentUser.schoolId ? BigInt(currentUser.schoolId) : null;

    if (!requesterSchoolId) {
      return NextResponse.json(
        { success: false, message: "Tài khoản của bạn chưa được liên kết với trường học nào." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { documentId, reason } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tài liệu cần mượn (documentId)." },
        { status: 400 }
      );
    }

    const docId = BigInt(documentId);

    // Kiểm tra tài liệu có tồn tại không
    const document = await prisma.document.findUnique({
      where: { DocumentId: docId },
      select: {
        DocumentId: true,
        SchoolId: true,
        Title: true,
        Visibility: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu yêu cầu." },
        { status: 404 }
      );
    }

    // Nếu tài liệu thuộc cùng trường thì không cần gửi yêu cầu liên trường
    if (document.SchoolId === requesterSchoolId) {
      return NextResponse.json(
        { success: false, message: "Tài liệu này thuộc trường của bạn, bạn đã có quyền truy cập trực tiếp." },
        { status: 400 }
      );
    }

    // Kiểm tra xem đã có yêu cầu nào đang PENDING chưa (tránh spam)
    const existingPending = await prisma.accessRequest.findFirst({
      where: {
        RequesterUserId: currentUserId,
        DocumentId: docId,
        Status: "PENDING",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { success: false, message: "Bạn đã có một yêu cầu đang chờ duyệt cho tài liệu này." },
        { status: 400 }
      );
    }

    // Tạo yêu cầu mới
    const newRequest = await prisma.accessRequest.create({
      data: {
        DocumentId: docId,
        RequesterSchoolId: requesterSchoolId,
        RequesterUserId: currentUserId,
        OwnerSchoolId: document.SchoolId,
        Reason: reason?.trim() || "Phục vụ mục đích học tập và nghiên cứu",
        Status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Gửi yêu cầu mượn học liệu thành công. Vui lòng chờ ban quản trị xét duyệt.",
      data: {
        AccessRequestId: newRequest.AccessRequestId.toString(),
        Status: newRequest.Status,
        CreatedAt: newRequest.CreatedAt,
      },
    });
  } catch (error) {
    console.error("Lỗi khi gửi yêu cầu mượn tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống khi gửi yêu cầu." },
      { status: 500 }
    );
  }
}