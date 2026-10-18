import OpenAI from "openai";

const baseURL = process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1";
const modelName = process.env.LOCAL_LLM_MODEL_NAME || "qwen2.5:7b";

// Kết nối trực tiếp tới Ollama cục bộ (không cần API key thực tế)
const localClient = new OpenAI({
  baseURL,
  apiKey: "ollama",
});

/**
 * Sinh câu trả lời phân tích chuyên sâu từ nội dung sách qua Local LLM
 * @param {string} query Câu hỏi người dùng
 * @param {Array<object>} contextChunks Các đoạn trích dẫn được lọc từ SQL Server
 * @returns {Promise<string>}
 */
export async function generateRAGAnswer(query, contextChunks) {
  if (!contextChunks || contextChunks.length === 0) {
    return "Thư viện số chưa có tài liệu phù hợp hoặc được cấp phép để trả lời nội dung này.";
  }

  // Định dạng ngữ cảnh trích xuất từ sách
  const bookContext = contextChunks
    .map(
      (c, idx) =>
        `--- ĐOẠN TRÍCH [Nguồn ${idx + 1}] ---\n` +
        `Tác phẩm/Giáo trình: "${c.documentTitle}" (Mã: ${c.documentCode})\n` +
        `Vị trí: Trang ${c.pageNumber || "N/A"}\n` +
        `Nội dung trích xuất:\n"${c.content}"`
    )
    .join("\n\n");

  // System instruction biến LLM thành Trợ lý Nghiên cứu & Giảng viên học thuật
  const systemPrompt = `Bạn là Trợ lý Học thuật AI thông minh của thư viện số EduLib AI.
Nhiệm vụ của bạn là đọc hiểu các đoạn trích từ sách/học liệu được cung cấp dưới đây và trả lời câu hỏi của người dùng một cách thông minh, thấu đáo.

HƯỚNG DẪN TRẢ LỜI:
1. KHÔNG chỉ copy lại từng câu văn. Hãy đọc hiểu, tổng hợp, phân tích và giải thích vấn đề bằng lời văn sư phạm, mạch lạc.
2. Trả lời trực diện vào trọng tâm câu hỏi: Nêu định nghĩa, bản chất, nguyên lý hoạt động hoặc so sánh (nếu có).
3. BẮT BUỘC gắn nguồn trích dẫn: Khi đưa ra định nghĩa, số liệu hoặc luận điểm then chốt, hãy ghi chú [Nguồn X] ngay sau ý đó.
4. CHỈ dựa vào thông tin có trong ngữ cảnh sách được cung cấp. Nếu trong tài liệu không đề cập đến một khía cạnh nào đó, hãy nêu rõ ràng: "Tài liệu hiện tại trong thư viện chưa đề cập đến...".
5. Ngôn ngữ: Tiếng Việt chuẩn mực, văn phong học thuật, gãy gọn.`;

  const userPrompt = `DƯỚI ĐÂY LÀ NỘI DUNG SÁCH ĐƯỢC TRÍCH XUẤT:\n\n${bookContext}\n\nCÂU HỎI CỦA ĐỘC GIẢ: "${query}"\n\nHãy tổng hợp kiến thức từ các đoạn trích trên và đưa ra lời giải thích chi tiết, thông minh kèm nguồn trích dẫn:`;

  try {
    const response = await localClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = response.choices?.[0]?.message?.content?.trim();
    if (answer) {
      return answer;
    }
  } catch (error) {
    console.error("Lỗi khi kết nối tới Local LLM (Ollama):", error.message);
  }

  // Fallback dự phòng nếu Ollama chưa được bật
  return (
    `[Chế độ dự phòng - Chưa kết nối Local LLM]:\n\n` +
    contextChunks
      .map(
        (c, i) =>
          `- [Nguồn ${i + 1}] (${c.documentTitle}, Trang ${c.pageNumber || "N/A"}): "${c.content}"`
      )
      .join("\n\n")
  );
}