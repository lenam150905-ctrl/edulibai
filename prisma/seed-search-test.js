const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- BẮT ĐẦU CHÈN DỮ LIỆU TÀI LIỆU THỬ NGHIỆM CHO MỤC 6.2 ---");

  // Lấy school và user có sẵn
  const school = await prisma.school.findFirst();
  const adminUser = await prisma.user.findFirst();

  if (!school || !adminUser) {
    console.error("Lỗi: Cần có ít nhất 1 School và 1 User trong database.");
    return;
  }

  const sampleDocuments = [
    {
      SchoolId: school.SchoolId,
      OwnerUserId: adminUser.UserId,
      DocumentTypeId: BigInt(2), // TEXTBOOK (Giáo trình)
      DocumentCode: "DO000001",
      Title: "Giáo trình Cấu trúc dữ liệu và Giải thuật",
      Description: "Tài liệu giảng dạy về các cấu trúc dữ liệu cơ bản như danh sách liên kết, cây nhị phân, đồ thị và các thuật toán sắp xếp, tìm kiếm nâng cao.",
      Publisher: "NXB Đại học Quốc gia",
      PublicationYear: 2023,
      LanguageCode: "vi",
      PageCount: 350,
      Status: "ACTIVE",
      Visibility: "SCHOOL",
    },
    {
      SchoolId: school.SchoolId,
      OwnerUserId: adminUser.UserId,
      DocumentTypeId: BigInt(5), // RESEARCH_PAPER (Bài nghiên cứu)
      DocumentCode: "DO000002",
      Title: "Nghiên cứu ứng dụng Retrieval-Augmented Generation (RAG) trong thư viện số",
      Description: "Bài báo phân tích phương pháp kết hợp mô hình ngôn ngữ lớn LLM và tìm kiếm ngữ nghĩa vector để xây dựng hệ thống hỏi đáp thông minh.",
      Publisher: "Tạp chí Khoa học & Công nghệ",
      PublicationYear: 2024,
      LanguageCode: "vi",
      PageCount: 15,
      Status: "ACTIVE",
      Visibility: "SCHOOL",
    },
    {
      SchoolId: school.SchoolId,
      OwnerUserId: adminUser.UserId,
      DocumentTypeId: BigInt(1), // BOOK (Sách)
      DocumentCode: "DO000003",
      Title: "Trí tuệ nhân tạo và Học máy căn bản",
      Description: "Tổng quan các thuật toán Machine Learning, xử lý ngôn ngữ tự nhiên NLP và ứng dụng thực tiễn trong hệ thống tìm kiếm thông tin.",
      Publisher: "NXB Thông tin và Truyền thông",
      PublicationYear: 2022,
      LanguageCode: "vi",
      PageCount: 280,
      Status: "ACTIVE",
      Visibility: "PUBLIC",
    },
  ];

  for (const doc of sampleDocuments) {
    const created = await prisma.document.create({
      data: doc,
    });
    console.log(`Đã tạo tài liệu mẫu: [${created.DocumentId}] ${created.DocumentCode} - ${created.Title}`);
  }

  console.log("--- HOÀN TẤT CHÈN DỮ LIỆU THỬ NGHIỆM ---");
}

main()
  .catch((e) => {
    console.error("Lỗi khi seed:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });