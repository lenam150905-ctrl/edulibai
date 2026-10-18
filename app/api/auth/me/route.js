import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET() {
  try {
    const auth = await requireAuth();

    const user = await prisma.user.findUnique({
      where: {
        UserId: BigInt(auth.userId),
      },
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
        School: true,
      },
    });

    if (!user || !user.IsActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        UserId: user.UserId.toString(),
        Username: user.Username,
        Email: user.Email,
        FullName: user.FullName,
        SchoolId: user.SchoolId
          ? user.SchoolId.toString()
          : null,
        School: user.School
          ? {
              SchoolId: user.School.SchoolId.toString(),
              SchoolCode: user.School.SchoolCode,
              SchoolName: user.School.SchoolName,
            }
          : null,
        Roles: user.UserRole.map((item) => ({
          RoleId: item.Role.RoleId.toString(),
          RoleCode: item.Role.RoleCode,
          RoleName: item.Role.RoleName,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }
}