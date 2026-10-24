
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduLib AI - Thư viện số & Nghiên cứu khoa học",
  description: "Hệ thống thư viện số liên trường & nghiên cứu khoa học",
};

const themeInitScript = `
  (function () {
    try {
      var savedTheme = localStorage.getItem("edulib-theme");
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var theme = savedTheme || (systemDark ? "dark" : "light");

      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Script
          id="edulib-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {children}
      </body>
    </html>
  );
}
