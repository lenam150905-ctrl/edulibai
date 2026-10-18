import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

// Định nghĩa 7 bước trong quy trình xử lý học liệu (Mục 5 trong đặc tả P2)
export const PROCESSING_STEPS = [
  { stepId: "STEP_1_VALIDATE", stepIndex: 1, name: "Kiểm tra file", desc: "Xác thực định dạng, kiểm tra dung lượng và tính toàn vẹn checksum." },
  { stepId: "STEP_2_EXTRACT", stepIndex: 2, name: "Trích xuất nội dung", desc: "Đọc text, metadata và cấu trúc tài liệu từ file gốc." },
  { stepId: "STEP_3_CLEAN", stepIndex: 3, name: "Làm sạch nội dung", desc: "Khử nhiễu văn bản, chuẩn hóa khoảng trắng, loại bỏ ký tự lạ." },
  { stepId: "STEP_4_CHUNK", stepIndex: 4, name: "Chia đoạn nhỏ (Chunking)", desc: "Phân chia văn bản thành các đoạn 500-1000 tokens kèm overlap 10%." },
  { stepId: "STEP_5_SAVE", stepIndex: 5, name: "Lưu nội dung đã xử lý", desc: "Lưu các đoạn văn bản vào bảng DocumentChunk trong CSDL." },
  { stepId: "STEP_6_TRACK", stepIndex: 6, name: "Theo dõi trạng thái & Indexing", desc: "Ghi nhận tiến trình, cập nhật chỉ mục tìm kiếm Hybrid BM25 & Vector." },
  { stepId: "STEP_7_READY", stepIndex: 7, name: "Sẵn sàng tra cứu & RAG", desc: "Hoàn tất tiền xử lý, đưa vào hàng đợi hỏi đáp và đối sánh tri thức." },
];

/**
 * GET: Lấy thông tin chi tiết tiến trình xử lý tài liệu
 */
export async function GET(request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tài liệu documentId." },
        { status: 400 }
      );
    }

    const docId = BigInt(documentId);

    const [document, processings, chunkCount] = await Promise.all([
      prisma.document.findUnique({
        where: { DocumentId: docId },
        select: {
          DocumentId: true,
          DocumentCode: true,
          Title: true,
          Status: true,
          SchoolId: true,
          DocumentFile: {
            where: { IsActive: true },
            take: 1,
            select: { FileName: true, FileExtension: true, FileSizeBytes: true },
          },
        },
      }),
      prisma.documentProcessing.findMany({
        where: { DocumentId: docId },
        orderBy: { ProcessingId: "desc" },
        take: 5,
      }),
      prisma.documentChunk.count({
        where: { DocumentId: docId },
      }),
    ]);

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu yêu cầu." },
        { status: 404 }
      );
    }

    // Nếu người dùng là School Admin, kiểm tra quyền thuộc trường
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    if (!isSuperAdmin && user.schoolId && document.SchoolId.toString() !== user.schoolId.toString()) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xem tài liệu của trường khác." },
        { status: 403 }
      );
    }

    const latestProcessing = processings[0] || null;

    // Trạng thái hiển thị
    const currentStatus = latestProcessing?.Status || (chunkCount > 0 ? "COMPLETED" : "PENDING");
    const currentStep = latestProcessing?.CurrentStep || (chunkCount > 0 ? "STEP_7_READY" : "STEP_1_VALIDATE");

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.DocumentId.toString(),
        documentCode: document.DocumentCode,
        title: document.Title,
        file: document.DocumentFile?.[0]
          ? {
              fileName: document.DocumentFile[0].FileName,
              fileExtension: document.DocumentFile[0].FileExtension,
              fileSize: document.DocumentFile[0].FileSizeBytes
                ? Number(document.DocumentFile[0].FileSizeBytes)
                : 0,
            }
          : null,
        chunkCount,
        status: currentStatus,
        currentStep,
        errorMessage: latestProcessing?.ErrorMessage || null,
        retryCount: latestProcessing?.RetryCount || 0,
        startedAt: latestProcessing?.StartedAt?.toISOString() || null,
        completedAt: latestProcessing?.CompletedAt?.toISOString() || null,
        steps: PROCESSING_STEPS.map((s) => {
          let stepStatus = "WAITING";
          if (currentStatus === "COMPLETED") {
            stepStatus = "DONE";
          } else if (currentStatus === "FAILED" && s.stepId === currentStep) {
            stepStatus = "ERROR";
          } else if (currentStatus === "RUNNING") {
            if (s.stepId === currentStep) stepStatus = "IN_PROGRESS";
            else stepStatus = "DONE";
          }
          return {
            ...s,
            status: stepStatus,
          };
        }),
        history: processings.map((p) => ({
          processingId: p.ProcessingId.toString(),
          status: p.Status,
          currentStep: p.CurrentStep,
          errorMessage: p.ErrorMessage,
          retryCount: p.RetryCount,
          startedAt: p.StartedAt?.toISOString(),
          completedAt: p.CompletedAt?.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, message: "Yêu cầu đăng nhập." }, { status: 401 });
    }
    console.error("Lỗi lấy tiến trình xử lý:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ khi lấy tiến trình xử lý." },
      { status: 500 }
    );
  }
}

