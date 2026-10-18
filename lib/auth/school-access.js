export function buildSchoolFilter(user) {
  // SUPER_ADMIN có quyền toàn hệ thống
  if (user.roles.includes("SUPER_ADMIN")) {
    return {};
  }

  // User thông thường bắt buộc phải thuộc một trường
  if (!user.schoolId) {
    throw new Error("SCHOOL_REQUIRED");
  }

  return {
    SchoolId: BigInt(user.schoolId),
  };
}