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

    // 1. Truy vấn các chunk hợp lệ theo phạm vi trường và trạng thái ACTIVE
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

    if (chunks.length === 0) {
      return NextResponse.json({
        success: true,
        query,
        topK,
        data: [],
      });
    }

    // 2. Chấm điểm & Xếp hạng BM25
    const bm25Docs = chunks.map((c) => ({
      id: c.ChunkId.toString(),
      text: c.Content,
    }));
    const bm25Ranked = calculateBM25(query, bm25Docs);

    // 3. Chấm điểm & Xếp hạng Vector Search
    const queryVector = getQueryVectorDemo(query);
    const vectorScored = chunks
      .filter((chunk) => chunk.Embedding && chunk.Embedding.length > 0)
      .map((chunk) => {
        const chunkVector = bufferToFloatArray(chunk.Embedding[0].VectorData);
        return {
          id: chunk.ChunkId.toString(),
          similarity: cosineSimilarity(queryVector, chunkVector),
        };
      });
    vectorScored.sort((a, b) => b.similarity - a.similarity);

    // 4. Hợp nhất thứ hạng bằng RRF (k = 60)
    const rrfResults = calculateRRF(bm25Ranked, vectorScored, 60);

    // 5. Kết hợp thông tin chi tiết và trả về Top-K
    const chunkMap = new Map(chunks.map((c) => [c.ChunkId.toString(), c]));

    const finalData = rrfResults.slice(0, topK).map((item, idx) => {
      const originalChunk = chunkMap.get(item.id);
      return {
        rank: idx + 1,
        chunkId: item.id,
        documentId: originalChunk.DocumentId.toString(),
        documentCode: originalChunk.Document.DocumentCode,
        documentTitle: originalChunk.Document.Title,
        pageNumber: originalChunk.PageNumber,
        chunkIndex: originalChunk.ChunkIndex,
        content: originalChunk.Content,
        rrfScore: item.rrfScore,
        bm25Rank: item.bm25Rank,
        vectorRank: item.vectorRank,
      };
    });

    return NextResponse.json({
      success: true,
      query,
      topK,
      fusionMethod: "Reciprocal Rank Fusion (RRF, k=60)",
      totalCandidates: chunks.length,
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

    console.error("Hybrid Search Error:", error);

    return NextResponse.json(
      { success: false, message: "Lỗi trong quá trình tìm kiếm Hybrid." },
      { status: 500 }
    );
  }
}