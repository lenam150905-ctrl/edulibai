"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

export default function SchoolCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [newCategory, setNewCategory] = useState({
    categoryName: "",
    description: "",
  });

  // Modal Sửa
  const [editingCat, setEditingCat] = useState(null);
  const [editForm, setEditForm] = useState({
    categoryName: "",
    description: "",
    isActive: true,
  });

  // Modal Xóa
  const [deletingCat, setDeletingCat] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/school-admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
      else toast.error(json.message);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách danh mục môn học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/school-admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Tạo danh mục mới thành công!");
        setNewCategory({ categoryName: "", description: "" });
        fetchCategories();
      } else {
        toast.error(json.message || "Không thể tạo danh mục.");
      }
    } catch {
      toast.error("Lỗi kết nối khi tạo danh mục.");
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      const res = await fetch("/api/school-admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: cat.categoryId,
          isActive: !cat.isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          cat.isActive
            ? `Đã tạm ẩn danh mục '${cat.categoryName}'`
            : `Đã kích hoạt danh mục '${cat.categoryName}'`
        );
        fetchCategories();
      } else {
        toast.error(json.message || "Lỗi cập nhật trạng thái.");
      }
    } catch {
      toast.error("Lỗi máy chủ khi cập nhật trạng thái danh mục.");
    }
  };

  const openEditModal = (cat) => {
    setEditingCat(cat);
    setEditForm({
      categoryName: cat.categoryName || "",
      description: cat.description || "",
      isActive: cat.isActive !== undefined ? cat.isActive : true,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCat) return;
    try {
      const res = await fetch("/api/school-admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: editingCat.categoryId,
          ...editForm,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Cập nhật danh mục thành công!");
        setEditingCat(null);
        fetchCategories();
      } else {
        toast.error(json.message || "Không thể cập nhật danh mục.");
      }
    } catch {
      toast.error("Lỗi máy chủ khi cập nhật danh mục.");
    }
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/school-admin/categories?categoryId=${deletingCat.categoryId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã xóa danh mục thành công!");
        setDeletingCat(null);
        fetchCategories();
      } else {
        toast.error(json.message || "Không thể xóa danh mục.");
      }
    } catch {
      toast.error("Lỗi máy chủ khi xóa danh mục.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = categories.filter((c) => {
    return (
      searchTerm === "" ||
      c.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.categoryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Quản lý Danh mục Môn học & Khoa Viện
          </h1>
          <p className="text-xs text-gray-500">
            Cấu trúc phân loại học liệu, giáo trình theo chuyên ngành và khoa đào tạo
          </p>
        </div>
        <button
          onClick={fetchCategories}
          className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <span>🔄</span> Tải lại dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM TẠO DANH MỤC MỚI */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs h-fit space-y-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>📂</span> Thêm Danh Mục Mới
          </h2>
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-800">
            Mã danh mục được hệ thống <strong>tự động sinh</strong> (Ví dụ: CT000001, CT000002...).
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Tên danh mục / Môn học (*)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Công nghệ phần mềm..."
                value={newCategory.categoryName}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, categoryName: e.target.value })
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
                rows={3}
                placeholder="Phạm vi học phần, khoa viện quản lý..."
                value={newCategory.description}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, description: e.target.value })
                }
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#FF9800] hover:bg-[#F57C00] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              + Tạo Danh Mục
            </button>
          </form>
        </div>

        {/* BẢNG DANH MỤC */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Danh Sách Danh Mục ({filtered.length}/{categories.length})
              </h2>
              <p className="text-[11px] text-gray-400">Các danh mục phân loại học liệu của cơ sở</p>
            </div>
            <input
              type="text"
              placeholder="Tìm tên, mã danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-200 px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] w-full sm:w-52"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="py-2.5 px-3 font-semibold">Mã</th>
                  <th className="py-2.5 px-3 font-semibold">Tên Danh Mục & Mô Tả</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-400">
                      Đang tải danh mục môn học...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-400">
                      Chưa có danh mục nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filtered.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-3 font-bold text-blue-600 font-mono">
                        {cat.categoryCode}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{cat.categoryName}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-sm">
                          {cat.description || "Chưa có mô tả"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {cat.isActive ? "Kích hoạt" : "Tạm ẩn"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Sửa danh mục"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleActive(cat)}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                              cat.isActive
                                ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                            title={cat.isActive ? "Tạm ẩn danh mục" : "Kích hoạt lại"}
                          >
                            {cat.isActive ? "Ẩn" : "Hiện"}
                          </button>
                          <button
                            onClick={() => setDeletingCat(cat)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa danh mục"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL SỬA DANH MỤC */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Cập Nhật Danh Mục: {editingCat.categoryCode}
                </h3>
                <p className="text-xs text-gray-400">Chỉnh sửa tên và thông tin phân loại môn học</p>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tên danh mục (*)
                </label>
                <input
                  type="text"
                  value={editForm.categoryName}
                  onChange={(e) => setEditForm({ ...editForm, categoryName: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA DANH MỤC */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Xóa Danh Mục Này?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Bạn có chắc chắn muốn xóa danh mục <strong>{deletingCat.categoryName}</strong> (
                {deletingCat.categoryCode})?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingCat(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}