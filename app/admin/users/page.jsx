"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function UsersManagementPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const currentSchoolParam = searchParams.get("schoolId") || "all";

  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState(currentSchoolParam);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    fullName: "",
    schoolId: "",
    roleCode: "TEACHER",
  });

  // Modal Sửa Người dùng
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    schoolId: "",
    roleCode: "TEACHER",
  });

  // Modal Đặt lại mật khẩu
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Modal Xóa Người dùng
  const [deletingUser, setDeletingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async (schoolId = selectedSchoolFilter) => {
    setLoading(true);
    try {
      const url =
        schoolId && schoolId !== "all"
          ? `/api/admin/users?schoolId=${schoolId}`
          : "/api/admin/users";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setUsers(json.data);
      else toast.error(json.message);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolFilter, toast]);

  // Lắng nghe sự kiện schoolChanged từ combobox trên Header
  useEffect(() => {
    const handleSchoolChangedEvent = (e) => {
      const newSchoolId = e.detail?.schoolId || "all";
      setSelectedSchoolFilter(newSchoolId);
      fetchUsers(newSchoolId);
    };

    window.addEventListener("schoolChanged", handleSchoolChangedEvent);
    return () => window.removeEventListener("schoolChanged", handleSchoolChangedEvent);
  }, [fetchUsers]);

  // Đồng bộ param ban đầu từ URL
  useEffect(() => {
    const schoolFromUrl = searchParams.get("schoolId") || "all";
    setSelectedSchoolFilter(schoolFromUrl);
    fetchUsers(schoolFromUrl);

    fetch("/api/admin/schools")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSchools(json.data);
      })
      .catch((err) => console.error(err));
  }, [searchParams]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Tạo tài khoản thành công!");
        setNewUser({
          username: "",
          password: "",
          email: "",
          fullName: "",
          schoolId: selectedSchoolFilter !== "all" ? selectedSchoolFilter : "",
          roleCode: "TEACHER",
        });
        fetchUsers();
      } else {
        toast.error(json.message || "Không thể tạo tài khoản.");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi tạo tài khoản.");
    }
  };

  const handleToggleUserStatus = async (userId, currentActive) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          currentActive ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản thành công!"
        );
        fetchUsers();
      } else {
        toast.error(json.message || "Lỗi cập nhật trạng thái.");
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật tài khoản.");
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || "",
      email: user.email || "",
      schoolId: user.school?.schoolId || "",
      roleCode: user.roles?.[0] || "TEACHER",
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Cập nhật thông tin tài khoản thành công!");
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error(json.message || "Không thể cập nhật người dùng.");
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật tài khoản.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdUser || !newPasswordValue.trim()) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPwdUser.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordValue.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Đã đổi mật khẩu cho @${resetPwdUser.username} thành công!`);
        setResetPwdUser(null);
        setNewPasswordValue("");
      } else {
        toast.error(json.message || "Không thể đặt lại mật khẩu.");
      }
    } catch {
      toast.error("Lỗi kết nối khi đổi mật khẩu.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã xóa tài khoản thành công!");
        setDeletingUser(null);
        fetchUsers();
      } else {
        toast.error(json.message || "Không thể xóa tài khoản.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa tài khoản.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Lọc phía Client: Từ khóa tìm kiếm, Vai trò, Trạng thái
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      searchTerm === "" ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.userCode?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === "all" || u.roles?.includes(roleFilter);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.isActive) ||
      (statusFilter === "inactive" && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const selectedSchoolObj = schools.find((s) => s.schoolId === selectedSchoolFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Quản lý Tài khoản & Phân quyền (TC1 & TC3)
          </h1>
          <p className="text-xs text-gray-500">
            Cấp phát tài khoản, phân quyền vai trò, mở/khóa và đặt lại mật khẩu cho thành viên
          </p>
        </div>

        {/* THÔNG BÁO BỘ LỌC TRƯỜNG ĐANG ĐƯỢC CHỌN TỪ HEADER */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 shadow-2xs">
          <span>🏛️ Phạm vi lọc:</span>
          <span className="font-bold text-[#FF9800]">
            {selectedSchoolFilter === "all"
              ? "Toàn bộ hệ thống (Tất cả trường)"
              : `${selectedSchoolObj?.schoolCode || "SC"} - ${selectedSchoolObj?.schoolName || selectedSchoolFilter}`}
          </span>
          <button
            onClick={() => fetchUsers()}
            className="ml-2 text-gray-400 hover:text-gray-700 font-bold"
            title="Tải lại danh sách"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORM THÊM USER */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs h-fit">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>👤</span> Cấp Phát Tài Khoản Mới
          </h2>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Tên đăng nhập (*)
              </label>
              <input
                type="text"
                placeholder="teacher_dut_01"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Mật khẩu ban đầu (*)
              </label>
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự..."
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                placeholder="TS. Nguyễn Văn A"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="nguyenvana@school.edu.vn"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Đơn vị trường học
              </label>
              <select
                value={newUser.schoolId}
                onChange={(e) => setNewUser({ ...newUser, schoolId: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] bg-white"
              >
                <option value="">-- Toàn hệ thống (Không gắn trường) --</option>
                {schools.map((s) => (
                  <option key={s.schoolId} value={s.schoolId}>
                    {s.schoolCode} - {s.schoolName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Vai trò (Role)
              </label>
              <select
                value={newUser.roleCode}
                onChange={(e) => setNewUser({ ...newUser, roleCode: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] bg-white font-medium"
              >
                <option value="TEACHER">TEACHER (Giảng viên / Thủ thư)</option>
                <option value="STUDENT">STUDENT (Sinh viên)</option>
                <option value="SCHOOL_ADMIN">SCHOOL_ADMIN (Quản trị cơ sở trường)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Quản trị viên tối cao)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-[#FF9800] hover:bg-[#F57C00] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              + Tạo Tài Khoản
            </button>
          </form>
        </div>

        {/* BẢNG DANH SÁCH USER */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Danh Sách Tài Khoản ({filteredUsers.length}/{users.length})
              </h2>
              <p className="text-[11px] text-gray-400">Tìm kiếm, phân quyền, đổi mật khẩu và quản lý truy cập</p>
            </div>

            {/* BỘ LỌC TÌM KIẾM, VAI TRÒ & TRẠNG THÁI */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Tìm user, email, mã..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-200 px-3 py-1.5 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] w-36 sm:w-44"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-200 px-2 py-1.5 rounded-xl text-xs outline-none bg-white font-medium"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="SCHOOL_ADMIN">SCHOOL_ADMIN</option>
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 px-2 py-1.5 rounded-xl text-xs outline-none bg-white font-medium"
              >
                <option value="all">Tất cả TT</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Đã khóa</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <th className="py-2.5 px-3 font-semibold">Mã / Username</th>
                  <th className="py-2.5 px-3 font-semibold">Họ tên & Email</th>
                  <th className="py-2.5 px-3 font-semibold">Trường</th>
                  <th className="py-2.5 px-3 font-semibold">Vai trò</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Trạng thái</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      Đang tải danh sách tài khoản...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.userId} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-blue-600 font-mono">{u.userCode || "—"}</div>
                        <div className="text-[11px] text-gray-500 font-semibold">@{u.username}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-800">{u.fullName || "—"}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">{u.email || "—"}</div>
                      </td>
                      <td className="py-3 px-3">
                        {u.school ? (
                          <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]" title={u.school.schoolName}>
                            {u.school.schoolCode}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Toàn hệ thống</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {u.roles.join(", ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {u.isActive ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sửa thông tin */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Sửa thông tin & vai trò"
                          >
                            ✏️
                          </button>
                          {/* Đặt lại mật khẩu */}
                          <button
                            onClick={() => {
                              setResetPwdUser(u);
                              setNewPasswordValue("");
                            }}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Đặt lại mật khẩu"
                          >
                            🔑
                          </button>
                          {/* Khóa / Mở khóa */}
                          <button
                            onClick={() => handleToggleUserStatus(u.userId, u.isActive)}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition ${
                              u.isActive
                                ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                            title={u.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            {u.isActive ? "Khóa" : "Mở"}
                          </button>
                          {/* Xóa user */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa tài khoản"
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

      {/* MODAL SỬA THÔNG TIN USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Sửa Người Dùng: @{editingUser.username}
                </h3>
                <p className="text-xs text-gray-400">Cập nhật thông tin cá nhân và phân bổ trường</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Email
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
                  Đơn vị trường học
                </label>
                <select
                  value={editForm.schoolId}
                  onChange={(e) => setEditForm({ ...editForm, schoolId: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] bg-white"
                >
                  <option value="">-- Toàn hệ thống (Không trường) --</option>
                  {schools.map((s) => (
                    <option key={s.schoolId} value={s.schoolId}>
                      {s.schoolCode} - {s.schoolName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Vai trò (Role)
                </label>
                <select
                  value={editForm.roleCode}
                  onChange={(e) => setEditForm({ ...editForm, roleCode: e.target.value })}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] bg-white font-medium"
                >
                  <option value="TEACHER">TEACHER (Giảng viên / Thủ thư)</option>
                  <option value="STUDENT">STUDENT (Sinh viên)</option>
                  <option value="SCHOOL_ADMIN">SCHOOL_ADMIN (Quản trị trường)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Toàn quyền hệ thống)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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

      {/* MODAL ĐẶT LẠI MẬT KHẨU */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Đặt Lại Mật Khẩu
                </h3>
                <p className="text-xs text-gray-400">Cho người dùng @{resetPwdUser.username}</p>
              </div>
              <button
                onClick={() => setResetPwdUser(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Mật khẩu mới (*)
                </label>
                <input
                  type="password"
                  placeholder="Nhập tối thiểu 6 ký tự..."
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800]"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetPwdUser(null)}
                  disabled={isResetting}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? "Đang lưu..." : "Xác nhận Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA USER */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Xóa Tài Khoản Này?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Bạn có chắc muốn xóa tài khoản <strong>@{deletingUser.username}</strong> ({deletingUser.fullName})?
                Thao tác này sẽ xóa vĩnh viễn quyền truy cập của người dùng này.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteUser}
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