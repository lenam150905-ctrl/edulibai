"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";

export default function DocumentProcessingModal({ documentId, onClose, onUpdated }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetchProcessing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/processing?documentId=${documentId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || "Không thể tải tiến trình xử lý.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối khi tải tiến trình xử lý.");
    } finally {
      setLoading(false);
    }
  }, [documentId, toast]);

  useEffect(() => {
    if (documentId) {
      fetchProcessing();
    }
  }, [documentId, fetchProcessing]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/documents/processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action: "retry" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã xử lý lại tài liệu thành công!");
        fetchProcessing();
        if (onUpdated) onUpdated();
      } else {
        toast.error(json.message || "Thao tác xử lý lại thất bại.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối khi kích hoạt xử lý lại.");
    } finally {
      setRetrying(false);
    }
  };

  const getStepBadge = (status) => {
    switch (status) {
      case "DONE":
        return <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">✓ Đã xong</span>;
      case "IN_PROGRESS":
        return <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 animate-pulse">⏳ Đang chạy</span>;
      case "ERROR":
        return <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200">✕ Lỗi</span>;
      default:
        return <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200">Chờ</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF9800] uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                P2 - Mục 5: Xử lý tài liệu
              </span>
              <span className="text-xs text-gray-400">ID: #{documentId}</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mt-1 line-clamp-1">
              Tiến Trình Xử Lý: {data?.title || "Đang tải..."}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400">
              <span className="inline-block animate-spin mr-2">⏳</span> Đang lấy thông tin tiến trình từ CSDL...
            </div>
          ) : data ? (
            <>
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Trạng thái</span>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    {data.status === "COMPLETED" ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> HOÀN TẤT
                      </span>
                    ) : data.status === "FAILED" ? (
                      <span className="text-rose-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> THẤT BẠI
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> ĐANG XỬ LÝ
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Đoạn Chunks</span>
                  <div className="mt-1 font-bold text-xs text-gray-800">
                    🧩 {data.chunkCount} đoạn
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Lần thử lại</span>
                  <div className="mt-1 font-bold text-xs text-gray-800">
                    🔄 {data.retryCount} lần
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Định dạng file</span>
                  <div className="mt-1 font-bold text-xs text-blue-600 uppercase">
                    📄 {data.file?.fileExtension || "PDF"}
                  </div>
                </div>
              </div>

              {/* 7 BƯỚC PIPELINE */}
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Quy Trình 7 Bước Tự Động Hóa (P2 - 5. Xử lý tài liệu)
                </h4>
                <div className="space-y-2.5">
                  {data.steps.map((step) => (
                    <div
                      key={step.stepId}
                      className="flex items-start justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {step.stepIndex}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{step.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                      <div className="shrink-0">{getStepBadge(step.status)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {data.errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <strong>Thông báo lỗi:</strong> {data.errorMessage}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={fetchProcessing}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-semibold transition"
          >
            Làm mới trạng thái
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-[#FF9800] hover:bg-[#F57C00] disabled:bg-amber-300 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {retrying ? (
                <>
                  <span className="animate-spin">⏳</span> Đang xử lý lại...
                </>
              ) : (
                <>
                  <span>🔄</span> Xử lý lại (Retry Pipeline)
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
