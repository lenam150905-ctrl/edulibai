"use client";

import Link from "next/link";

export default function EduLibLogo({
  href = "/admin",
  subtitle = "Hệ Thống Thư Viện Số",
  showSubtitle = true,
  size = "md",
  className = "",
}) {
  const isSmall = size === "sm";

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 group select-none transition ${className}`}
      title="EduLib AI"
    >
      {/* 3D ISOMETRIC BOOK LOGO ICON */}
      <div
        className={`${
          isSmall ? "w-8 h-8" : "w-10 h-10"
        } rounded-xl bg-gradient-to-br from-[#FF9800] via-[#F57C00] to-[#E65100] flex items-center justify-center p-1.5 shadow-sm group-hover:shadow transition shrink-0`}
      >
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full" aria-hidden="true">
          <path d="M4 13 23 4l20 9v25L24 46 4 37V13Z" fill="#F7C844" />
          <path d="M24 12 8 19v17l16 7V12Z" fill="#FBE28A" />
          <path d="M24 12 40 19v17l-16 7V12Z" fill="#F29B17" />
          <path d="M24 12 8 19l16 8 16-8-16-7Z" fill="#FFF0B3" />
          <path d="M24 27v16" stroke="#D98512" strokeWidth="1.5" />
        </svg>
      </div>

      {/* BRAND TEXT & SUBTITLE */}
      <div className="leading-tight">
        <span
          className={`font-black tracking-tight text-gray-900 ${
            isSmall ? "text-base" : "text-lg"
          }`}
        >
          EduLib <span className="text-[#FF9800]">AI</span>
        </span>
        {showSubtitle && (
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
