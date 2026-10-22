
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

function serializeBigInt(data) {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(request) {
  try {
    const currentUser = await requireAuth();

    const currentUserId = BigInt(currentUser.userId);
    const userSchoolId = currentUser.schoolId
      ? BigInt(currentUser.schoolId)
      : null;

    const { searchParams } = new URL(request.url);

    const rawLimit = Number(searchParams.get("limit") || 8);
    const rawPage = Number(searchParams.get("page") || 1);
    const keyword = (searchParams.get("search") || "").trim();

    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 50)
      : 8;

    const page = Number.isFinite(rawPage)
      ? Math.max(Math.floor(rawPage), 1)
      : 1;

    const where = {
      Status: "ACTIVE",
      OR: [
        { Visibility: "PUBLIC" },
        ...(userSchoolId
          ? [
              {
                Visibility: "SCHOOL",
                SchoolId: userSchoolId,
              },
            ]
          : []),
      ],
    };

    if (keyword) {
      where.Title = {
        contains: keyword,
      };
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: {
          CreatedAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          DocumentId: true,
          DocumentCode: true,
          Title: true,
          Description: true,
          CoverImageUrl: true,
          Publisher: true,
          PublicationYear: true,
          PageCount: true,
          LanguageCode: true,
          Status: true,
          Visibility: true,
          CreatedAt: true,

          School: {
            select: {
              SchoolId: true,
              SchoolName: true,
              SchoolCode: true,
            },
          },

          DocumentType: {
            select: {
              TypeCode: true,
              TypeName: true,
            },
          },

          DocumentAuthor: {
            orderBy: {
              AuthorOrder: "asc",
            },
            select: {
              Author: {
                select: {
                  AuthorId: true,
                  FullName: true,
                },
              },
            },
          },

          DocumentFile: {
            where: {
              IsActive: true,
            },
            select: {
              DocumentFileId: true,
              FileName: true,
              FileExtension: true,
              FileSizeBytes: true,
            },
          },

          Favorite: {
            where: {
              UserId: currentUserId,
            },
            select: {
              UserId: true,
            },
          },
        },
      }),

      prisma.document.count({ where }),
    ]);

    const data = documents.map((document) => ({
      ...document,
      IsFavorite: document.Favorite.length > 0,
      Favorite: undefined,
      Authors: document.DocumentAuthor.map(
        (item) => item.Author
      ),
      DocumentAuthor: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách học liệu:", error);

    const message =
      error?.message || "Lỗi hệ thống khi tải danh sách học liệu.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: message.toLowerCase().includes("unauthorized")
          ? 401
          : 500,
      }
    );
  }
}
