import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * Tự động tạo mã người dùng kế tiếp: US000001 -> US000002 -> ...
 */
async function generateNextUserCode(prismaClient) {
  const lastUser = await prismaClient.user.findFirst({
    orderBy: { UserId: "desc" },
    select: { UserCode: true },
  });

  if (!lastUser?.UserCode) {
    return "US000001";
  }

  const match = lastUser.UserCode.match(/^US(\d+)$/);
  if (!match) {
    return "US000001";
  }

  const nextNumber = parseInt(match[1], 10) + 1;
  return `US${nextNumber.toString().padStart(6, "0")}`;
}

/**
 * GET: Lấy danh sách tài khoản kèm vai trò và trường
 */
export async function GET(request) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
    const isSchoolAdmin =
      user?.roles?.includes("SCHOOL_ADMIN") || user?.role === "SCHOOL_ADMIN";

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền xem danh sách người dùng." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const requestedSchoolId = searchParams.get("schoolId");

    // Nếu là School Admin thì bắt buộc chỉ xem người dùng trường mình
    const effectiveSchoolId = !isSuperAdmin
      ? user.schoolId
      : requestedSchoolId;

    const users = await prisma.user.findMany({
      where: {
        ...(effectiveSchoolId && { SchoolId: BigInt(effectiveSchoolId) }),
        ...(search && {
          OR: [
            { Username: { contains: search } },
            { FullName: { contains: search } },
            { Email: { contains: search } },
          ],
        }),
      },
      include: {
        School: {
          select: {
            SchoolId: true,
            SchoolCode: true,
            SchoolName: true,
          },
        },
        UserRole: {
          include: {
            Role: true,
          },
        },
      },
      orderBy: {
        UserId: "desc",
      },
    });

    const data = users.map((u) => ({
      userId: u.UserId.toString(),
      userCode: u.UserCode,
      username: u.Username,
      email: u.Email,
      fullName: u.FullName,
      isActive: u.IsActive,
      school: u.School
        ? {
            schoolId: u.School.SchoolId.toString(),
            schoolCode: u.School.SchoolCode,
            schoolName: u.School.SchoolName,
          }
        : null,
      roles: u.UserRole.map((ur) => ur.Role.RoleCode),
      createdAt: u.CreatedAt?.toISOString(),
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
    console.error("Lỗi lấy danh sách user:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi lấy danh sách tài khoản." },
      { status: 500 }
    );
  }
}

/**
 * POST: Tạo tài khoản người dùng mới và phân quyền
 */
export async function POST(request) {
  try {
    const user = await requireAuth();
    const isSuperAdmin =
      user?.roles?.includes("SUPER_ADMIN") || user?.role === "SUPER_ADMIN";
    const isSchoolAdmin =
      user?.roles?.includes("SCHOOL_ADMIN") || user?.role === "SCHOOL_ADMIN";

    if (!isSuperAdmin && !isSchoolAdmin) {
      return NextResponse.json(
        { success: false, message: "Bạn không có quyền tạo người dùng." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, email, fullName, schoolId, roleCode = "STUDENT" } = body;

    // School Admin không được tạo SUPER_ADMIN hoặc SCHOOL_ADMIN cho trường khác
    if (!isSuperAdmin && (roleCode === "SUPER_ADMIN" || roleCode === "SCHOOL_ADMIN")) {
      return NextResponse.json(
        { success: false, message: "Quản trị trường chỉ được tạo tài khoản Giảng viên, Thủ thư hoặc Sinh viên." },
        { status: 403 }
      );
    }

    const effectiveSchoolId = !isSuperAdmin ? user.schoolId : schoolId;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập Username và Password." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { Username: username.trim() },
          ...(email ? [{ Email: email.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Tên đăng nhập hoặc Email đã tồn tại." },
        { status: 409 }
      );
    }

    const role = await prisma.role.findFirst({
      where: { RoleCode: roleCode },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, message: `Vai trò ${roleCode} không tồn tại trong hệ thống.` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextUserCode = await generateNextUserCode(prisma);

    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          UserCode: nextUserCode,
          Username: username.trim(),
          PasswordHash: passwordHash,
          Email: email ? email.trim().toLowerCase() : null,
          FullName: fullName ? fullName.trim() : username.trim(),
          SchoolId: effectiveSchoolId ? BigInt(effectiveSchoolId) : null,
          IsActive: true,
        },
      });

      await tx.userRole.create({
        data: {
          UserId: createdUser.UserId,
          RoleId: role.RoleId,
        },
      });

      return createdUser;
    });

    return NextResponse.json({
      success: true,
      message: `Tạo tài khoản thành công với mã ${nextUserCode}.`,
      data: {
        userId: newUser.UserId.toString(),
        userCode: newUser.UserCode,
        username: newUser.Username,
        email: newUser.Email,
        fullName: newUser.FullName,
        role: roleCode,
        isActive: newUser.IsActive,
      },
    });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập." },
        { status: 401 }
      );
    }
    console.error("Lỗi tạo user:", error);
    return NextResponse.json(
      { success: false, message: "Đã xảy ra lỗi khi tạo người dùng." },
      { status: 500 }
    );
  }
}