import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET: Tìm kiếm nhanh (Live Search) cho Header
 * Hỗ trợ tìm kiếm Tài liệu, Người dùng, Trường học theo từ khóa và trường học được chọn
 */
export async function GET(request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim();
    const requestedSchoolId = searchParams.get("schoolId");

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: { documents: [], users: [], schools: [] },
      });
    }

    const roles = user.roles || [];
    const isSuperAdmin = roles.includes("SUPER_ADMIN");
    const isSchoolAdmin = roles.includes("SCHOOL_ADMIN");

    // Lọc theo trường: Nếu School Admin thì bắt buộc theo trường mình, nếu Super Admin thì theo combobox
    const effectiveSchoolId = !isSuperAdmin
      ? user.schoolId
      : requestedSchoolId && requestedSchoolId !== "all"
      ? requestedSchoolId
      : null;

    const schoolFilter = effectiveSchoolId ? { SchoolId: BigInt(effectiveSchoolId) } : {};

    // 1. Tìm tài liệu
    const documentsPromise = prisma.document.findMany({
      where: {
        ...schoolFilter,
        OR: [
          { Title: { contains: query } },
          { DocumentCode: { contains: query } },
          { Description: { contains: query } },
        ],
      },
      select: {
        DocumentId: true,
        DocumentCode: true,
        Title: true,
        Visibility: true,
        Status: true,
        School: {
          select: { SchoolName: true, SchoolCode: true },
        },
      },
      take: 5,
    });

    // 2. Tìm người dùng
    const usersPromise = prisma.user.findMany({
      where: {
        ...schoolFilter,
        OR: [
          { Username: { contains: query } },
          { FullName: { contains: query } },
          { Email: { contains: query } },
          { UserCode: { contains: query } },
        ],
      },
      select: {
        UserId: true,
        UserCode: true,
        Username: true,
        FullName: true,
        Email: true,
        School: {
          select: { SchoolName: true },
        },
      },
      take: 5,
    });

    // 3. Tìm trường học (Chỉ Super Admin mới xem được mục này)
    const schoolsPromise = isSuperAdmin
      ? prisma.school.findMany({
          where: {
            OR: [
              { SchoolName: { contains: query } },
              { SchoolCode: { contains: query } },
              { Email: { contains: query } },
            ],
          },
          select: {
            SchoolId: true,
            SchoolCode: true,
            SchoolName: true,
          },
          take: 3,
        })
      : Promise.resolve([]);

    const [documents, users, schools] = await Promise.all([
      documentsPromise,
      usersPromise,
      schoolsPromise,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        documents: documents.map((d) => ({
          id: d.DocumentId.toString(),
          code: d.DocumentCode,
          title: d.Title,
          visibility: d.Visibility,
          school: d.School?.SchoolName || "Toàn hệ thống",
        })),
        users: users.map((u) => ({
          id: u.UserId.toString(),
          code: u.UserCode,
          username: u.Username,
          fullName: u.FullName,
          email: u.Email,
          school: u.School?.SchoolName || "Toàn hệ thống",
        })),
        schools: schools.map((s) => ({
          id: s.SchoolId.toString(),
          code: s.SchoolCode,
          name: s.SchoolName,
        })),
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi quick search:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tìm kiếm nhanh." },
      { status: 500 }
    );
  }
}
