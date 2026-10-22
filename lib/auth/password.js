
import bcrypt from "bcryptjs";

export async function verifyPassword(password, passwordHash) {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string" ||
    !password ||
    !passwordHash
  ) {
    return false;
  }

  try {
    return await bcrypt.compare(password, passwordHash);
  } catch (error) {
    console.error("Password verification error:", error.message);
    return false;
  }
}
