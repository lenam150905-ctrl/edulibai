import OpenAI from "openai";

/**
 * Kiểm tra xem câu hỏi có phải câu chào hỏi / xã giao / hỏi thông tin về trợ lý không
 */
export function isSmallTalk(query) {
  if (!query) return false;
  const normalized = query.trim().toLowerCase();

  const patterns = [
    /^(hi|hello|helo|alo|hế lô|hé lô|chào|xin chào|hey|yo)(\s|$|[!.,?])/i,
    /(bạn|mày|em|cậu|bot|ai) (là ai|tên gì|tên là gì)/i,
    /giới thiệu( về)? (bản thân|bạn|mình)/i,
    /bạn có thể làm (được )?gì/i,
    /chức năng của bạn/i,
    /bạn giúp gì được/i,
    /ai tạo ra bạn/i,
    /bạn là bot gì/i,
    /rag là gì/i,
    /bạn hoạt động như thế nào/i,
    /cảm ơn|thank you|thanks/i,
    /tạm biệt|bye|goodbye/i,
  ];

  return patterns.some((p) => p.test(normalized));
}

/**
 * Tạo câu trả lời chào hỏi xã giao thông minh chuẩn phong cách ChatGPT/Gemini
 */
export function getSmallTalkResponse(query) {
  const q = (query || "").toLowerCase();

  if (/cảm ơn|thanks|thank you/i.test(q)) {
    return (
      "Không có gì đâu bạn! Rất vui được đồng hành cùng bạn. " +
      "Nếu cần tìm kiếm thêm tài liệu, giáo trình hay giải đáp bất kỳ kiến thức môn học nào, bạn cứ nhắn cho mình nhé! 😊📚"
    );
  }

  if (/tạm biệt|bye|goodbye/i.test(q)) {
    return (
      "Tạm biệt bạn! Chúc bạn có những giờ học tập và nghiên cứu thật hiệu quả. " +
      "Khi nào cần tài liệu mới, EduLib AI luôn sẵn sàng hỗ trợ bạn nhé! 👋✨"
    );
  }

  return (
    `Xin chào bạn! 👋\n\n` +
    `Tôi là **EduLib AI** – Trợ lý Thư viện số và Tra cứu học liệu thông minh dựa trên mô hình **RAG (Retrieval-Augmented Generation)**.\n\n` +
    `Tôi có thể đồng hành và hỗ trợ bạn:\n` +
    `- 🔍 **Giải đáp kiến thức chuyên sâu:** Trả lời trực tiếp và mạch lạc các câu hỏi học thuật như ChatGPT/Gemini, đảm bảo chuẩn xác dựa trên kho học liệu chính thống của nhà trường.\n` +
    `- 📜 **Trích dẫn nguồn minh bạch:** Cung cấp dẫn chứng cụ thể từng đoạn trích và số trang trong giáo trình để bạn đối chiếu kiểm chứng.\n` +
    `- 📚 **Gợi ý sách nên tìm đọc:** Đề xuất chính xác các cuốn sách, giáo trình liên quan đang có trong thư viện kèm mã số tài liệu để bạn dễ dàng mượn hoặc tra cứu.\n\n` +
    `Hôm nay bạn cần tìm cuốn sách nào hoặc cần giải đáp nội dung môn học gì? Hãy hỏi mình ngay nhé! 😊`
  );
}

/**
 * Xây dựng System Prompt chuẩn mực cho AI (như ChatGPT / Gemini thật)
 */
