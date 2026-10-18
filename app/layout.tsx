import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduLib AI - Thư viện số & Nghiên cứu khoa học",
  description: "Hệ thống thư viện số liên trường & nghiên cứu khoa học",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
