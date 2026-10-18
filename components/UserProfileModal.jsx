"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function UserProfileModal({ isOpen, onClose, currentUser, onProfileUpdated }) {
  const toast = useToast();
  const [tab, setTab] = useState("profile"); // 'profile' | 'password'
  const [loading, setLoading] = useState(false);

  // Form profile
  const [fullName, setFullName] = useState(currentUser?.FullName || "");
  const [email, setEmail] = useState(currentUser?.Email || "");

  // Form password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_PROFILE",
          fullName,
          email,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        if (onProfileUpdated) onProfileUpdated();
        onClose();
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Lỗi kết nối khi đổi mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#FF9800] flex items-center justify-center font-bold text-sm shadow-2xs">
              👤
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Quản Lý Tài Khoản</h2>
              <p className="text-[11px] text-gray-400">@{currentUser?.Username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-100 mb-4">
          <button
            onClick={() => setTab("profile")}
            className={`pb-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
              tab === "profile"
                ? "border-[#FF9800] text-[#FF9800]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setTab("password")}
            className={`pb-2 px-3 text-xs font-semibold transition border-b-2 cursor-pointer ${
              tab === "password"
                ? "border-[#FF9800] text-[#FF9800]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Đổi mật khẩu
          </button>
        </div>

        {/* TAB 1: PROFILE */}
        {tab === "profile" && (
          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                disabled
                value={currentUser?.Username || ""}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Họ và tên (*)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#FF9800] hover:bg-[#F57C00] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: PASSWORD */}
        {tab === "password" && (
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Mật khẩu hiện tại (*)
              </label>
              <input
                type="password"
                placeholder="Nhập mật khẩu đang dùng"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Mật khẩu mới (*)
              </label>
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                Xác nhận mật khẩu mới (*)
              </label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#FF9800]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#FF9800] hover:bg-[#F57C00] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
