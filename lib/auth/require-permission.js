import { prisma } from "@/lib/prisma";
import { requireAuth } from "./require-auth";

export async function requirePermission(permissionCode) {
  const user = await requireAuth();

  // SUPER_ADMIN có toàn quyền
  if (user.roles.includes("SUPER_ADMIN")) {
    return user;
  }

  const permission = await prisma.permission.findFirst({
    where: {
      PermissionCode: permissionCode,
      RolePermission: {
        some: {
          Role: {
            UserRole: {
              some: {
                UserId: BigInt(user.userId),
              },
            },
          },
        },
      },
    },
  });

  if (!permission) {
    throw new Error("FORBIDDEN");
  }

  return user;
}