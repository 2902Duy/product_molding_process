/**
 * ChatWidget — AI assistant panel slide từ phải.
 * Không còn là floating bubble, mà là panel fixed-right
 * được toggle từ nút trong sidebar.
 */
import { useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';
import { askAssistant } from '../../services/chatApi';

const renderInlineMarkdown = (text) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} style={{ background: 'var(--color-border-light)', padding: '1px 5px', borderRadius: 4, fontSize: '0.91em' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {lines.map((line, index) => {
        const bullet = line.match(/^\s*[-*]\s+(.+)/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
        if (bullet) {
          return (
            <div key={index} style={{ display: 'flex', gap: 8 }}>
              <span style={{ marginTop: '0.5em', width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.6, flexShrink: 0 }} />
              <span>{renderInlineMarkdown(bullet[1])}</span>
            </div>
          );
        }
        if (numbered) {
          return (
            <div key={index} style={{ display: 'flex', gap: 8 }}>
              <span style={{ flexShrink: 0, fontWeight: 600 }}>{numbered[1]}.</span>
              <span>{renderInlineMarkdown(numbered[2])}</span>
            </div>
          );
        }
        return <div key={index}>{renderInlineMarkdown(line)}</div>;
      })}
    </div>
  );
};

export default function ChatWidget({ open, onClose, currentView, currentLotId, messages, setMessages, loading, setLoading, input, setInput }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

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
        { role: 'assistant', content: result.answer || 'Gemini chưa trả về nội dung trả lời.' }
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: `Không gọi được chat backend. ${error.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay mỏng trên mobile */}
      <div
        className="md:hidden fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 360,
          maxWidth: '100vw',
          background: 'white',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-light)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-primary-soft)' }}
            >
              <Sparkles size={15} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Trợ lý sản xuất</div>
              <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Gemini Flash</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-app-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              {message.role === 'assistant' && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                  style={{ background: 'var(--color-primary-soft)' }}
                >
                  <Bot size={12} style={{ color: 'var(--color-primary)' }} />
                </div>
              )}
              <div
                className="text-[13px] leading-relaxed"
                style={{
                  maxWidth: '82%',
                  padding: '8px 12px',
                  borderRadius: message.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: message.role === 'user' ? 'var(--color-primary)' : 'var(--color-app-bg)',
                  color: message.role === 'user' ? 'white' : 'var(--color-text-primary)',
                  border: message.role === 'assistant' ? '1px solid var(--color-border-light)' : 'none',
                }}
              >
                {message.role === 'assistant'
                  ? <MarkdownMessage content={message.content} />
                  : message.content
                }
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--color-primary-soft)' }}
              >
                <Bot size={12} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div
                className="text-[12px]"
                style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}
              >
                Đang hỏi Gemini...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 px-3 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về phiếu, kho, công đoạn..."
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center justify-center rounded-lg w-9 h-9 shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-primary)' }}
            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--color-primary-hover)')}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-primary)'}
          >
            <Send size={14} color="white" />
          </button>
        </form>
      </div>
    </>
  );
}
