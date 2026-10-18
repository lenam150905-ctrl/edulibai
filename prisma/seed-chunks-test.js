const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Hàm tạo vector giả lập có chiều sâu ngữ nghĩa (dimension = 4 để kiểm thử nhanh và trực quan)
function makeDummyVector(type) {
  // Dimension = 4: [CS/DSA, AI/LLM, Library/System, General]
  switch (type) {
    case "DSA":
      return [0.95, 0.1, 0.05, 0.2];
    case "RAG":
      return [0.15, 0.92, 0.85, 0.1];
    case "AI":
      return [0.25, 0.88, 0.15, 0.3];
    default:
      return [0.1, 0.1, 0.1, 0.1];
  }
}

function floatArrayToBuffer(vector) {
  const float32Array = new Float32Array(vector);
  return Buffer.from(float32Array.buffer);
}

async function main() {
  console.log("--- BẮT ĐẦU TẠO DOCUMENT CHUNKS VÀ EMBEDDINGS THỬ NGHIỆM ---");

  const docs = await prisma.document.findMany({
    orderBy: { DocumentId: "asc" },
  });

  if (docs.length === 0) {
    console.error("Lỗi: Chưa có tài liệu nào trong bảng Document. Hãy chạy seed-search-test.js trước.");
    return;
  }

  // Dữ liệu chunk mẫu cho từng tài liệu
  const sampleChunks = [
    {
      documentCode: "DO000001", // Cấu trúc dữ liệu
      chunks: [
        {
          index: 1,
          page: 12,
          content: "Cây nhị phân tìm kiếm (Binary Search Tree - BST) là cấu trúc dữ liệu cây trong đó mỗi nút có tối đa hai con và khóa của nút con bên trái luôn nhỏ hơn khóa của nút gốc.",
          vectorType: "DSA",
        },
        {
          index: 2,
          page: 45,
          content: "Thuật toán sắp xếp nhanh QuickSort có độ phức tạp trung bình là O(n log n), sử dụng chiến lược chia để trị để phân hoạch mảng xung quanh một phần tử chốt.",
          vectorType: "DSA",
        },
      ],
    },
    {
      documentCode: "DO000002", // RAG trong thư viện số
      chunks: [
        {
          index: 1,
          page: 3,
          content: "Retrieval-Augmented Generation (RAG) kết hợp tìm kiếm ngữ nghĩa với mô hình ngôn ngữ lớn để trích xuất tri thức chính xác từ cơ sở dữ liệu học liệu số đa trường.",
          vectorType: "RAG",
        },
        {
          index: 2,
          page: 7,
          content: "Kỹ thuật Hybrid Search kết hợp xếp hạng tương hỗ Reciprocal Rank Fusion (RRF) giữa tìm kiếm từ khóa BM25 và vector embedding giúp tăng đáng kể chỉ số Recall@5.",
          vectorType: "RAG",
        },
      ],
    },
    {
      documentCode: "DO000003", // AI và ML căn bản
      chunks: [
        {
          index: 1,
          page: 25,
          content: "Mạng nơ-ron nhân tạo học các trọng số thông qua thuật toán lan truyền ngược Backpropagation và hàm tối ưu hóa Gradient Descent.",
          vectorType: "AI",
        },
      ],
    },
  ];

  for (const item of sampleChunks) {
    const doc = docs.find((d) => d.DocumentCode === item.documentCode);
    if (!doc) continue;

    for (const chunkData of item.chunks) {
      // 1. Tạo DocumentChunk
      const createdChunk = await prisma.documentChunk.create({
        data: {
          DocumentId: doc.DocumentId,
          ChunkIndex: chunkData.index,
          PageNumber: chunkData.page,
          Content: chunkData.content,
          TokenCount: chunkData.content.split(/\s+/).length,
        },
      });

      // 2. Tạo Embedding cho Chunk đó (Lưu nhị phân vào Bytes của SQL Server)
      const vector = makeDummyVector(chunkData.vectorType);
      const vectorBuffer = floatArrayToBuffer(vector);

      await prisma.embedding.create({
        data: {
          ChunkId: createdChunk.ChunkId,
          ModelName: "text-embedding-3-small-demo",
          Dimension: vector.length,
          VectorData: vectorBuffer,
        },
      });

      console.log(`Đã tạo Chunk [${createdChunk.ChunkId}] và Embedding cho tài liệu: ${doc.DocumentCode}`);
    }
  }

  console.log("--- HOÀN TẤT SEED CHUNKS VÀ EMBEDDINGS THÀNH CÔNG ---");
}

main()
  .catch((e) => {
    console.error("Lỗi:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });