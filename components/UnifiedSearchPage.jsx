"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function UnifiedSearchPage({ basePath = "/admin" }) {
  const toast = useToast();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialSchool = searchParams.get("schoolId") || "all";

  const [query, setQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState("hybrid"); // "hybrid" | "fulltext" | "bm25" | "vector"
  const [topK, setTopK] = useState(10);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // AI RAG Chat state
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("results"); // "results" | "rag"

  // Modal Xem chi tiết tài liệu
  const [selectedDoc, setSelectedDoc] = useState(null);

  const lastUrlQueryRef = useRef(null);

  const performSearch = useCallback(async (searchQuery, mode = searchMode, limitK = topK) => {
    const qToSearch = searchQuery !== undefined ? searchQuery : query;
    if (!qToSearch || !qToSearch.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      let endpoint = "";
      if (mode === "hybrid" || mode === "bm25" || mode === "vector") {
        endpoint = `/api/search/hybrid?q=${encodeURIComponent(qToSearch.trim())}&topK=${limitK}&mode=${mode}`;
      } else {
        endpoint = `/api/search?q=${encodeURIComponent(qToSearch.trim())}&pageSize=${limitK}`;
      }

      const res = await fetch(endpoint);
      const json = await res.json();

      if (json.success) {
        if (mode === "fulltext") {
          // Normalize full-text results to match UI
          const normalized = (json.data || []).map((doc, idx) => ({
            chunkId: doc.documentId,
            rank: idx + 1,
            score: (1 - idx * 0.08).toFixed(2),
            documentId: doc.documentId,
            documentCode: doc.documentCode,
            title: doc.title,
            content: doc.description || "Nội dung tài liệu học tập trong hệ thống...",
            pageNumber: 1,
            fileType: doc.documentType?.typeCode || "PDF",
            school: doc.school || null,
          }));
          setResults(normalized);
        } else {
          setResults(json.data || []);
        }
      } else {
        toast.error(json.message || "Tìm kiếm thất bại.");
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ tìm kiếm.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchMode, topK, toast]); // Do NOT depend on query state here!

  // Tự động tìm kiếm nếu có query từ URL và URL thực sự thay đổi
  useEffect(() => {
    const qFromUrl = searchParams.get("q");
    if (qFromUrl !== null && qFromUrl !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = qFromUrl;
      setQuery(qFromUrl);
      if (qFromUrl.trim()) {
        performSearch(qFromUrl, searchMode, topK);
      }
    }
  }, [searchParams, performSearch, searchMode, topK]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(query, searchMode, topK);
  };

  // Hỏi đáp AI RAG
  const handleAskRAG = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || aiLoading) return;

    const currentQ = aiQuestion.trim();
    setAiQuestion("");
    setAiMessages((prev) => [
      ...prev,
      { role: "user", content: currentQ, timestamp: new Date().toLocaleTimeString() },
    ]);
    setAiLoading(true);

    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentQ, topK: 3 }),
      });
      const json = await res.json();

      if (json.success) {
        setAiMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.answer || json.message || "Không có phản hồi từ mô hình AI.",
            sources: json.sources || [],
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ ${json.message || "Không thể sinh câu trả lời lúc này."}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Lỗi kết nối dịch vụ AI RAG. Vui lòng thử lại sau.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Hệ Thống Tra Cứu & Tìm Kiếm Đa Phương Thức (TC6 & TC7)
          </h1>
          <p className="text-xs text-gray-500">
            Tìm kiếm Hybrid (BM25 + Vector RRF), phân hạng Top-K và trợ lý trí tuệ nhân tạo RAG
          </p>
        </div>

        {/* TAB CHUYỂN ĐỔI: KẾT QUẢ TÌM KIẾM / HỎI ĐÁP AI RAG */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("results")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === "results"
                ? "bg-white text-gray-900 shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            🔍 Danh Sách Kết Quả
          </button>
          <button
            onClick={() => setActiveTab("rag")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "rag"
                ? "bg-white text-[#FF9800] shadow-2xs font-bold"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>🤖</span> Trợ Lý AI RAG
          </button>
        </div>
      </div>

      {/* THANH TÌM KIẾM CHÍNH & BỘ CHỌN THUẬT TOÁN */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Nhập câu hỏi, từ khóa, khái niệm cần tra cứu..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#FF9800] focus:border-[#FF9800]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1 cursor-pointer"
                title="Xóa trắng ô tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {loading ? "Đang tìm..." : "Tìm Kiếm"}
          </button>
        </form>

        {/* TUỲ CHỌN PHƯƠNG PHÁP TÌM KIẾM VÀ TOP-K */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-50 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500">Thuật toán:</span>
            {[
              { id: "hybrid", label: "⚡ Hybrid (BM25 + Vector RRF)", color: "text-amber-700 bg-amber-50 border-amber-200" },
              { id: "vector", label: "🧠 Vector Cosine", color: "text-purple-700 bg-purple-50 border-purple-200" },
              { id: "bm25", label: "📑 BM25 Lexical", color: "text-blue-700 bg-blue-50 border-blue-200" },
              { id: "fulltext", label: "📄 Toàn văn chuẩn", color: "text-gray-700 bg-gray-50 border-gray-200" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSearchMode(m.id);
                  if (query.trim()) performSearch(query, m.id, topK);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                  searchMode === m.id
                    ? `${m.color} ring-1 ring-offset-1 ring-[#FF9800]`
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500">Giới hạn Top-K:</span>
            <select
              value={topK}
              onChange={(e) => {
                const k = Number(e.target.value);
                setTopK(k);
                if (query.trim()) performSearch(query, searchMode, k);
              }}
              className="border border-gray-200 px-2 py-1 rounded-lg text-xs outline-none bg-white font-semibold text-gray-700 cursor-pointer"
            >
              <option value="5">Top 5 kết quả</option>
              <option value="10">Top 10 kết quả</option>
              <option value="20">Top 20 kết quả</option>
            </select>
          </div>
        </div>
      </div>

      {/* NỘI DUNG CHÍNH DỰA THEO TAB */}
      {activeTab === "results" ? (
        /* DANH SÁCH KẾT QUẢ TÌM KIẾM (TC7) */
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-bold text-gray-900">
              Kết Quả Tra Cứu {searched ? `(${results.length} đoạn nội dung khớp)` : ""}
            </h2>
            {searched && (
              <span className="text-xs text-gray-400">
                Phương pháp: <strong className="text-gray-700 uppercase">{searchMode}</strong> | Top-K: {topK}
              </span>
            )}
          </div>

          {loading ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-2xs">
              <div className="text-3xl animate-bounce mb-2">⚡</div>
              <p className="text-xs font-semibold text-gray-600">
                Đang thực thi tìm kiếm vector & tính toán tương đồng BM25...
              </p>
            </div>
          ) : !searched ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-2xs text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm font-semibold text-gray-700">Chưa có truy vấn tìm kiếm</p>
              <p className="text-xs mt-1">
                Nhập từ khóa hoặc câu hỏi ở trên để hệ thống quét toàn văn và vector hóa nội dung
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-2xs text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm font-semibold text-gray-700">Không tìm thấy tài liệu phù hợp</p>
              <p className="text-xs mt-1">Thử đổi từ khóa hoặc chuyển sang chế độ Hybrid Search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.map((item, idx) => (
                <div
                  key={item.chunkId || idx}
                  className="bg-white border border-gray-100 hover:border-orange-200 rounded-2xl p-4 shadow-2xs transition hover:shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF9800] font-bold text-xs flex items-center justify-center shrink-0">
                        #{item.rank || idx + 1}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {item.documentCode || item.document?.documentCode || "DOC"}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">
                        {item.title || item.document?.title || "Tài liệu học tập"}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.pageNumber && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                          Trang {item.pageNumber}
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Score: {item.score !== undefined ? item.score : "1.00"}
                      </span>
                    </div>
                  </div>

                  {/* ĐOẠN NỘI DUNG KHỚP (SNIPPET) */}
                  <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 text-xs text-gray-700 leading-relaxed font-sans">
                    <p className="line-clamp-3">
                      {item.content || item.text || "Đoạn văn bản trích dẫn liên quan..."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-gray-400">
                      Mã chunk: <code className="font-mono text-gray-600">#{item.chunkId}</code>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedDoc(item);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                      >
                        👁️ Xem chi tiết
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("rag");
                          setAiQuestion(`Tóm tắt nội dung tài liệu "${item.title || item.document?.title || "này"}"`);
                        }}
                        className="text-xs font-semibold text-[#FF9800] hover:text-[#F57C00] transition cursor-pointer flex items-center gap-1"
                      >
                        🤖 Hỏi AI RAG
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* KHUNG HỎI ĐÁP AI RAG TRỰC QUAN (TC11) */
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>🤖</span> Trợ Lý AI Học Liệu (Retrieval-Augmented Generation)
              </h2>
              <p className="text-xs text-gray-400">
                Đặt câu hỏi tự nhiên, mô hình AI sẽ tìm kiếm các đoạn trích liên quan và trả lời kèm trích dẫn
              </p>
            </div>
            {aiMessages.length > 0 && (
              <button
                onClick={() => setAiMessages([])}
                className="text-xs text-gray-400 hover:text-rose-600 transition cursor-pointer"
              >
                Xóa hội thoại 🗑️
              </button>
            )}
          </div>

          {/* DANH SÁCH TIN NHẮN */}
          <div className="min-h-[300px] max-h-[500px] overflow-y-auto space-y-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
            {aiMessages.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-xs font-semibold text-gray-600">Chưa có tin nhắn nào</p>
                <p className="text-[11px] mt-1">
                  Hãy gửi một câu hỏi để AI đối chiếu nguồn tài liệu số và tổng hợp câu trả lời
                </p>
              </div>
            ) : (
              aiMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#FF9800] text-white font-medium"
                        : "bg-white text-gray-800 border border-gray-100"
                    }`}
                  >
                    <div className="font-sans whitespace-pre-wrap">{msg.content}</div>

                    {/* HIỂN THỊ NGUỒN TÀI LIỆU TRÍCH DẪN (TC11) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                        <span className="font-bold text-gray-700 flex items-center gap-1">
                          📚 Nguồn trích dẫn học liệu:
                        </span>
                        <div className="space-y-1 mt-1">
                          {msg.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-gray-600"
                            >
                              <div className="font-semibold text-blue-600">
                                [{sIdx + 1}] {src.documentTitle || "Tài liệu tham chiếu"} (Trang {src.pageNumber || 1})
                              </div>
                              <p className="italic text-[10px] mt-0.5 text-gray-500 line-clamp-2">
                                &ldquo;{src.snippet || src.content}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))
            )}

            {aiLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 px-3 py-2 rounded-xl w-fit">
                <span className="animate-spin text-sm">⏳</span> AI đang tra cứu ngữ nghĩa & sinh câu trả lời...
              </div>
            )}
          </div>

          {/* Ô NHẬP CÂU HỎI */}
          <form onSubmit={handleAskRAG} className="flex gap-2">
            <input
              type="text"
              placeholder="Hỏi AI về bất kỳ nội dung nào trong kho học liệu..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              disabled={aiLoading}
              className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] focus:border-[#FF9800]"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiQuestion.trim()}
              className="px-5 py-2.5 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              Gửi Câu Hỏi
            </button>
          </form>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT ĐOẠN KHỚP */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedDoc.documentCode || "DOC"}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {selectedDoc.title || "Chi Tiết Đoạn Khớp"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400">Trang:</span>
                  <p className="font-semibold text-gray-800">Trang {selectedDoc.pageNumber || 1}</p>
                </div>
                <div>
                  <span className="text-gray-400">Điểm tương đồng:</span>
                  <p className="font-bold text-emerald-600">{selectedDoc.score || "1.00"}</p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-gray-700">Nội dung đoạn trích xuất:</span>
                <div className="mt-1 bg-gray-50 border border-gray-100 p-3 rounded-xl leading-relaxed text-gray-800 max-h-60 overflow-y-auto">
                  {selectedDoc.content || selectedDoc.text}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
