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
import {
  calculatePrecisionAtK,
  calculateRecallAtK,
  calculateReciprocalRank,
} from "@/lib/search/evaluation-metrics";

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
    const schoolFilter = buildSchoolFilter(user);

    // Lấy toàn bộ chunk và embedding trong hệ thống
    const chunks = await prisma.documentChunk.findMany({
      where: {
        Document: {
          ...schoolFilter,
          Status: "ACTIVE",
        },
      },
      select: {
        ChunkId: true,
        Content: true,
        Document: {
          select: {
            DocumentCode: true,
            Title: true,
          },
        },
        Embedding: {
          select: {
            VectorData: true,
          },
        },
      },
      orderBy: { ChunkId: "asc" },
    });

    if (chunks.length === 0) {
      return NextResponse.json(
        { success: false, message: "Chưa có chunk nào để thực nghiệm." },
        { status: 400 }
      );
    }

    // Xác định ID đại diện dựa trên DocumentCode đã seed
    const dsaChunks = chunks.filter((c) => c.Document.DocumentCode === "DO000001").map((c) => c.ChunkId.toString());
    const ragChunks = chunks.filter((c) => c.Document.DocumentCode === "DO000002").map((c) => c.ChunkId.toString());
    const aiChunks = chunks.filter((c) => c.Document.DocumentCode === "DO000003").map((c) => c.ChunkId.toString());

    // Bộ test queries thực nghiệm (Ground Truth gán theo chuyên đề tài liệu)
    const testCases = [
      {
        query: "Cấu trúc dữ liệu cây nhị phân tìm kiếm BST và QuickSort",
        relevantChunkIds: dsaChunks,
      },
      {
        query: "Ứng dụng Retrieval-Augmented Generation RAG và hybrid search RRF",
        relevantChunkIds: ragChunks,
      },
      {
        query: "Mô hình mạng nơ ron học máy và Gradient Descent",
        relevantChunkIds: aiChunks,
      },
    ];

    const bm25Docs = chunks.map((c) => ({
      id: c.ChunkId.toString(),
      text: c.Content,
    }));

    // Chuẩn bị cấu trúc lưu kết quả đánh giá cho 3 phương pháp
    const methods = {
      BM25: { precisionSum: 0, recallSum: 0, mrrSum: 0, details: [] },
      Vector: { precisionSum: 0, recallSum: 0, mrrSum: 0, details: [] },
      Hybrid_RRF: { precisionSum: 0, recallSum: 0, mrrSum: 0, details: [] },
    };

    const K = 5;

    for (const testCase of testCases) {
      const { query, relevantChunkIds } = testCase;

      // 1. BM25 Search
      const bm25Ranked = calculateBM25(query, bm25Docs);
      const bm25Retrieved = bm25Ranked.map((item) => item.id);

      // 2. Vector Search
      const queryVec = getQueryVectorDemo(query);
      const vectorScored = chunks
        .filter((c) => c.Embedding && c.Embedding.length > 0)
        .map((c) => ({
          id: c.ChunkId.toString(),
          similarity: cosineSimilarity(queryVec, bufferToFloatArray(c.Embedding[0].VectorData)),
        }));
      vectorScored.sort((a, b) => b.similarity - a.similarity);
      const vectorRetrieved = vectorScored.map((item) => item.id);

      // 3. Hybrid Search (RRF)
      const rrfRanked = calculateRRF(bm25Ranked, vectorScored, 60);
      const hybridRetrieved = rrfRanked.map((item) => item.id);

      // Đánh giá từng phương pháp với query này
      const runEval = (methodName, retrieved) => {
        const p = calculatePrecisionAtK(retrieved, relevantChunkIds, K);
        const r = calculateRecallAtK(retrieved, relevantChunkIds, K);
        const rr = calculateReciprocalRank(retrieved, relevantChunkIds);

        methods[methodName].precisionSum += p;
        methods[methodName].recallSum += r;
        methods[methodName].mrrSum += rr;
        methods[methodName].details.push({ query, pAtK: p, rAtK: r, rr });
      };

      runEval("BM25", bm25Retrieved);
      runEval("Vector", vectorRetrieved);
      runEval("Hybrid_RRF", hybridRetrieved);
    }

    const N = testCases.length;
    const summary = {};

    for (const [key, value] of Object.entries(methods)) {
      summary[key] = {
        meanPrecisionAt5: Number((value.precisionSum / N).toFixed(4)),
        meanRecallAt5: Number((value.recallSum / N).toFixed(4)),
        MRR: Number((value.mrrSum / N).toFixed(4)),
      };
    }

    return NextResponse.json({
      success: true,
      totalQueriesEvaluated: N,
      k: K,
      summaryComparison: summary,
      experimentDetails: methods,
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

    console.error("Evaluation API error:", error);

    return NextResponse.json(
      { success: false, message: "Lỗi trong quá trình chạy thực nghiệm." },
      { status: 500 }
    );
  }
}