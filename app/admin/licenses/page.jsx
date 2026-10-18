"use client";

import { useState, useEffect } from "react";

export default function LicensesManagementPage() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLicense, setNewLicense] = useState({
    licenseName: "",
    canUseForRAG: true,
    canDownload: true,
    description: "",
  });

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licenses");
      const json = await res.json();
      if (json.success) setLicenses(json.data);
    } catch (err) {
      console.error("Lỗi tải danh sách giấy phép:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLicense),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        setNewLicense({
          licenseName: "",
          canUseForRAG: true,
          canDownload: true,
          description: "",
        });
        fetchLicenses();
      } else {
        alert("Lỗi: " + json.message);
      }
    } catch {
      alert("Không thể kết nối máy chủ.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Quản trị Bản quyền Học liệu & Cấu hình RAG
        </h1>
        <p className="text-xs text-gray-500">
          Thiết lập các chính sách cấp phép, quyền trích xuất AI (RAG) và tải xuống cho tài liệu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM THÊM GÓI BẢN QUYỀN */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs h-fit">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Tạo Gói Giấy Phép Mới</h2>
          <form onSubmit={handleCreateLicense} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Tên gói bản quyền / License (*)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Creative Commons CC-BY, Giáo trình Nội bộ..."
                value={newLicense.licenseName}
                onChange={(e) =>
                  setNewLicense({ ...newLicense, licenseName: e.target.value })
                }
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                rows="3"
                placeholder="Quy định sử dụng tài liệu..."
                value={newLicense.description}
                onChange={(e) =>
                  setNewLicense({ ...newLicense, description: e.target.value })
                }
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
              ></textarea>
            </div>

            <div className="space-y-2 pt-1 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={newLicense.canUseForRAG}
                  onChange={(e) =>
                    setNewLicense({ ...newLicense, canUseForRAG: e.target.checked })
                  }
                  className="rounded text-[#FF9800] focus:ring-[#FF9800]"
                />
                <span className="font-medium">Cho phép dùng cho RAG AI</span>
              </label>
              <p className="text-[10px] text-gray-400 pl-5">
                Nếu bật, hệ thống được phép phân tách chunk và nhúng vector để trả lời câu hỏi.
              </p>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={newLicense.canDownload}
                  onChange={(e) =>
                    setNewLicense({ ...newLicense, canDownload: e.target.checked })
                  }
                  className="rounded text-[#FF9800] focus:ring-[#FF9800]"
                />
                <span className="font-medium">Cho phép độc giả tải file gốc</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-[#FF9800] hover:bg-[#F57C00] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs mt-2"
            >
              Lưu Gói Giấy Phép
            </button>
          </form>
        </div>

        {/* BẢNG DANH SÁCH GIẤY PHÉP */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-gray-900">
              Danh Sách Chính Sách Giấy Phép ({licenses.length})
            </h2>
            <button
              onClick={fetchLicenses}
              className="text-xs text-gray-500 hover:text-gray-800 transition"
            >
              🔄 Tải lại
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="py-2.5 px-3 font-semibold">Tên Giấy Phép</th>
                  <th className="py-2.5 px-3 font-semibold">Mô Tả</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Quyền RAG</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tải Xuống</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tài Liệu Gán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {licenses.map((lic) => (
                  <tr key={lic.licenseId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-3 font-bold text-gray-800">
                      {lic.licenseName}
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-[11px] max-w-xs truncate">
                      {lic.description || "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lic.canUseForRAG
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {lic.canUseForRAG ? "Được phép" : "Cấm trích xuất"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lic.canDownload
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {lic.canDownload ? "Cho phép" : "Chỉ đọc"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-gray-700">
                      {lic.totalAssignedDocuments} tài liệu
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}