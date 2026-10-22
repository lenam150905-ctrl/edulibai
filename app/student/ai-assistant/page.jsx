
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  UserRound,
  LoaderCircle,
  Trash2,
} from "lucide-react";

const suggestions = [
  "Tóm tắt nội dung tài liệu tôi đang học",
  "Giải thích một khái niệm khó hiểu",
  "Tạo 5 câu hỏi trắc nghiệm để ôn tập",
  "Gợi ý tài liệu nghiên cứu phù hợp",
];

export default function AIAssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");

  async function sendMessage(text = question) {
    const content = text.trim();

    if (!content || loading) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setError("");

    try {
      // TODO: Thay endpoint này bằng API RAG thực tế của dự án.
      const response = await fetch("/api/student/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          question: content,
          documentId: selectedDocument || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Không thể nhận câu trả lời từ trợ lý AI."
        );
      }

      const answer =
        result.answer ??
        result.data?.answer ??
        result.data?.content ??
        result.message;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("API chưa trả về nội dung câu trả lời.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (err) {
      console.error("Lỗi trợ lý AI:", err);
      setError(
        err.message ||
          "Không thể kết nối trợ lý AI. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    if (messages.length > 0) {
      setHistory((prev) => [
        {
          id: Date.now(),
          title:
            messages.find((item) => item.role === "user")?.content ||
            "Cuộc trò chuyện mới",
          messages,
        },
        ...prev,
      ]);
    }

    setMessages([]);
    setQuestion("");
    setError("");
  }

  function restoreChat(chat) {
    setMessages(chat.messages);
    setQuestion("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
          <Link
            href="/student"
            className="mb-7 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700"
          >
            <ArrowLeft size={18} />
            Trang chủ sinh viên
          </Link>

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Bot size={25} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">
                Trợ lý học tập
              </h1>
              <p className="text-xs text-slate-500">EduLib AI</p>
            </div>
          </div>

          <button
            onClick={startNewChat}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white hover:bg-indigo-800"
          >
            <Plus size={19} />
            Cuộc trò chuyện mới
          </button>

          <div className="mt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Lịch sử gần đây
            </p>

            {history.length === 0 ? (
              <p className="text-sm leading-6 text-slate-400">
                Các cuộc trò chuyện cũ sẽ xuất hiện tại đây trong phiên hiện tại.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => restoreChat(chat)}
                    className="flex w-full items-start gap-2 rounded-lg p-3 text-left text-sm hover:bg-slate-100"
                  >
                    <MessageSquare
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />
                    <span className="line-clamp-2">{chat.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-auto rounded-2xl bg-indigo-50 p-4">
            <Sparkles size={22} className="mb-2 text-indigo-700" />
            <p className="font-semibold text-indigo-900">
              Học tập thông minh
            </p>
            <p className="mt-1 text-xs leading-5 text-indigo-800">
              Đặt câu hỏi, tìm hiểu kiến thức và ôn tập cùng trợ lý AI.
            </p>
          </div>
        </aside>

        {/* Chat area */}
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
            <div>
              <h2 className="font-bold text-slate-900">
                Trợ lý học tập RAG AI
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Hỏi đáp và hỗ trợ nghiên cứu
              </p>
            </div>

            <button
              onClick={startNewChat}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </header>

          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 md:px-10">
            {messages.length === 0 ? (
              <div className="m-auto w-full max-w-3xl py-10">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-700">
                  <Sparkles size={34} />
                </div>

                <h3 className="text-center text-2xl font-bold text-slate-900 md:text-3xl">
                  Hôm nay bạn muốn tìm hiểu gì?
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-center leading-7 text-slate-500">
                  Đặt câu hỏi về học liệu, nhờ giải thích kiến thức hoặc
                  tạo câu hỏi ôn tập để hỗ trợ việc học.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      onClick={() => sendMessage(item)}
                      disabled={loading}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm leading-6 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <Sparkles
                        size={17}
                        className="mb-2 text-indigo-600"
                      />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user"
                        ? "flex-row-reverse"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        message.role === "user"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {message.role === "user" ? (
                        <UserRound size={19} />
                      ) : (
                        <Bot size={20} />
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                        message.role === "user"
                          ? "bg-indigo-700 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <LoaderCircle
                      size={20}
                      className="animate-spin text-indigo-700"
                    />
                    Trợ lý đang xử lý câu hỏi...
                  </div>
                )}

                <div aria-live="polite">
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {error}
                      <button
                        onClick={() =>
                          sendMessage(
                            messages.filter((m) => m.role === "user").at(-1)?.content || ""
                          )
                        }
                        className="ml-2 font-semibold underline"
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white p-4 md:px-8 md:py-5">
            <div className="mx-auto max-w-3xl">
              <label
                htmlFor="documentId"
                className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"
              >
                <BookOpen size={15} />
                Mã học liệu (không bắt buộc)
              </label>

              <input
                id="documentId"
                value={selectedDocument}
                onChange={(event) =>
                  setSelectedDocument(event.target.value)
                }
                placeholder="Nhập DocumentId nếu muốn hỏi về một tài liệu cụ thể"
                className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
              >
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !loading
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Nhập câu hỏi của bạn..."
                  rows={2}
                  className="max-h-36 min-h-12 flex-1 resize-y bg-transparent text-sm leading-6 outline-none"
                />

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  aria-label="Gửi câu hỏi"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={19} />
                </button>
              </form>

              <p className="mt-2 text-center text-xs text-slate-400">
                AI có thể trả lời chưa chính xác. Hãy đối chiếu với tài liệu gốc.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