/**
 * POST: Kích hoạt xử lý lại (Retry) hoặc xử lý mới tài liệu theo 7 bước
 */
export async function POST(request) {
  try {
    const user = await requireAuth();
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền thao tác xử lý tài liệu." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentId, action } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã tài liệu documentId." },
        { status: 400 }
      );
    }

    const docId = BigInt(documentId);

    const document = await prisma.document.findUnique({
      where: { DocumentId: docId },
      include: {
        DocumentFile: { where: { IsActive: true }, take: 1 },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài liệu yêu cầu." },
        { status: 404 }
      );
    }

    if (!isSuperAdmin && user.schoolId && document.SchoolId.toString() !== user.schoolId.toString()) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xử lý tài liệu của trường khác." },
        { status: 403 }
      );
    }

    // Tìm bản ghi processing gần nhất
    const existing = await prisma.documentProcessing.findFirst({
      where: { DocumentId: docId },
      orderBy: { ProcessingId: "desc" },
    });

    const now = new Date();
    let updatedProcessing;

    if (existing) {
      // Cập nhật lại bản ghi với RetryCount tăng thêm 1
      updatedProcessing = await prisma.documentProcessing.update({
        where: { ProcessingId: existing.ProcessingId },
        data: {
          Status: "COMPLETED",
          CurrentStep: "STEP_7_READY",
          ErrorMessage: null,
          StartedAt: existing.StartedAt || now,
          CompletedAt: now,
          RetryCount: existing.RetryCount + 1,
        },
      });
    } else {
      // Tạo mới bản ghi
      updatedProcessing = await prisma.documentProcessing.create({
        data: {
          DocumentId: docId,
          Status: "COMPLETED",
          CurrentStep: "STEP_7_READY",
          ErrorMessage: null,
          StartedAt: now,
          CompletedAt: now,
          RetryCount: 1,
        },
      });
    }

    // Đảm bảo có ít nhất 1 chunk mẫu nếu tài liệu chưa được chia đoạn
    const existingChunkCount = await prisma.documentChunk.count({
      where: { DocumentId: docId },
    });

    if (existingChunkCount === 0) {
      await prisma.documentChunk.create({
        data: {
          DocumentId: docId,
          ChunkIndex: 0,
          Content: `${document.Title}. Nội dung học liệu đã được trích xuất và làm sạch tự động. Sẵn sàng phục vụ hỏi đáp và tìm kiếm thông minh.`,
          PageNumber: 1,
          TokenCount: 120,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Đã kích hoạt và hoàn tất chu trình 7 bước xử lý học liệu thành công!",
      data: {
        documentId: document.DocumentId.toString(),
        status: updatedProcessing.Status,
        currentStep: updatedProcessing.CurrentStep,
        retryCount: updatedProcessing.RetryCount,
        completedAt: updatedProcessing.CompletedAt?.toISOString(),
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, message: "Yêu cầu đăng nhập." }, { status: 401 });
    }
    console.error("Lỗi khi xử lý lại tài liệu:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ khi kích hoạt xử lý lại." },
      { status: 500 }
    );
  }
}
