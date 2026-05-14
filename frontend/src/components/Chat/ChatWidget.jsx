import { useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { askAssistant } from '../../services/chatApi';

const initialMessages = [
  {
    role: 'assistant',
    content: 'Bạn có thể hỏi về tồn kho, phiếu sản xuất, công đoạn định hình hoặc lý do phiếu chưa hoàn tất.'
  }
];

const renderInlineMarkdown = (text) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-black/5 px-1 py-0.5 text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const MarkdownMessage = ({ content }) => {
  const lines = String(content || '').trim().split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        const bullet = line.match(/^\s*[-*]\s+(.+)/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);

        if (bullet) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-current opacity-70" />
              <span>{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }

        if (numbered) {
          return (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 font-semibold">{numbered[1]}.</span>
              <span>{renderInlineMarkdown(numbered[2])}</span>
            </div>
          );
        }

        return <div key={index}>{renderInlineMarkdown(line)}</div>;
      })}
    </div>
  );
};

export default function ChatWidget({ currentView, currentLotId }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await askAssistant(text, { currentView, currentLotId });
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: result.answer || 'Gemini chưa trả về nội dung trả lời.'
        }
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: `Không gọi được chat backend. ${error.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[520px] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Trợ lý sản xuất</div>
                <div className="text-[11px] text-gray-500">Gemini 3.1 Flash Lite</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Đóng chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'border border-gray-100 bg-gray-50 text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownMessage content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-gray-400">Đang hỏi Gemini...</div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-100 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Hỏi về phiếu, kho, công đoạn..."
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Gửi"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg hover:bg-orange-700"
        aria-label="Mở chat"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
