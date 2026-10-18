"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";

export default function SchoolsManagementPage() {
  const toast = useToast();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newSchool, setNewSchool] = useState({
    schoolName: "",
    email: "",
    phone: "",
    address: "",
  });

  // Modal Sửa trường
  const [editingSchool, setEditingSchool] = useState(null);
  const [editForm, setEditForm] = useState({
    schoolName: "",
    email: "",
    phone: "",
    address: "",
  });

  // Modal Xóa trường
  const [deletingSchool, setDeletingSchool] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/schools");
      const json = await res.json();
      if (json.success) setSchools(json.data);
      else toast.error(json.message);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách trường học.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchool),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Thêm trường mới thành công!");
        setNewSchool({ schoolName: "", email: "", phone: "", address: "" });
        fetchSchools();
      } else {
        toast.error(json.message || "Không thể tạo trường mới.");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi tạo trường.");
    }
  };

  const handleToggleSchool = async (schoolId, currentStatus) => {
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          currentStatus ? "Đã tạm dừng hoạt động trường!" : "Đã kích hoạt trường thành công!"
        );
        fetchSchools();
      } else {
        toast.error(json.message || "Lỗi cập nhật trạng thái trường.");
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật trạng thái trường.");
    }
  };

  const openEditModal = (school) => {
    setEditingSchool(school);
    setEditForm({
      schoolName: school.schoolName || "",
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
    });
  };

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    if (!editingSchool) return;
    try {
      const res = await fetch(`/api/admin/schools/${editingSchool.schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Cập nhật thông tin trường thành công!");
        setEditingSchool(null);
        fetchSchools();
      } else {
        toast.error(json.message || "Không thể cập nhật trường.");
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật trường.");
    }
  };

  const handleDeleteSchool = async () => {
    if (!deletingSchool) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/schools/${deletingSchool.schoolId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã xóa trường học thành công!");
        setDeletingSchool(null);
        fetchSchools();
      } else {
        toast.error(json.message || "Không thể xóa trường học này.");
      }
    } catch {
      toast.error("Lỗi máy chủ khi xóa trường học.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      searchTerm === "" ||
      s.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.schoolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.isActive) ||
      (statusFilter === "inactive" && !s.isActive);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý Trường học (TC2 - Multi-tenant)</h1>
          <p className="text-xs text-gray-500">
            Quản trị thông tin cơ sở, thêm mới, sửa đổi thông tin và phân quyền quản trị trường
          </p>
        </div>
        <button
          onClick={fetchSchools}
          className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5"
        >
          <span>🔄</span> Tải lại dữ liệu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM THÊM TRƯỜNG */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs h-fit">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🏫</span> Thêm Đơn Vị Trường Mới
          </h2>
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 mb-4 text-[11px] text-amber-800">
            Mã trường sẽ được hệ thống <strong>tự động tăng dần</strong> (ví dụ: SC000002, SC000003).
          </div>
          <form onSubmit={handleCreateSchool} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Tên trường học (*)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đại học Bách Khoa..."
                value={newSchool.schoolName}
                onChange={(e) => setNewSchool({ ...newSchool, schoolName: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-[#FF9800] focus:border-[#FF9800] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Email liên hệ
              </label>
              <input
                type="email"
                placeholder="contact@school.edu.vn"
                value={newSchool.email}
                onChange={(e) => setNewSchool({ ...newSchool, email: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-[#FF9800] focus:border-[#FF9800] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                placeholder="024 3869 ..."
                value={newSchool.phone}
                onChange={(e) => setNewSchool({ ...newSchool, phone: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-[#FF9800] focus:border-[#FF9800] outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Địa chỉ trụ sở
              </label>
              <input
                type="text"
                placeholder="Số 1 Đại Cồ Việt, Hà Nội..."
                value={newSchool.address}
                onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:ring-1 focus:ring-[#FF9800] focus:border-[#FF9800] outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#FF9800] hover:bg-[#F57C00] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              + Tạo Trường Học Mới
            </button>
          </form>
        </div>

        {/* BẢNG DANH SÁCH TRƯỜNG */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Danh Sách Cơ Sở Đào Tạo ({filteredSchools.length}/{schools.length})
              </h2>
              <p className="text-[11px] text-gray-400">Xem, chỉnh sửa thông tin, tạm khóa hoặc xóa trường</p>
            </div>
            {/* LỌC & TÌM KIẾM */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Tìm tên, mã trường..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 border border-gray-200 px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs outline-none bg-white font-medium"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm khóa</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="py-2.5 px-3 font-semibold">Mã</th>
                  <th className="py-2.5 px-3 font-semibold">Tên Trường Học</th>
                  <th className="py-2.5 px-3 font-semibold">Liên Hệ</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tài Khoản</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Tài Liệu</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">
                      Đang tải danh sách trường...
                    </td>
                  </tr>
                ) : filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">
                      Không tìm thấy trường học nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((s) => (
                    <tr key={s.schoolId} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-3 font-bold text-blue-600 font-mono">{s.schoolCode}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-800">{s.schoolName}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-xs">{s.address || "Chưa có địa chỉ"}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-[11px]">
                        <div>{s.email || "—"}</div>
                        <div className="text-gray-400">{s.phone || ""}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-gray-700">
                        {s.stats?.totalUsers || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-gray-700">
                        {s.stats?.totalDocuments || 0}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {s.isActive ? "Hoạt động" : "Tạm khóa"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Sửa thông tin trường"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleToggleSchool(s.schoolId, s.isActive)}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition ${
                              s.isActive
                                ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                            title={s.isActive ? "Khóa trường này" : "Kích hoạt trường này"}
                          >
                            {s.isActive ? "Khóa" : "Kích hoạt"}
                          </button>
                          <button
                            onClick={() => setDeletingSchool(s)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa trường"
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

      {/* MODAL SỬA THÔNG TIN TRƯỜNG */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Cập Nhật Trường: {editingSchool.schoolCode}
                </h3>
                <p className="text-xs text-gray-400">Thay đổi thông tin liên hệ và cơ sở đào tạo</p>
              </div>
              <button
                onClick={() => setEditingSchool(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSchool} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tên trường học (*)
                </label>
                <input
                  type="text"
                  value={editForm.schoolName}
                  onChange={(e) => setEditForm({ ...editForm, schoolName: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Email liên hệ
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Địa chỉ trụ sở
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA TRƯỜNG */}
      {deletingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Xóa Trường Học Này?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Bạn có chắc chắn muốn xóa trường <strong>{deletingSchool.schoolName}</strong> (
                {deletingSchool.schoolCode})? Thao tác này không thể hoàn tác nếu trường chưa có dữ liệu.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingSchool(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteSchool}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
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