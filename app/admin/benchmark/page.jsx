"use client";

import { useState } from "react";

export default function BenchmarkResearchPage() {
  const [running, setRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [error, setError] = useState("");

  const handleRunBenchmark = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/research/benchmark", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setBenchmarkResult(json);
      } else {
        setError(json.message || "Đã xảy ra lỗi khi chạy thực nghiệm.");
      }
    } catch (err) {
      setError("Không thể kết nối tới API thực nghiệm: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const methods = [
    { key: "BM25", name: "BM25 (Lexical Search)", tag: "Baseline truyền thống" },
    { key: "Vector", name: "Dense Vector (Cosine Similarity)", tag: "Tìm kiếm ngữ nghĩa" },
    { key: "Hybrid_Linear", name: "Hybrid Linear (0.4*BM25 + 0.6*Vector)", tag: "Kết hợp tuyến tính" },
    { key: "Hybrid_RRF", name: "Hybrid RRF (k = 60)", tag: "Xếp hạng nghịch đảo" },
    { key: "Hybrid_RRF_Reranker", name: "Hybrid RRF + Reranker", tag: "Mô hình hai giai đoạn", highlight: true },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white border border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Nghiên cứu Khoa học & Đánh giá Thuật toán
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Thực Nghiệm Đối Sánh Thuật Toán Truy Xuất RAG
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Kiểm thử đồng thời 5 kiến trúc tìm kiếm trên tập Ground Truth học liệu thực tế trong SQL Server.
            Đo lường độ chính xác và xuất dữ liệu báo cáo dạng JSON & Markdown.
          </p>
        </div>
        <button
          onClick={handleRunBenchmark}
          disabled={running}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 shrink-0"
        >
          {running ? (
            <>
              <span className="animate-spin text-sm">⏳</span> Đang chạy đánh giá 5 thuật toán...
            </>
          ) : (
            <>
              <span>⚡</span> Chạy Thực Nghiệm Đánh Giá
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* KẾT QUẢ THỰC NGHIỆM */}
      {benchmarkResult ? (
        <div className="space-y-6">
          {/* THÔNG BÁO XUẤT FILE THÀNH CÔNG */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <div>
                <h3 className="text-xs font-bold text-emerald-900">
                  Đã tự động xuất 2 tệp báo cáo NCKH vào thư mục experiments/
                </h3>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Tệp dữ liệu: <code className="font-mono bg-emerald-100/60 px-1 py-0.5 rounded">{benchmarkResult.reportFiles?.json}</code> | 
                  Tệp báo cáo: <code className="font-mono bg-emerald-100/60 px-1 py-0.5 rounded">{benchmarkResult.reportFiles?.markdown}</code>
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Thực nghiệm hoàn tất
            </span>
          </div>

          {/* BẢNG ĐỐI SÁNH KHOA HỌC */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-gray-900 mb-1">
              Bảng Kết Quả Đối So Sánh (Evaluation Benchmark Summary)
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Chỉ số trung bình Macro-average trên các truy vấn thử nghiệm (Độ sâu đánh giá K = 5)
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-100">
                    <th className="py-3 px-3 font-semibold">Phương pháp (Retrieval Method)</th>
                    <th className="py-3 px-3 font-semibold">Đặc trưng kỹ thuật</th>
                    <th className="py-3 px-3 font-semibold text-center">Precision@5</th>
                    <th className="py-3 px-3 font-semibold text-center">Recall@5</th>
                    <th className="py-3 px-3 font-semibold text-center">MRR</th>
                    <th className="py-3 px-3 font-semibold text-center">Đánh giá chung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {methods.map((m) => {
                    const stats = benchmarkResult.summary?.[m.key] || {
                      Mean_Precision_At_5: 0,
                      Mean_Recall_At_5: 0,
                      MRR: 0,
                    };
                    return (
                      <tr
                        key={m.key}
                        className={`transition ${
                          m.highlight
                            ? "bg-amber-50/40 font-semibold"
                            : "hover:bg-gray-50/60"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span
                            className={
                              m.highlight ? "text-[#FF9800] font-bold text-sm" : "text-gray-800"
                            }
                          >
                            {m.name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-[11px]">{m.tag}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                            {stats.Mean_Precision_At_5}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                            {stats.Mean_Recall_At_5}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono px-2 py-0.5 rounded font-bold ${
                              m.highlight
                                ? "bg-[#FF9800] text-white"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {stats.MRR}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-[11px]">
                          {m.highlight ? (
                            <span className="text-emerald-700 font-bold">★ Tối ưu nhất</span>
                          ) : (
                            <span className="text-gray-400">Tham chiếu</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TRẠNG THÁI CHƯA CHẠY */
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-2xs">
          <div className="text-4xl mb-3">🧪</div>
          <h3 className="text-sm font-bold text-gray-800">Chưa có kết quả thực nghiệm trong phiên này</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
            Nhấn nút <strong>"Chạy Thực Nghiệm Đánh Giá"</strong> ở góc trên bên phải để hệ thống quét dữ liệu từ SQL Server, thực hiện truy xuất đa mô hình và tính toán các chỉ số khoa học.
          </p>
        </div>
      )}
    </div>
  );
}