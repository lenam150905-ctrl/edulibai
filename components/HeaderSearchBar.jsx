"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HeaderSearchBar({ basePath = "/admin", selectedSchool = "all" }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const searchBoxRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const schoolParam = selectedSchool && selectedSchool !== "all" ? `&schoolId=${selectedSchool}` : "";
        const res = await fetch(`/api/search/quick?q=${encodeURIComponent(query.trim())}${schoolParam}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
          setOpen(true);
        }
      } catch (err) {
        console.error("Lỗi quick search:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedSchool]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      setOpen(false);
      const schoolParam = selectedSchool && selectedSchool !== "all" ? `&schoolId=${selectedSchool}` : "";
      router.push(`${basePath}/search?q=${encodeURIComponent(query.trim())}${schoolParam}`);
    }
  };

  const hasAnyResults =
    results &&
    (results.documents?.length > 0 ||
      results.users?.length > 0 ||
      results.schools?.length > 0);

  return (
    <div className="relative w-full max-w-md hidden md:block" ref={searchBoxRef}>
      <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 focus-within:ring-2 focus-within:ring-[#FF9800]/20 focus-within:border-[#FF9800] focus-within:bg-white transition shadow-2xs">
        <span className="text-gray-400 mr-2 text-sm">
          {loading ? "⏳" : "🔍"}
        </span>
        <input
          type="text"
          placeholder="Tìm kiếm tài liệu, người dùng, mã trường... (Enter)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (hasAnyResults) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder-gray-400"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="text-gray-400 hover:text-gray-600 text-xs px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* POPUP LIVE SEARCH PREVIEW */}
      {open && (
        <div className="absolute left-0 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-gray-50 animate-in fade-in duration-150">
          {/* 1. KẾT QUẢ TÀI LIỆU */}
          {results?.documents?.length > 0 && (
            <div className="p-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>📚 Học liệu ({results.documents.length})</span>
                <span className="text-[9px] text-[#FF9800]">Nhấn Enter để xem tất cả</span>
              </div>
              <div className="space-y-1">
                {results.documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setOpen(false);
                      router.push(`${basePath}/search?q=${encodeURIComponent(doc.title)}`);
                    }}
                    className="p-2 hover:bg-amber-50/50 rounded-xl cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {doc.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {doc.code} · {doc.school}
                      </p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium shrink-0">
                      {doc.visibility}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. KẾT QUẢ NGƯỜI DÙNG */}
          {results?.users?.length > 0 && (
            <div className="p-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                👥 Tài khoản người dùng ({results.users.length})
              </div>
              <div className="space-y-1">
                {results.users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setOpen(false);
                      router.push(`${basePath}/users?search=${encodeURIComponent(u.username)}`);
                    }}
                    className="p-2 hover:bg-blue-50/50 rounded-xl cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {u.fullName} <span className="text-gray-400 font-normal">(@{u.username})</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {u.code || "—"} · {u.school}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-600 hover:underline shrink-0">
                      Xem hồ sơ →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. KẾT QUẢ TRƯỜNG HỌC */}
          {results?.schools?.length > 0 && (
            <div className="p-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                🏛️ Trường học ({results.schools.length})
              </div>
              <div className="space-y-1">
                {results.schools.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setOpen(false);
                      if (basePath === "/admin") {
                        router.push(`${basePath}/schools?search=${encodeURIComponent(s.name)}`);
                      } else {
                        router.push(`${basePath}`);
                      }
                    }}
                    className="p-2 hover:bg-emerald-50/50 rounded-xl cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {s.name}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold">{s.code}</p>
                    </div>
                    <span className="text-[10px] text-emerald-600 hover:underline shrink-0">
                      Chi tiết →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasAnyResults && (
            <div className="p-6 text-center text-xs text-gray-400">
              <span>🔍</span> Không tìm thấy kết quả nào phù hợp với &quot;{query}&quot;.
            </div>
          )}

          {/* FOOTER ENTER */}
          <div className="p-2.5 bg-gray-50/80 text-center">
            <button
              onClick={() => {
                setOpen(false);
                const schoolParam = selectedSchool && selectedSchool !== "all" ? `&schoolId=${selectedSchool}` : "";
                router.push(`${basePath}/search?q=${encodeURIComponent(query.trim())}${schoolParam}`);
              }}
              className="text-xs font-semibold text-[#FF9800] hover:text-[#F57C00] transition"
            >
              Mở trang tìm kiếm nâng cao cho &quot;{query}&quot; (Enter) →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
