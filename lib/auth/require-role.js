import { requireAuth } from "./require-auth";

export async function requireRole(allowedRoles) {
  const user = await requireAuth();

  const hasRole = user.roles.some((role) =>
    allowedRoles.includes(role)
  );

  if (!hasRole) {
    throw new Error("FORBIDDEN");
  }

  return user;
}