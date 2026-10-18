import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildSchoolFilter } from "@/lib/auth/school-access";
import {
  bufferToFloatArray,
  cosineSimilarity,
  calculateBM25,
} from "@/lib/search/vector-utils";

// Hàm ánh xạ từ khóa demo sang query vector (khi chưa kết nối API embedding thật)
function getQueryVectorDemo(query) {
  const q = query.toLowerCase();
  if (q.includes("rag") || q.includes("retrieval") || q.includes("ngữ nghĩa")) {
    return [0.15, 0.92, 0.85, 0.1]; // Gần với chủ đề RAG
  }
  if (q.includes("cây") || q.includes("thuật toán") || q.includes("sắp xếp") || q.includes("dsa")) {
    return [0.95, 0.1, 0.05, 0.2]; // Gần với cấu trúc dữ liệu
  }
  if (q.includes("nơ-ron") || q.includes("học máy") || q.includes("ai")) {
    return [0.25, 0.88, 0.15, 0.3]; // Gần với AI / Machine Learning
  }
  // Mặc định vector cân bằng
  return [0.5, 0.5, 0.5, 0.5];
}

export async function GET(request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const topK = Math.min(
      20,
      Math.max(1, Number.parseInt(searchParams.get("topK") || "5", 10) || 5)
    );

    if (!query) {
      return NextResponse.json({
        success: true,
        query: "",
        topK,
        data: [],
      });
    }

    const schoolFilter = buildSchoolFilter(user);

    // 1. Lấy danh sách chunk và embedding thuộc các tài liệu hợp lệ trong trường
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
            SchoolId: true,
          },
        },
        Embedding: {
          select: {
            ModelName: true,
            Dimension: true,
            VectorData: true,
          },
        },
      },
    });

    if (chunks.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        topK,
        data: [],
      });
    }

    // 2. Vector Search: Tính Cosine Similarity
    const queryVector = getQueryVectorDemo(query);

    const scoredChunks = chunks
      .filter((chunk) => chunk.Embedding && chunk.Embedding.length > 0)
      .map((chunk) => {
        const rawBytes = chunk.Embedding[0].VectorData;
        const chunkVector = bufferToFloatArray(rawBytes);
        const similarity = cosineSimilarity(queryVector, chunkVector);

        return {
          chunkId: chunk.ChunkId.toString(),
          documentId: chunk.DocumentId.toString(),
          documentCode: chunk.Document.DocumentCode,
          documentTitle: chunk.Document.Title,
          pageNumber: chunk.PageNumber,
          chunkIndex: chunk.ChunkIndex,
          content: chunk.Content,
          similarityScore: Number(similarity.toFixed(4)),
        };
      });

    // Sắp xếp theo Cosine Similarity giảm dần
    scoredChunks.sort((a, b) => b.similarityScore - a.similarityScore);
    const topVectorResults = scoredChunks.slice(0, topK);

    // 3. BM25 Baseline: Tính điểm từ khóa đối chứng
    const bm25Docs = chunks.map((c) => ({
      id: c.ChunkId.toString(),
      text: c.Content,
    }));
    const bm25Scores = calculateBM25(query, bm25Docs);
    const bm25ScoreMap = new Map(bm25Scores.map((item) => [item.id, Number(item.score.toFixed(4))]));

    // Gán thêm điểm BM25 vào kết quả trả về để tiện đối chiếu NCKH
    const finalData = topVectorResults.map((item) => ({
      ...item,
      bm25Score: bm25ScoreMap.get(item.chunkId) || 0,
    }));

    return NextResponse.json({
      success: true,
      query,
      topK,
      totalChunksSearched: chunks.length,
      data: finalData,
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

    console.error("Semantic search error:", error);

    return NextResponse.json(
      { success: false, message: "Lỗi trong quá trình tìm kiếm ngữ nghĩa." },
      { status: 500 }
    );
  }
}