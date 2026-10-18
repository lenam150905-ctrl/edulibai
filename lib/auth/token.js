import { SignJWT, jwtVerify } from "jose";

const accessSecret = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET
);

const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET
);

export async function createAccessToken(user) {
  return new SignJWT({
    type: "access",
    userId: user.UserId.toString(),
    schoolId: user.SchoolId
      ? user.SchoolId.toString()
      : null,
    roles: user.UserRole.map((item) => item.Role.RoleCode),
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(accessSecret);
}

export async function createRefreshToken(user) {
  return new SignJWT({
    type: "refresh",
    userId: user.UserId.toString(),
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, accessSecret);

  if (payload.type !== "access") {
    throw new Error("INVALID_ACCESS_TOKEN");
  }

  return payload;
}

export async function verifyRefreshToken(token) {
  const { payload } = await jwtVerify(token, refreshSecret);

  if (payload.type !== "refresh") {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  return payload;
}