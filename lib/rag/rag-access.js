import { prisma } from "@/lib/prisma";

/**
 * Kiểm tra và lọc danh sách chunks được phép đưa vào RAG theo quyền người dùng
 * @param {Array<object>} chunks - Danh sách chunks thu thập từ bước tìm kiếm
 * @param {object} user - Thông tin người dùng hiện tại từ session/token
 * @returns {Promise<Array<object>>} Danh sách chunks hợp lệ được phép nạp vào Prompt
 */
export async function filterChunksForRAG(chunks, user) {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  // 1. Super Admin có toàn quyền truy cập phục vụ quản trị và nghiên cứu
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
  if (isSuperAdmin) {
    return chunks;
  }

  // 2. Thu thập danh sách DocumentId duy nhất từ các chunks
  const uniqueDocIds = [
    ...new Set(
      chunks
        .map((c) => (c.documentId || c.DocumentId)?.toString())
        .filter(Boolean)
    ),
  ].map((id) => BigInt(id));

  if (uniqueDocIds.length === 0) {
    return [];
  }

  // 3. Truy vấn các Document hợp lệ theo phạm vi trường và giấy phép
  const validDocuments = await prisma.document.findMany({
    where: {
      DocumentId: { in: uniqueDocIds },
      Status: "ACTIVE",
      OR: [
        { Visibility: "PUBLIC" },
        ...(user.schoolId ? [{ SchoolId: BigInt(user.schoolId) }] : []),
      ],
      // Loại trừ các tài liệu có License đang kích hoạt nhưng cấm RAG (CanUseForRAG = false)
      DocumentAccess: {
        none: {
          IsActive: true,
          License: {
            CanUseForRAG: false,
          },
        },
      },
    },
    select: {
      DocumentId: true,
    },
  });

  const validDocIdSet = new Set(
    validDocuments.map((doc) => doc.DocumentId.toString())
  );

  // 4. Trả về các chunk thuộc tài liệu hợp lệ
  return chunks.filter((chunk) => {
    const docId = (chunk.documentId || chunk.DocumentId)?.toString();
    return validDocIdSet.has(docId);
  });
}