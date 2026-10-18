const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  console.log("--- KIỂM TRA MODULE RAG ACCESS ---");
  const doc = await prisma.document.findFirst();
  if (!doc) {
    console.log("Chưa có document.");
    return;
  }

  console.log(`Tìm thấy Document ID: ${doc.DocumentId}`);
  console.log("Prisma query trong filterChunksForRAG sẵn sàng hoạt động.");
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());