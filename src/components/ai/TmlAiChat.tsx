import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import logo from "@/assets/tml-logo-transparent.png";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Recaptcha, type RecaptchaHandle } from "@/components/Recaptcha";
import { liveChatService } from "@/lib/tml-ai-live";
import {
  suggestedPrompts,
  type ChatMessage,
  type ChatService,
} from "@/lib/tml-ai";

function IconAction({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function TmlAiChat({ service = liveChatService }: { service?: ChatService }) {
  return (
    <TooltipProvider>
      <PromptInputProvider>
        <ChatWorkspace service={service} />
      </PromptInputProvider>
    </TooltipProvider>
  );
}

function ChatWorkspace({ service }: { service: ChatService }) {
  const { textInput } = usePromptInputController();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captcha = useRef<RecaptchaHandle>(null);
  const pending = useRef<AbortController | null>(null);
  const messageId = useRef(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prompts = suggestedPrompts("community", "general");

  useEffect(
    () => () => {
      pending.current?.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  function stop() {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
  }

  function reset() {
    stop();
    setMessages([]);
    textInput.clear();
    setError(null);
    setCopied(null);
    textarea.current?.focus();
  }

  function populate(prompt: string) {
    textInput.setInput(prompt);
    setError(null);
    textarea.current?.focus();
  }

  async function submit({ text }: { text: string }) {
    const question = text.trim();
    if (!question || loading) return;
    if (!captchaToken) {
      setError("Vui lòng xác minh bảo mật trước khi gửi câu hỏi.");
      return;
    }
    if (question.length > 2000) {
      setError("Câu hỏi tối đa 2.000 ký tự.");
      return;
    }
    setError(null);
    const context = "Hỏi đáp Liên Đoàn";
    const controller = new AbortController();
    pending.current = controller;
    setMessages((previous) => [
      ...previous,
      { id: ++messageId.current, role: "user", text: question, context },
    ]);
    textInput.clear();
    setLoading(true);
    const replyId = ++messageId.current;
    setMessages((previous) => [...previous, { id: replyId, role: "assistant", text: "", context }]);
    try {
      const reply = await service(
        {
          mode: "community",
          level: "general",
          text: question,
          captchaToken,
          history: messages
            .filter(
              (m) =>
                m.context === context && m.text && (m.role === "user" || m.kind === "generated"),
            )
            .slice(-6)
            .map(({ role, text }) => ({ role, text: text.slice(0, 6000) })),
        },
        controller.signal,
        (text) => {
          if (!controller.signal.aborted)
            setMessages((previous) => previous.map((m) => (m.id === replyId ? { ...m, text } : m)));
        },
      );
      if (controller.signal.aborted) return;
      setMessages((previous) => previous.map((m) => (m.id === replyId ? { ...m, ...reply } : m)));
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Không thể kết nối AI. Vui lòng thử lại khi sẵn sàng.",
      );
      textInput.setInput(question);
    } finally {
      captcha.current?.reset();
      if (pending.current === controller) {
        pending.current = null;
        setLoading(false);
      }
    }
  }

  async function copy(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(message.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Chưa thể sao chép. Hãy chọn văn bản cần sao chép và thử lại.");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10" lang="vi">
      <div className="mb-6">
        <Button asChild variant="link" className="h-auto px-0 text-muted-foreground">
          <Link to="/">
            <ArrowLeft /> Website TML
          </Link>
        </Button>
      </div>

      <header className="mb-8 flex items-start gap-4">
        <img
          src={logo}
          alt="The Mandarin League"
          className="size-16 shrink-0 object-contain md:size-20"
        />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-primary-deep dark:text-foreground md:text-4xl">
            TML AI
            <span className="ml-3 align-middle font-han text-lg font-medium text-gold">
              问 · 联
            </span>
          </h1>
          <p className="mt-1 text-sm font-medium text-foreground md:text-base">
            The Mandarin League · Community Assistant
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Tôi là{" "}
            <span className="font-han text-base font-semibold text-primary-deep dark:text-foreground">
              小龙
            </span>{" "}
            <span className="font-medium text-foreground">(Tiểu Long)</span>, trợ lý AI của TML.
            Tôi hỗ trợ giải đáp câu hỏi về Liên Đoàn Hán Ngữ.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl">


        <section
          className="flex min-w-0 flex-col rounded-md border border-border bg-card"
          aria-label="Hội thoại TML AI"
        >
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <span className="size-2 shrink-0 rounded-full bg-gold" />
              <span>Hỏi đáp Liên Đoàn</span>
            </div>
            <IconAction label="Cuộc trò chuyện mới" onClick={reset}>
              <Plus />
            </IconAction>
          </div>

          <Conversation
            className="h-[560px] flex-none md:h-[620px]"
            initial="instant"
            resize="instant"
            aria-label="Tin nhắn hội thoại"
          >
            <ConversationContent className="gap-6 p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="py-2 md:py-4">
                  <div className="mb-5 flex items-center gap-3">
                    <img src={logo} alt="" className="size-10 object-contain" />
                    <span className="text-xs font-semibold uppercase text-muted-foreground">
                      你好 · Xin chào
                    </span>
                  </div>
                  <p className="mb-3 text-sm leading-relaxed text-foreground">
                    Tôi là{" "}
                    <span className="font-han text-base font-semibold text-primary-deep dark:text-foreground">
                      小龙
                    </span>{" "}
                    <span className="font-medium">(Tiểu Long)</span>, trợ lý AI của TML.
                  </p>
                  <h2 className="text-2xl font-semibold text-primary-deep dark:text-foreground">
                    Bạn muốn tìm hiểu gì về TML?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Tìm thông tin công khai về Liên Đoàn, tuyển thành viên, lớp học và hoạt động.
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {prompts.map((prompt, index) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        onClick={() => populate(prompt)}
                        className="h-auto min-h-20 w-full justify-between gap-3 whitespace-normal rounded-md p-4 text-left text-sm font-normal leading-relaxed shadow-none"
                      >
                        <span className="min-w-0">{prompt}</span>
                        {index === 0 ? (
                          <BookOpen className="shrink-0 text-gold" />
                        ) : (
                          <ArrowUpRight className="shrink-0 text-muted-foreground" />
                        )}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                    Chỉ trích dẫn tài liệu công khai đã duyệt, kèm nguồn và ngày cập nhật.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <Message key={message.id} from={message.role} className="max-w-full">
                    <div
                      className={`text-xs text-muted-foreground ${message.role === "user" ? "text-right" : ""}`}
                    >
                      {message.role === "user" ? "Bạn" : "TML AI"} · {message.context}
                      {message.role === "assistant" && (
                        <span className="ml-2 font-medium text-warning-foreground">
                          {message.kind === "generated"
                            ? "Nội dung do AI tạo"
                            : message.kind === "verified"
                              ? "Trích tài liệu đã duyệt"
                              : message.kind === "unconfirmed"
                                ? "Chưa được xác nhận"
                                : message.kind === "example"
                                  ? "Ví dụ biên soạn sẵn"
                                  : message.kind === "unavailable"
                                    ? "Chưa kết nối AI"
                                    : "Chưa hoàn tất"}
                        </span>
                      )}
                    </div>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "group-[.is-user]:bg-primary-deep group-[.is-user]:text-primary-foreground break-words"
                          : "w-full break-words leading-relaxed"
                      }
                    >
                      {message.role === "assistant" ? (
                        <MessageResponse mode="static">{message.text}</MessageResponse>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      )}
                    </MessageContent>
                    {message.role === "assistant" && (
                      <MessageActions>
                        <MessageAction
                          tooltip={copied === message.id ? "Đã sao chép" : "Sao chép câu trả lời"}
                          onClick={() => copy(message)}
                        >
                          {copied === message.id ? <Check /> : <Copy />}
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Message>
                ))
              )}
              {loading && (
                <div role="status" aria-live="polite">
                  <Shimmer>Đang trả lời…</Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="Đến tin nhắn mới nhất" />
          </Conversation>

          <div className="border-t border-border p-4 md:p-6">
            {messages.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Gợi ý câu hỏi">
                <Button variant="secondary" size="sm" onClick={() => populate(prompts[0] ?? "")}>
                  Giới thiệu TML
                  <ArrowUpRight />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => populate(prompts[1] ?? "")}>
                  Tham gia Liên Đoàn
                  <ArrowUpRight />
                </Button>
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <span>{error}</span>
                <IconAction label="Đóng thông báo lỗi" onClick={() => setError(null)}>
                  <X />
                </IconAction>
              </div>
            )}
            <PromptInput
              onSubmit={submit}
              maxFiles={0}
              onError={() => setError("TML AI chỉ nhận văn bản, chưa hỗ trợ tệp đính kèm.")}
            >
              <PromptInputTextarea
                ref={textarea}
                aria-label="Câu hỏi của bạn"
                placeholder="Bạn muốn hỏi gì về Liên Đoàn?"
                className="min-h-24 px-4 text-base"
                maxLength={2000}
              />
              <PromptInputFooter className="px-3 pb-3">
                <IconAction
                  label="Xóa nội dung đang nhập"
                  onClick={textInput.clear}
                  disabled={!textInput.value}
                >
                  <Trash2 />
                </IconAction>
                <PromptInputSubmit
                  aria-label={loading ? "Dừng câu trả lời" : "Gửi câu hỏi"}
                  title={loading ? "Dừng câu trả lời" : "Gửi câu hỏi"}
                  status={loading ? "submitted" : error ? "error" : "ready"}
                  onStop={stop}
                  disabled={!loading && (!textInput.value.trim() || !captchaToken)}
                  className="size-10 shrink-0 rounded-md bg-primary-deep text-primary-foreground hover:bg-primary-deep/90"
                >
                  {!loading && <Send className="size-4" />}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInput>
            <div className="mt-3 overflow-x-auto">
              <Recaptcha ref={captcha} onChange={setCaptchaToken} />
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              Gửi câu hỏi đến Google Gemini · TML không lưu hội thoại · Không tự gửi lại khi hết hạn
              mức
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
