"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * TokenAutoRefresher:
 * - Định kỳ làm mới access_token ngầm mỗi 10 phút (access_token có thời hạn 15 phút).
 * - Sử dụng cơ chế Cooldown (tối thiểu 5 phút giữa các lần gọi) để triệt tiêu tình trạng gọi refresh liên tục.
 * - KHÔNG can thiệp (monkey-patch) vào window.fetch để tránh xung đột vòng lặp với Polling thông báo.
 * - Nếu refresh_token hết hạn (trả về 401), dừng timer ngay lập tức và chuyển về /login.
 */
export default function TokenAutoRefresher() {
  const router = useRouter();
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    const doRefresh = async () => {
      // 1. Kiểm tra Cooldown: nếu vừa làm mới trong vòng 5 phút thì bỏ qua
      const now = Date.now();
      if (now - lastRefreshTimeRef.current < 5 * 60 * 1000) {
        return;
      }

      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          lastRefreshTimeRef.current = Date.now();
        } else if (res.status === 401) {
          // Phiên làm việc đã hết hạn (refresh_token không còn hiệu lực)
          // Dừng ngay lập tức để không bao giờ gửi lại
          if (timerRef.current) clearInterval(timerRef.current);
          router.replace("/login");
        }
      } catch (err) {
        console.warn("Lỗi làm mới access token:", err);
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Định kỳ kiểm tra và làm mới mỗi 10 phút (600,000ms)
    timerRef.current = setInterval(() => {
      doRefresh();
    }, 10 * 60 * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [router]);

  return null;
}
