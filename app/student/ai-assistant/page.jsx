
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  RefreshCw,
  AlertCircle,
  FileText,
} from "lucide-react";

const RAG_API = "/api/rag/chat";
const CONVERSATION_API = "/api/student/rag/conversation";

const suggestions = [
  "Tóm tắt nội dung tài liệu tôi đang học",
  "Giải thích một khái niệm khó hiểu",
  "Tạo 5 câu hỏi trắc nghiệm để ôn tập",
  "Gợi ý tài liệu nghiên cứu phù hợp",
];

function normalizeMessage(message, index = 0) {
  return {
    id: String(message.id ?? message.MessageId ?? `message-${index}`),
    role:
      String(message.role ?? message.Role ?? "").toUpperCase() === "USER"
        ? "user"
        : String(message.role ?? "").toLowerCase() === "user"
          ? "user"
          : "assistant",
    content: message.content ?? message.Content ?? "",
    citations: message.citations ?? message.sources ?? [],
  };
}

function normalizeConversation(item) {
  return {
    id: String(item.ConversationId ?? item.conversationId ?? item.id),
    title: item.Title ?? item.title ?? "Đoạn chat mới",
    messageCount: item.MessageCount ?? item.messageCount ?? 0,
    updatedAt: item.UpdatedAt ?? item.updatedAt ?? null,
  };
}

