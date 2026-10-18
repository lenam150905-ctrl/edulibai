import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * Tự động tạo mã trường tiếp theo: SC000001 -> SC000002 -> ...
 */
async function generateNextSchoolCode(prismaClient) {
  const lastSchool = await prismaClient.school.findFirst({
    orderBy: { SchoolId: "desc" },
    select: { SchoolCode: true },
  });

  if (!lastSchool?.SchoolCode) {
    return "SC000001";
  }

  const match = lastSchool.SchoolCode.match(/^SC(\d+)$/);
  if (!match) {
    return "SC000001";
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  return `SC${nextNumber.toString().padStart(6, "0")}`;
}

export async function GET(request) {
  try {
    const user = await requireAuth();

    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền thực hiện thao tác này." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const schools = await prisma.school.findMany({
      where: search
        ? {
            OR: [
              { SchoolCode: { contains: search } },
              { SchoolName: { contains: search } },
              { Email: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: {
            User: true,
            Document: true,
          },
        },
      },
      orderBy: {
        SchoolId: "asc",
      },
    });

    const data = schools.map((s) => ({
      schoolId: s.SchoolId.toString(),
      schoolCode: s.SchoolCode,
      schoolName: s.SchoolName,
      email: s.Email,
      phone: s.Phone,
      address: s.Address,
      isActive: s.IsActive,
      createdAt: s.CreatedAt?.toISOString(),
      stats: {
        totalUsers: s._count.User,
        totalDocuments: s._count.Document,
      },
    }));

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi lấy danh sách trường:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi lấy danh sách trường học." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth();

    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ Super Admin mới có quyền tạo trường." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { schoolName, name, email, phone, address } = body;
    const finalSchoolName = (schoolName || name || "").trim();

    if (!finalSchoolName) {
      return NextResponse.json(
        { success: false, message: "Tên trường học là bắt buộc." },
        { status: 400 }
      );
    }

    // Tự sinh mã định dạng SC00000x
    const nextCode = await generateNextSchoolCode(prisma);

    const newSchool = await prisma.school.create({
      data: {
        SchoolCode: nextCode,
        SchoolName: finalSchoolName,
        Email: email ? email.trim().toLowerCase() : null,
        Phone: phone ? phone.trim() : null,
        Address: address ? address.trim() : null,
        IsActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tạo trường học mới thành công với mã ${nextCode}.`,
      data: {
        schoolId: newSchool.SchoolId.toString(),
        schoolCode: newSchool.SchoolCode,
        schoolName: newSchool.SchoolName,
        email: newSchool.Email,
        phone: newSchool.Phone,
        address: newSchool.Address,
        isActive: newSchool.IsActive,
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi tạo trường:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi thêm trường mới." },
      { status: 500 }
    );
  }
}