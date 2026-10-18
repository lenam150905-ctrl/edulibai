import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildSchoolFilter } from "@/lib/auth/school-access";
import {
  bufferToFloatArray,
  cosineSimilarity,
  calculateBM25,
  calculateRRF,
} from "@/lib/search/vector-utils";
import { filterChunksForRAG } from "@/lib/rag/rag-access";
import { generateRAGAnswer, isSmallTalk } from "@/lib/rag/llm-client";

// Hàm chuyển đổi từ khóa mô phỏng vector truy vấn (Dimension = 4)
function getQueryVectorDemo(query) {
  const q = query.toLowerCase();
  if (q.includes("rag") || q.includes("retrieval") || q.includes("ngữ nghĩa")) {
    return [0.15, 0.92, 0.85, 0.1];
  }
  if (q.includes("cây") || q.includes("thuật toán") || q.includes("sắp xếp") || q.includes("dsa")) {
    return [0.95, 0.1, 0.05, 0.2];
  }
  if (q.includes("nơ-ron") || q.includes("học máy") || q.includes("ai")) {
    return [0.25, 0.88, 0.15, 0.3];
  }
  return [0.5, 0.5, 0.5, 0.5];
}

export async function POST(request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { message, conversationId, topK = 3 } = body;

    const query = (message || "").trim();
    if (!query) {
      return NextResponse.json(
        { success: false, message: "Câu hỏi không được để trống." },
        { status: 400 }
      );
    }

    const schoolFilter = buildSchoolFilter(user);

    // 1. Quản lý Conversation & Kiểm tra bảo mật đa trường
    let activeConversation = null;
    const currentUserId = (user.userId || user.UserId || user.id)?.toString();
    const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";

    if (conversationId) {
      // Tìm phiên hội thoại được yêu cầu
      activeConversation = await prisma.conversation.findUnique({
        where: { ConversationId: BigInt(conversationId) },
      });

      // LỖI 1: Nếu truyền ID mà không tìm thấy trong database -> Báo lỗi 404
      if (!activeConversation) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Không tìm thấy phiên hội thoại với mã: ${conversationId}` 
          },
          { status: 404 }
        );
      }

      // LỖI 2: Kiểm tra quyền sở hữu và phạm vi trường học
      const isOwner = activeConversation.UserId.toString() === currentUserId;
      const isSameSchool = user.schoolId && activeConversation.SchoolId?.toString() === user.schoolId.toString();

      // Nếu không phải chủ sở hữu, không cùng trường và không phải Super Admin -> Chặn 403
      if (!isSuperAdmin && !isOwner && !isSameSchool) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Cảnh báo bảo mật: Bạn không có quyền truy cập vào phiên hội thoại này." 
          },
          { status: 403 }
        );
      }
    } else {
      // Chỉ tạo mới phiên khi người dùng KHÔNG truyền conversationId
      if (!currentUserId) {
        return NextResponse.json(
          { success: false, message: "Không xác định được danh tính người dùng." },
          { status: 401 }
        );
      }

      const userSchool = user.schoolId || user.SchoolId;
      const targetSchoolId = userSchool
        ? BigInt(userSchool)
        : (await prisma.school.findFirst())?.SchoolId;

      activeConversation = await prisma.conversation.create({
        data: {
          UserId: BigInt(currentUserId),
          SchoolId: targetSchoolId,
          Title: query.length > 50 ? query.slice(0, 47) + "..." : query,
        },
      });
    }

    // 2. Lưu câu hỏi của người dùng vào bảng ConversationMessage
    await prisma.conversationMessage.create({
      data: {
        ConversationId: activeConversation.ConversationId,
        Role: "USER",
        Content: query,
      },
    });

    // 3. Quy trình Truy xuất tài liệu (Retrieval Pipeline)
    let selectedContextChunks = [];
    const isGreeting = isSmallTalk(query);

    // Chỉ thực hiện truy xuất tài liệu nếu không phải câu chào hỏi xã giao
    if (!isGreeting) {
      const chunks = await prisma.documentChunk.findMany({
        where: {
          Document: {
            ...schoolFilter,
            Status: "ACTIVE",
          },
        },
        select: {
          ChunkId: true,
          DocumentId: true,
          ChunkIndex: true,
          PageNumber: true,
          Content: true,
          Document: {
            select: {
              Title: true,
              DocumentCode: true,
            },
          },
          Embedding: {
            select: {
              VectorData: true,
            },
          },
        },
      });

      if (chunks.length > 0) {
        // 3.1. Chấm điểm BM25
        const bm25Docs = chunks.map((c) => ({
          id: c.ChunkId.toString(),
          text: c.Content,
        }));
        const bm25Ranked = calculateBM25(query, bm25Docs);

        // 3.2. Chấm điểm Vector (Cosine Similarity)
        const queryVec = getQueryVectorDemo(query);
        const vectorScored = chunks
          .filter((c) => c.Embedding && c.Embedding.length > 0)
          .map((c) => ({
            id: c.ChunkId.toString(),
            similarity: cosineSimilarity(
              queryVec,
              bufferToFloatArray(c.Embedding[0].VectorData)
            ),
          }));
        vectorScored.sort((a, b) => b.similarity - a.similarity);

        // 3.3. Hợp nhất thứ hạng RRF
        const rrfRanked = calculateRRF(bm25Ranked, vectorScored, 60);

        // 3.4. Ghép lại dữ liệu đầy đủ cho từng chunk
        const chunkMap = new Map(chunks.map((c) => [c.ChunkId.toString(), c]));
        const candidateList = rrfRanked.map((item, idx) => {
          const original = chunkMap.get(item.id);
          return {
            rank: idx + 1,
            chunkId: original.ChunkId,
            documentId: original.DocumentId,
            documentTitle: original.Document.Title,
            documentCode: original.Document.DocumentCode,
            pageNumber: original.PageNumber,
            content: original.Content,
            score: item.rrfScore,
          };
        });

        // 3.5. Kiểm duyệt bản quyền cho RAG qua module 7.1
        const authorizedList = await filterChunksForRAG(candidateList, user);
        selectedContextChunks = authorizedList.slice(0, topK);
      }
    }

    // 4. Lấy ngữ cảnh lịch sử trò chuyện & Sinh câu trả lời RAG thông minh (như ChatGPT/Gemini)
    const previousMessages = await prisma.conversationMessage.findMany({
      where: {
        ConversationId: activeConversation.ConversationId,
      },
      orderBy: { CreatedAt: "asc" },
      take: 6,
    });
    const history = previousMessages.map((m) => ({
      role: m.Role.toLowerCase() === "user" ? "user" : "assistant",
      content: m.Content,
    }));

    const answerText = await generateRAGAnswer(
      query,
      selectedContextChunks,
      history
    );

    // 5. Lưu câu trả lời của Trợ lý vào bảng ConversationMessage
    const assistantMessage = await prisma.conversationMessage.create({
      data: {
        ConversationId: activeConversation.ConversationId,
        Role: "ASSISTANT",
        Content: answerText,
      },
    });

    // 6. Ghi vết nguồn tham khảo vào bảng MessageSource (nếu có tài liệu trích xuất)
    if (selectedContextChunks.length > 0) {
      for (let i = 0; i < selectedContextChunks.length; i++) {
        const item = selectedContextChunks[i];
        await prisma.messageSource.create({
          data: {
            MessageId: assistantMessage.MessageId,
            ChunkId: item.chunkId,
            DocumentId: item.documentId,
            PageNumber: item.pageNumber,
            SourceRank: i + 1,
            Score: item.score,
            CitationText: item.content.slice(0, 300),
          },
        });
      }
    }

    // Định dạng danh sách nguồn tài liệu đồng bộ cho giao diện
    const formattedCitations = selectedContextChunks.map((c, idx) => ({
      sourceNumber: idx + 1,
      chunkId: c.chunkId.toString(),
      documentId: c.documentId.toString(),
      documentCode: c.documentCode,
      documentTitle: c.documentTitle,
      pageNumber: c.pageNumber,
      score: c.score,
      snippet: c.content,
    }));

    // 7. Trả về client (cả citations và sources để tương thích hoàn toàn giao diện)
    return NextResponse.json({
      success: true,
      conversationId: activeConversation.ConversationId.toString(),
      messageId: assistantMessage.MessageId.toString(),
      answer: answerText,
      citations: formattedCitations,
      sources: formattedCitations,
    });

  } catch (error) {
    if (
      error.message === "UNAUTHORIZED" ||
      error.message === "SCHOOL_REQUIRED"
    ) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền truy cập." },
        { status: 401 }
      );
    }

    console.error("Lỗi API RAG Chat:", error);

    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi xử lý hội thoại RAG." },
      { status: 500 }
    );
  }
}