function buildSystemPrompt() {
  return `Bạn là EduLib AI – Trợ lý Thư viện số và Nghiên cứu học thuật thông minh, có phong cách trò chuyện tự nhiên, lưu loát, thông minh và thấu cảm như ChatGPT hoặc Gemini.

QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ):
1. KHÔNG MÁY MÓC: Tuyệt đối KHÔNG mở đầu hoặc giải thích bằng các cụm từ thô cứng như "Theo nguồn 1", "Dựa vào nguồn 1 hay 2", "[Nguồn 1]", "[Nguồn 2]". Hãy trả lời thẳng vào câu hỏi của người dùng như một chuyên gia/trợ lý AI thông minh thực thụ.
2. VĂN PHONG SƯ PHẠM: Giải thích sâu sắc, tự nhiên, dễ hiểu, logic và có chiều sâu học thuật.

NẾU CÂU HỎI LÀ CHÀO HỎI / GIỚI THIỆU BẢN THÂN:
- Chào hỏi người dùng thân thiện, ấm áp.
- Giới thiệu bạn là EduLib AI – Trợ lý Thư viện số RAG thông minh, giải thích ngắn gọn khả năng hỗ trợ tìm sách và giải đáp kiến thức học tập.

NẾU CÂU HỎI LÀ TRA CỨU KIẾN THỨC / TÌM SÁCH HỌC LIỆU:
Hãy luôn trình bày câu trả lời theo ĐÚNG cấu trúc 3 phần sau:

### 💡 1. Giải đáp chi tiết
- Trả lời trực tiếp, đầy đủ và thông minh vào câu hỏi của người dùng bằng kiến thức học thuật tổng hợp từ các tài liệu được cung cấp.
- Hành văn trôi chảy, có liên kết luận điểm, chia đoạn rõ ràng.
- Tuyệt đối không chèn ký hiệu [Nguồn X] vào giữa câu chữ.

### 📜 2. Trích dẫn từ các nguồn tài liệu
- Trích dẫn 1-2 câu quan trọng, đắt giá nhất từ tài liệu tham khảo kèm số trang cụ thể.
- Định dạng mẫu: *- Giáo trình [Tên tài liệu] (Trang X): "[Đoạn trích dẫn]"*

### 📚 3. Cuốn sách bạn nên tìm đọc trong thư viện
- Liệt kê rõ ràng tên cuốn sách/giáo trình và mã tài liệu có trong thư viện liên quan đến chủ đề này.
- Đưa ra lời khuyên người dùng nên tìm đọc chương nào hoặc tài liệu nào để hiểu sâu và toàn diện hơn vấn đề.`;
}

/**
 * Hàm gọi mô hình Gemini (nếu người dùng cấu hình GEMINI_API_KEY)
 */
async function callGemini(query, systemPrompt, bookContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `DỮ LIỆU TÀI LIỆU TRONG THƯ VIỆN:\n\n${bookContext}\n\n---\nCÂU HỎI CỦA NGƯỜI DÙNG: "${query}"\n\nHãy trả lời một cách tự nhiên và thông minh theo đúng cấu trúc 3 phần:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const text = response?.text?.trim();
    if (text) return text;
  } catch (err) {
    console.warn("Gemini API call skipped:", err.message);
  }
  return null;
}

/**
 * Hàm gọi mô hình OpenAI (nếu người dùng cấu hình OPENAI_API_KEY)
 */
async function callOpenAI(query, systemPrompt, bookContext, history) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });
    const userPrompt = `DỮ LIỆU TÀI LIỆU TRONG THƯ VIỆN:\n\n${bookContext}\n\n---\nCÂU HỎI: "${query}"\n\nHãy trả lời theo cấu trúc 3 phần rõ ràng:`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: userPrompt },
    ];

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      max_tokens: 1800,
    });

    const text = res.choices?.[0]?.message?.content?.trim();
    if (text) return text;
  } catch (err) {
    console.warn("OpenAI API call skipped:", err.message);
  }
  return null;
}

/**
 * Hàm gọi mô hình Local LLM / Ollama qua OpenAI-compatible API
 */
async function callLocalLLM(query, systemPrompt, bookContext, history) {
  let rawBaseURL = (process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1").trim();
  if (rawBaseURL.endsWith("/")) {
    rawBaseURL = rawBaseURL.slice(0, -1);
  }
  if (!rawBaseURL.endsWith("/v1")) {
    rawBaseURL = `${rawBaseURL}/v1`;
  }

  const modelName = process.env.LOCAL_LLM_MODEL_NAME || "qwen2.5:7b";

  try {
    const client = new OpenAI({
      baseURL: rawBaseURL,
      apiKey: "ollama",
      timeout: 4000, // Timeout ngắn 4s để phản hồi ngay nếu local LLM chưa bật
      defaultHeaders: {
        "ngrok-skip-browser-warning": "1",
      },
    });

    const userPrompt = `DỮ LIỆU TÀI LIỆU TRONG THƯ VIỆN:\n\n${bookContext}\n\n---\nCÂU HỎI: "${query}"\n\nHãy trả lời một cách tự nhiên và thông minh theo đúng cấu trúc 3 phần:`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: userPrompt },
    ];

    const res = await client.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.4,
      max_tokens: 1800,
    });

    const text = res.choices?.[0]?.message?.content?.trim();
    if (text) return text;
  } catch (err) {
    console.warn("Local LLM không khả dụng hoặc timeout:", err.message);
  }
  return null;
}

/**
 * Bộ sinh câu trả lời dự phòng thông minh (Smart Fallback Generator)
 * Đảm bảo ngay cả khi LLM offline thì người dùng vẫn nhận được câu trả lời chuẩn 3 phần,
 * không hề có chữ "nguồn một, nguồn hai" máy móc!
 */
export function generateSmartFallback(query, contextChunks) {
  // Lọc danh sách các đầu sách duy nhất
  const uniqueBooks = Array.from(
    new Map(contextChunks.map((c) => [c.documentCode || c.documentTitle, c])).values()
  );

  // Tổng hợp luận điểm từ các đoạn trích
  const mainPoints = contextChunks
    .map((c) => {
      const text = c.content.trim().replace(/^[-*•\s]+/, "");
      // Lấy 2 câu đầu tiên của đoạn trích làm ý giải thích
      const sentences = text.split(/(?<=[.?!])\s+/);
      return sentences.slice(0, 2).join(" ");
    })
    .filter(Boolean);

  const detailedExplanation =
    mainPoints.length > 0
      ? mainPoints.map((pt) => `- ${pt}`).join("\n\n")
      : "Vấn đề bạn đang quan tâm được đề cập chi tiết trong các giáo trình học thuật của thư viện với các định nghĩa và phương pháp luận chuyên sâu.";

  // Trích dẫn từ các nguồn
  const citationsSection = contextChunks
    .map((c) => {
      const snippet = c.content.length > 250 ? c.content.slice(0, 247) + "..." : c.content;
      return `- 📖 **${c.documentTitle}** (Trang ${c.pageNumber || "N/A"}):\n  *&ldquo;${snippet}&rdquo;*`;
    })
    .join("\n\n");

  // Danh mục sách nên tìm đọc
  const booksSection = uniqueBooks
    .map((b) => {
      const code = b.documentCode ? ` (Mã tài liệu: \`${b.documentCode}\`)` : "";
      return (
        `- 📚 **${b.documentTitle}**${code}\n` +
        `  👉 *Khuyến nghị:* Bạn có thể tìm đọc tài liệu này trong kho thư viện số để tra cứu toàn văn và các chương bài tập liên quan.`
      );
    })
    .join("\n\n");

  return (
    `### 💡 1. Giải đáp chi tiết\n\n` +
    `Dưới đây là phần tổng hợp kiến thức chuyên môn về vấn đề **"${query}"** từ các tài liệu học thuật đã được thẩm định:\n\n` +
    `${detailedExplanation}\n\n` +
    `---\n\n` +
    `### 📜 2. Trích dẫn từ các nguồn tài liệu\n\n` +
    `${citationsSection}\n\n` +
    `---\n\n` +
    `### 📚 3. Cuốn sách bạn nên tìm đọc trong thư viện\n\n` +
    `${booksSection}`
  );
}

