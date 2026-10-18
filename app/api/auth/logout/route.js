import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Đăng xuất thành công",
  });

  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");

  return response;
}