export default function AIAssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [retryQuestion, setRetryQuestion] = useState("");

  const messagesEndRef = useRef(null);
  const questionRef = useRef(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await fetch(CONVERSATION_API, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể tải danh sách hội thoại."
        );
      }

      setHistory(
        Array.isArray(result.data)
          ? result.data.map(normalizeConversation)
          : []
      );
    } catch (err) {
      console.error("Lỗi tải lịch sử hội thoại:", err);
      setError(err.message || "Không thể tải lịch sử hội thoại.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function restoreChat(chat) {
    if (loading || !chat?.id) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
  `${CONVERSATION_API}/${encodeURIComponent(chat.id)}`,
  {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  }
);

if (!response.ok) {
  const errorText = await response.text();

  throw new Error(
    `Không thể tải hội thoại (${response.status}): ${errorText.slice(0, 150)}`
  );
}

const result = await response.json();

if (!result.success) {
  throw new Error(
    result.message || "Không thể tải nội dung hội thoại."
  );
}

      const data = result.data ?? result;
      const oldMessages = data.messages ?? data.Messages ?? [];

      setConversationId(
        String(data.conversationId ?? data.ConversationId ?? chat.id)
      );

      setMessages(oldMessages.map(normalizeMessage));
      setQuestion("");
      setRetryQuestion("");
      setSelectedDocument("");
    } catch (err) {
      console.error("Lỗi mở hội thoại:", err);
      setError(err.message || "Không thể mở hội thoại cũ.");
    } finally {
      setLoading(false);
    }
  }

  function startNewChat() {
    if (loading) return;

    setConversationId(null);
    setMessages([]);
    setQuestion("");
    setError("");
    setRetryQuestion("");
    setSelectedDocument("");

    questionRef.current?.focus();
  }

  async function sendMessage(text = question) {
    const content = text.trim();

    if (!content || loading) return;

    const userMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content,
      citations: [],
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion("");
    setLoading(true);
    setError("");
    setRetryQuestion("");

    try {
      const response = await fetch(RAG_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          message: content,
          conversationId,
          topK: 3,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Không thể nhận câu trả lời từ trợ lý AI."
        );
      }

      if (result.conversationId) {
        const newConversationId = String(result.conversationId);
        setConversationId(newConversationId);

        setHistory((previous) => {
          const existing = previous.find(
            (item) => item.id === newConversationId
          );

          const updated = {
            id: newConversationId,
            title: existing?.title || content.slice(0, 50),
            messageCount: (existing?.messageCount || 0) + 2,
            updatedAt: new Date().toISOString(),
          };

          return [
            updated,
            ...previous.filter((item) => item.id !== newConversationId),
          ];
        });
      }

      const answer =
        result.answer ??
        result.data?.answer ??
        result.data?.content;

      if (typeof answer !== "string" || !answer.trim()) {
        throw new Error("API chưa trả về nội dung câu trả lời.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: String(result.messageId ?? `temp-ai-${Date.now()}`),
          role: "assistant",
          content: answer,
          citations: result.citations ?? result.sources ?? [],
        },
      ]);

      await loadHistory();
    } catch (err) {
      console.error("Lỗi trợ lý AI:", err);
      setError(err.message || "Không thể kết nối trợ lý AI.");
      setRetryQuestion(content);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex">
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
              <h1 className="font-bold text-slate-900">Trợ lý học tập</h1>
              <p className="text-xs text-slate-500">EduLib AI · RAG</p>
            </div>
          </div>

          <button
            type="button"
            onClick={startNewChat}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-50"
          >
            <Plus size={19} />
            Cuộc trò chuyện mới
          </button>

          <div className="mt-8 flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Lịch sử gần đây
              </p>

              <button
                type="button"
                onClick={loadHistory}
                disabled={historyLoading}
                title="Làm mới lịch sử"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-700"
              >
                <RefreshCw
                  size={15}
                  className={historyLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center gap-2 py-3 text-sm text-slate-400">
                  <LoaderCircle size={16} className="animate-spin" />
                  Đang tải lịch sử...
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm leading-6 text-slate-400">
                  Chưa có cuộc trò chuyện nào.
                </p>
              ) : (
                history.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => restoreChat(chat)}
                    disabled={loading}
                    className={`flex w-full items-start gap-2 rounded-xl p-3 text-left text-sm transition hover:bg-slate-100 disabled:opacity-50 ${
                      conversationId === chat.id
                        ? "bg-indigo-50 text-indigo-800"
                        : "text-slate-600"
                    }`}
                  >
                    <MessageSquare
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 break-words">
                        {chat.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {chat.messageCount} tin nhắn
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-indigo-50 p-4">
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
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 md:px-8">
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900">
                Trợ lý học tập RAG AI
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Hỏi đáp dựa trên học liệu
              </p>
            </div>

            <button
              type="button"
              onClick={startNewChat}
              disabled={loading}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50 disabled:opacity-50"
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
                  Đặt câu hỏi về học liệu, nhờ giải thích kiến thức hoặc tạo
                  câu hỏi ôn tập để hỗ trợ việc học.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
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
                      message.role === "user" ? "flex-row-reverse" : ""
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
                      className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-7 ${
                        message.role === "user"
                          ? "whitespace-pre-wrap bg-indigo-700 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {message.role === "assistant" &&
                        message.citations?.length > 0 && (
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-indigo-700">
                              <BookOpen size={15} />
                              Nguồn tham khảo
                            </p>

                            <div className="space-y-2">
                              {message.citations.map((source, index) => (
                                <div
                                  key={`${source.chunkId ?? source.documentId ?? "source"}-${index}`}
                                  className="rounded-lg bg-slate-50 p-3 text-xs leading-5"
                                >
                                  <p className="flex items-start gap-2 font-semibold text-slate-700">
                                    <FileText
                                      size={15}
                                      className="mt-0.5 shrink-0"
                                    />
                                    <span>
                                      {source.documentTitle ||
                                        source.documentCode ||
                                        `Nguồn ${source.sourceNumber || index + 1}`}
                                    </span>
                                  </p>

                                  {source.pageNumber != null && (
                                    <p className="mt-1 text-slate-500">
                                      Trang {source.pageNumber}
                                    </p>
                                  )}

                                  {source.snippet && (
                                    <p className="mt-2 whitespace-pre-wrap text-slate-600">
                                      {source.snippet}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <p>{error}</p>
                        {retryQuestion && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => sendMessage(retryQuestion)}
                            className="mt-2 font-semibold underline"
                          >
                            Thử gửi lại câu hỏi
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white p-4 md:px-8 md:py-5">
            <div className="mx-auto max-w-3xl">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-end gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-3 transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
              >
                <textarea
                  ref={questionRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Nhập câu hỏi của bạn..."
                  rows={2}
                  disabled={loading}
                  className="max-h-36 min-h-12 flex-1 resize-y bg-transparent text-sm leading-6 outline-none disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  aria-label="Gửi câu hỏi"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <LoaderCircle size={19} className="animate-spin" />
                  ) : (
                    <Send size={19} />
                  )}
                </button>
              </form>

              <p className="mt-2 text-center text-xs text-slate-400">
                AI có thể trả lời chưa chính xác. Hãy đối chiếu với tài liệu
                gốc.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
