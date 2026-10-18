import { redirect } from "next/navigation";

export default function Home() {
  // Tự động chuyển hướng về trang đăng nhập
  // Nếu đã đăng nhập, middleware sẽ tự động chuyển hướng vào đúng /admin hoặc /school-admin
  redirect("/login");
}
