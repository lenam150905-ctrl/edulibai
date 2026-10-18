import { cookies } from "next/headers";
import { verifyAccessToken } from "./token";

export async function requireAuth() {
  const cookieStore = await cookies();

  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  try {
    const payload = await verifyAccessToken(token);

    return {
      userId: payload.userId,
      schoolId: payload.schoolId,
      roles: payload.roles || [],
    };
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}