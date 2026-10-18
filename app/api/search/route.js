import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildSchoolFilter } from "@/lib/auth/school-access";

export async function GET(request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const documentTypeId = searchParams.get("documentTypeId");
    const publicationYear = searchParams.get("publicationYear");
    const visibility = searchParams.get("visibility");
    const sortBy = searchParams.get("sortBy") || "relevance";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const pageSize = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(searchParams.get("pageSize") || "10", 10) || 10
      )
    );

    if (query.length > 200) {
      return NextResponse.json(
        { success: false, message: "Từ khóa không được vượt quá 200 ký tự." },
        { status: 400 }
      );
    }

    const schoolFilter = buildSchoolFilter(user);

    // Xây dựng mệnh đề WHERE linh hoạt
    const where = {
      ...schoolFilter,
      Status: "ACTIVE",
    };

    // Điều kiện tìm kiếm từ khóa
    if (query) {
      where.OR = [
        { Title: { contains: query } },
        { Description: { contains: query } },
        { Publisher: { contains: query } },
      ];
    }

    // Bộ lọc theo loại tài liệu
    if (documentTypeId) {
      where.DocumentTypeId = BigInt(documentTypeId);
    }

    // Bộ lọc theo năm xuất bản
    if (publicationYear) {
      where.PublicationYear = Number.parseInt(publicationYear, 10);
    }

    // Bộ lọc phạm vi hiển thị
    if (visibility) {
      where.Visibility = visibility;
    }

    // Cấu hình xếp hạng / thứ tự sắp xếp
    let orderBy = [{ DocumentId: "desc" }];
    if (sortBy === "title_asc") {
      orderBy = [{ Title: "asc" }, { DocumentId: "desc" }];
    } else if (sortBy === "year_desc") {
      orderBy = [{ PublicationYear: "desc" }, { DocumentId: "desc" }];
    } else if (sortBy === "year_asc") {
      orderBy = [{ PublicationYear: "asc" }, { DocumentId: "desc" }];
    }

    // Thực thi transaction lấy tổng số lượng và danh sách phân trang
    const [total, documents] = await prisma.$transaction([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        select: {
          DocumentId: true,
          DocumentCode: true,
          Title: true,
          Description: true,
          Publisher: true,
          PublicationYear: true,
          LanguageCode: true,
          PageCount: true,
          Visibility: true,
          CreatedAt: true,
          DocumentType: {
            select: {
              DocumentTypeId: true,
              TypeName: true,
              TypeCode: true,
            },
          },
          School: {
            select: {
              SchoolId: true,
              SchoolName: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Chuẩn hóa dữ liệu và serialize BigInt
    const formattedData = documents.map((doc) => ({
      ...doc,
      DocumentId: doc.DocumentId.toString(),
      DocumentType: doc.DocumentType
        ? {
            ...doc.DocumentType,
            DocumentTypeId: doc.DocumentType.DocumentTypeId.toString(),
          }
        : null,
      School: doc.School
        ? {
            ...doc.School,
            SchoolId: doc.School.SchoolId.toString(),
          }
        : null,
      Description: doc.Description
        ? doc.Description.slice(0, 300)
        : null,
      CreatedAt: doc.CreatedAt ? doc.CreatedAt.toISOString() : null,
    }));

    return NextResponse.json({
      success: true,
      query,
      filters: {
        documentTypeId: documentTypeId || null,
        publicationYear: publicationYear ? Number(publicationYear) : null,
        visibility: visibility || null,
        sortBy,
      },
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data: formattedData,
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

    console.error("Search API error:", error);

    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tìm kiếm." },
      { status: 500 }
    );
  }
}