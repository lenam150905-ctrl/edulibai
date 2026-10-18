"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import DocumentProcessingModal from "@/components/DocumentProcessingModal";

export default function AdminDocumentsPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const currentSchoolParam = searchParams.get("schoolId") || "all";

  const [documents, setDocuments] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState(currentSchoolParam);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  // Modal Tiến trình xử lý (Mục 5)
  const [processingDocId, setProcessingDocId] = useState(null);

  // Modal Sửa Tài liệu
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    visibility: "SCHOOL",
    status: "ACTIVE",
  });

  // Modal Xem chi tiết
  const [viewingDoc, setViewingDoc] = useState(null);

  // Modal Xóa Tài liệu
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocuments = useCallback(async (schoolId = selectedSchoolFilter) => {
    setLoading(true);
    try {
      const url =
        schoolId && schoolId !== "all"
          ? `/api/school-admin/documents?schoolId=${schoolId}`
          : "/api/school-admin/documents";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setDocuments(json.data);
      else toast.error(json.message);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách tài liệu.");
    } finally {
      setLoading(false);
    }
  }, [selectedSchoolFilter, toast]);

  // Lắng nghe sự kiện schoolChanged từ combobox trên Header
  useEffect(() => {
    const handleSchoolChangedEvent = (e) => {
      const newSchoolId = e.detail?.schoolId || "all";
      setSelectedSchoolFilter(newSchoolId);
      fetchDocuments(newSchoolId);
    };

    window.addEventListener("schoolChanged", handleSchoolChangedEvent);
    return () => window.removeEventListener("schoolChanged", handleSchoolChangedEvent);
  }, [fetchDocuments]);

  // Đồng bộ param ban đầu từ URL
  useEffect(() => {
    const schoolFromUrl = searchParams.get("schoolId") || "all";
    setSelectedSchoolFilter(schoolFromUrl);
    fetchDocuments(schoolFromUrl);

    fetch("/api/admin/schools")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSchools(json.data);
      })
      .catch((err) => console.error(err));
  }, [searchParams]);

  const handleToggleVisibility = async (documentId, currentVisibility) => {
    const nextVisibility = currentVisibility === "PUBLIC" ? "SCHOOL" : "PUBLIC";
    try {
      const res = await fetch(`/api/school-admin/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: nextVisibility }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Đã đổi phạm vi tài liệu thành '${nextVisibility}'!`);
        fetchDocuments();
      } else {
        toast.error(json.message || "Lỗi cập nhật phạm vi.");
      }
    } catch {
      toast.error("Lỗi kết nối khi cập nhật tài liệu.");
    }
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditForm({
      title: doc.title || "",
      description: doc.description || "",
      visibility: doc.visibility || "SCHOOL",
      status: doc.status || "ACTIVE",
    });
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    try {
      const res = await fetch(`/api/school-admin/documents/${editingDoc.documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Cập nhật thông tin tài liệu thành công!");
        setEditingDoc(null);
        fetchDocuments();
      } else {
        toast.error(json.message || "Không thể cập nhật tài liệu.");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi cập nhật tài liệu.");
    }
  };

  const handleDeleteDocument = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/school-admin/documents/${deletingDoc.documentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Đã xóa tài liệu thành công!");
        setDeletingDoc(null);
        fetchDocuments();
      } else {
        toast.error(json.message || "Không thể xóa tài liệu.");
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ khi xóa tài liệu.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDocuments = documents.filter((d) => {
    const matchesSearch =
      searchTerm === "" ||
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.documentCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.uploader?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || d.status === statusFilter;

    const matchesVisibility =
      visibilityFilter === "all" || d.visibility === visibilityFilter;

    return matchesSearch && matchesStatus && matchesVisibility;
  });

  const selectedSchoolObj = schools.find((s) => s.schoolId === selectedSchoolFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Quản trị Học liệu & Tài liệu Toàn Hệ Thống (TC4)
          </h1>
          <p className="text-xs text-gray-500">
            Kiểm duyệt tài liệu, phân loại định dạng, quản lý phạm vi chia sẻ liên trường và cấu hình RAG AI
          </p>
        </div>

        {/* THÔNG BÁO BỘ LỌC TRƯỜNG ĐANG ĐƯỢC CHỌN TỪ HEADER */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 shadow-2xs">
          <span>🏛️ Trường học:</span>
          <span className="font-bold text-[#FF9800]">
            {selectedSchoolFilter === "all"
              ? "Toàn bộ hệ thống (Tất cả trường)"
              : `${selectedSchoolObj?.schoolCode || "SC"} - ${selectedSchoolObj?.schoolName || selectedSchoolFilter}`}
          </span>
          <button
            onClick={() => fetchDocuments()}
            className="ml-2 text-gray-400 hover:text-gray-700 font-bold cursor-pointer"
            title="Tải lại danh sách"
          >
            🔄
          </button>
        </div>
      </div>

      {/* THANH CÔNG CỤ TÌM KIẾM VÀ BỘ LỌC */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <input
            type="text"
            placeholder="Tìm tên tài liệu, mã học liệu, người tải lên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] w-full sm:w-64"
          />
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none bg-white font-medium text-gray-700"
          >
            <option value="all">Tất cả phạm vi</option>
            <option value="PUBLIC">PUBLIC (Công khai toàn mạng)</option>
            <option value="SCHOOL">SCHOOL (Nội bộ trường)</option>
            <option value="INTERNAL">INTERNAL (Riêng tư)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none bg-white font-medium text-gray-700"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE (Khả dụng)</option>
            <option value="INACTIVE">INACTIVE (Tạm ẩn)</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Hiển thị: <strong>{filteredDocuments.length}</strong> / {documents.length} tài liệu
        </div>
      </div>

      {/* BẢNG TÀI LIỆU */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 border-b border-gray-100">
                <th className="py-2.5 px-3 font-semibold">Mã</th>
                <th className="py-2.5 px-3 font-semibold">Tên Tài Liệu & Loại</th>
                <th className="py-2.5 px-3 font-semibold">Trường Sở Hữu</th>
                <th className="py-2.5 px-3 font-semibold">Người Đăng</th>
                <th className="py-2.5 px-3 font-semibold text-center">Chunks Vector</th>
                <th className="py-2.5 px-3 font-semibold text-center">Phạm Vi</th>
                <th className="py-2.5 px-3 font-semibold text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-400">
                    Đang tải danh sách tài liệu học liệu...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-400">
                    Không tìm thấy tài liệu nào phù hợp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.documentId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-3 font-bold text-blue-600 font-mono">
                      {doc.documentCode}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900 max-w-sm line-clamp-1" title={doc.title}>
                        {doc.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium">
                          {doc.documentType?.typeName || "Tài liệu học tập"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {doc.fileType}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]" title={doc.school?.schoolName}>
                        {doc.school?.schoolCode || "Hệ thống"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">
                      {doc.uploader?.fullName || "—"}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                      {doc.stats?.chunksCount || 0}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleVisibility(doc.documentId, doc.visibility)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          doc.visibility === "PUBLIC"
                            ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                            : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        }`}
                        title="Bấm để chuyển đổi Public / School"
                      >
                        {doc.visibility}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setProcessingDocId(doc.documentId)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Tiến trình xử lý 7 bước (P2 Mục 5)"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Sửa thông tin"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeletingDoc(doc)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa tài liệu"
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

      {/* MODAL XEM CHI TIẾT */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {viewingDoc.documentCode}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {viewingDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-400">Trường sở hữu:</span>
                  <p className="font-semibold text-gray-800">{viewingDoc.school?.schoolName || "Chưa xác định"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Loại tài liệu:</span>
                  <p className="font-semibold text-gray-800">{viewingDoc.documentType?.typeName || "Học liệu"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Định dạng file:</span>
                  <p className="font-semibold text-gray-800">{viewingDoc.fileType} {viewingDoc.fileName && `(${viewingDoc.fileName})`}</p>
                </div>
                <div>
                  <span className="text-gray-400">Số đoạn chia nhỏ (Chunks):</span>
                  <p className="font-bold text-emerald-600">{viewingDoc.stats?.chunksCount || 0} chunks (Vector Embedding)</p>
                </div>
              </div>

              <div>
                <span className="font-semibold text-gray-600">Mô tả tóm tắt:</span>
                <p className="mt-1 text-gray-600 italic bg-white border border-gray-100 p-3 rounded-xl">
                  {viewingDoc.description || "Chưa có mô tả cho tài liệu này."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA TÀI LIỆU */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Sửa Tài Liệu: {editingDoc.documentCode}
                </h3>
                <p className="text-xs text-gray-400">Cập nhật tiêu đề, mô tả và phạm vi chia sẻ</p>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDocument} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Tiêu đề tài liệu (*)
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Phạm vi chia sẻ
                  </label>
                  <select
                    value={editForm.visibility}
                    onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] bg-white font-medium"
                  >
                    <option value="PUBLIC">PUBLIC (Toàn mạng)</option>
                    <option value="SCHOOL">SCHOOL (Trường)</option>
                    <option value="INTERNAL">INTERNAL (Riêng tư)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#FF9800] bg-white font-medium"
                  >
                    <option value="ACTIVE">ACTIVE (Khả dụng)</option>
                    <option value="INACTIVE">INACTIVE (Tạm ẩn)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
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

      {/* MODAL XÁC NHẬN XÓA TÀI LIỆU */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Xóa Tài Liệu Này?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Bạn có chắc muốn xóa tài liệu <strong>{deletingDoc.title}</strong> ({deletingDoc.documentCode})?
                Các vector chunks và dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingDoc(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteDocument}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Đang xóa..." : "Xác nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIẾN TRÌNH XỬ LÝ 7 BƯỚC (P2 Mục 5) */}
      {processingDocId && (
        <DocumentProcessingModal
          documentId={processingDocId}
          onClose={() => setProcessingDocId(null)}
          onUpdated={() => fetchDocuments(selectedSchoolFilter)}
        />
      )}
    </div>
  );
}