/**
 * Hàm điều phối chính: Sinh câu trả lời RAG thông minh
 */
export async function generateRAGAnswer(query, contextChunks = [], history = []) {
  const queryIsSmallTalk = isSmallTalk(query);

  // 1. Nếu là câu chào hỏi / giới thiệu / xã giao -> Trả về ngay lập tức không cần đợi
  if (queryIsSmallTalk) {
    return getSmallTalkResponse(query);
  }

  // 2. Nếu không tìm thấy đoạn tài liệu nào phù hợp
  if (!contextChunks || contextChunks.length === 0) {
    return (
      `Hiện tại thư viện số EduLib AI chưa tìm thấy tài liệu phù hợp trực tiếp với chủ đề **"${query}"**.\n\n` +
      `💡 **Gợi ý dành cho bạn:**\n` +
      `- Hãy thử tìm kiếm bằng từ khóa khái quát hơn (ví dụ: tên môn học, tên thuật ngữ chuyên ngành).\n` +
      `- Kiểm tra xem tài liệu môn học của bạn đã được quản trị viên thư viện phê duyệt và kích hoạt trên hệ thống chưa nhé!`
    );
  }

  // 3. Chuẩn bị ngữ cảnh từ các đoạn trích
  const bookContext = contextChunks
    .map(
      (c, idx) =>
        `[ĐOẠN TRÍCH #${idx + 1}]\n` +
        `- Sách: "${c.documentTitle}" (Mã: ${c.documentCode || "N/A"})\n` +
        `- Vị trí: Trang ${c.pageNumber || "N/A"}\n` +
        `- Nội dung học thuật: "${c.content}"`
    )
    .join("\n\n");

  const systemPrompt = buildSystemPrompt();

  // 4. Thử lần lượt các LLM: Gemini -> OpenAI -> Local LLM
  const geminiAns = await callGemini(query, systemPrompt, bookContext);
  if (geminiAns) return geminiAns;

  const openAiAns = await callOpenAI(query, systemPrompt, bookContext, history);
  if (openAiAns) return openAiAns;

  const localAns = await callLocalLLM(query, systemPrompt, bookContext, history);
  if (localAns) return localAns;

  // 5. Nếu không có LLM nào online -> Kích hoạt Bộ sinh câu trả lời dự phòng thông minh
  return generateSmartFallback(query, contextChunks);
}