/**
 * ChatWidget — AI assistant panel slide từ phải.
 * Không còn là floating bubble, mà là panel fixed-right
 * được toggle từ nút trong sidebar.
 */
import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, FileText, Trash2, Paperclip } from 'lucide-react';
import { askAssistant, uploadChatFile } from '../../../services/chatApi';

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
  const lines = String(content || '').split('\n');
  const blocks = [];
  let currentTable = null;
  let currentList = null; // 'ul' or 'ol'
  let currentListItems = [];
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'p',
        content: [...currentParagraph]
      });
      currentParagraph = [];
    }
  };

  const flushTable = () => {
    if (currentTable) {
      blocks.push({
        type: 'table',
        headers: currentTable.headers,
        rows: currentTable.rows
      });
      currentTable = null;
    }
  };

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList,
        items: [...currentListItems]
      });
      currentList = null;
      currentListItems = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushTable();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1) {
      flushParagraph();
      flushList();
      
      const parts = line.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (line.includes(':---') || line.includes('---:')) {
        // Separator row, skip
        continue;
      }
      
      if (!currentTable) {
        currentTable = {
          headers: parts,
          rows: []
        };
      } else {
        currentTable.rows.push(parts);
      }
      continue;
    }
    
    // If we were parsing a table but this line is not a table row, flush table
    flushTable();

    // Check if heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: `h${headingMatch[1].length}`,
        content: headingMatch[2]
      });
      continue;
    }

    // Check if bullet list item
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (bulletMatch) {
      flushParagraph();
      if (currentList !== 'ul') {
        flushList();
        currentList = 'ul';
      }
      currentListItems.push(bulletMatch[1]);
      continue;
    }

    // Check if numbered list item
    const numberedMatch = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    if (numberedMatch) {
      flushParagraph();
      if (currentList !== 'ol') {
        flushList();
        currentList = 'ol';
      }
      currentListItems.push(numberedMatch[2]);
      continue;
    }

    // If empty line, flush list and paragraph
    if (trimmed === '') {
      flushList();
      flushParagraph();
      continue;
    }

    // Otherwise, it's a paragraph line
    flushList();
    currentParagraph.push(line);
  }

  flushAll();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {blocks.map((block, idx) => {
        if (block.type === 'p') {
          return (
            <p key={idx} className="my-0.5 leading-relaxed text-[13px]">
              {block.content.map((l, lIdx) => (
                <span key={lIdx}>
                  {renderInlineMarkdown(l)}
                  {lIdx < block.content.length - 1 && <br />}
                </span>
              ))}
            </p>
          );
        }
        
        if (block.type === 'table') {
          return (
            <div key={idx} className="overflow-x-auto my-1.5 border border-slate-200/80 rounded-lg shadow-sm max-w-full">
              <table className="min-w-full divide-y divide-slate-200 text-[11px] font-sans">
                <thead className="bg-slate-50">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-2.5 py-1.5 text-left font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap">
                        {renderInlineMarkdown(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-2.5 py-1.5 text-slate-600 whitespace-normal">
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 my-1 space-y-1 text-[13px]">
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 my-1 space-y-1 text-[13px]">
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        }

        if (block.type.startsWith('h')) {
          const level = block.type[1];
          const fontSize = level === '1' ? '16px' : level === '2' ? '14px' : '13px';
          const fontWeight = 'bold';
          const mt = level === '1' ? '12px' : level === '2' ? '10px' : '8px';
          return (
            <div
              key={idx}
              style={{
                fontSize,
                fontWeight,
                marginTop: mt,
                marginBottom: '4px',
                color: 'var(--color-text-primary)',
              }}
            >
              {renderInlineMarkdown(block.content)}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

const SourceBadge = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);
  const filename = source.title || source.document_name || `Tài liệu ${index + 1}`;
  const percent = source.score ? Math.round(source.score * 100) : null;
  const text = source.text || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-all text-slate-700 cursor-pointer"
        style={{ fontSize: '11px' }}
      >
        <div className="flex items-center gap-1.5 truncate max-w-[85%]">
          <FileText size={12} className="text-blue-500 shrink-0" />
          <span className="truncate font-medium">{filename}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {percent !== null && (
            <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-600 text-[9px] font-bold">
              {percent}% khớp
            </span>
          )}
          <span style={{ fontSize: '9px', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && text && (
        <div
          className="px-2.5 py-2 rounded bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed overflow-x-auto whitespace-pre-wrap font-sans text-[11px]"
          style={{
            maxHeight: 120,
            overflowY: 'auto',
            borderLeft: '3px solid var(--color-primary)'
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

const SourceCitation = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-200/60" style={{ fontSize: '11px' }}>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-2">
        <Sparkles size={11} className="text-amber-500 animate-pulse" />
        <span>Nguồn trích dẫn:</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sources.map((source, idx) => (
          <SourceBadge key={idx} source={source} index={idx} />
        ))}
      </div>
    </div>
  );
};

export default function ChatWidget({ open, onClose, currentView, currentLotId, messages, setMessages, loading, setLoading, input, setInput }) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, [setMessages]);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Don't save if it's just the initial greeting message
      const initialGreeting = messages.length === 1 && messages[0].role === 'assistant' && messages[0].content.includes('Bạn có thể hỏi về tồn kho');
      if (!initialGreeting) {
        localStorage.setItem('chat_history', JSON.stringify(messages));
      }
    }
  }, [messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa lịch sử cuộc trò chuyện này?')) {
      localStorage.removeItem('chat_history');
      setMessages([
        {
          role: 'assistant',
          content: 'Bạn có thể hỏi về tồn kho, phiếu sản xuất, công đoạn định hình hoặc lý do phiếu chưa hoàn tất.'
        }
      ]);
    }
  };

  const handleInputChange = (val) => {
    setInput(val);
    const lastWord = val.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setShowSuggest(true);
    } else {
      setShowSuggest(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggest(false);
    }
  };

  const handleSelectSuggest = (suggestion) => {
    let newVal = input;
    const lastAtIdx = newVal.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      newVal = newVal.slice(0, lastAtIdx) + suggestion + ' ';
    } else {
      newVal = newVal + ' ' + suggestion + ' ';
    }
    setInput(newVal);
    setShowSuggest(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    e.target.value = ''; // Reset file input

    // Append user message about the upload
    const nextMessages = [...messages, { role: 'user', content: `[Đã gửi đính kèm tệp: ${file.name}]` }];
    setMessages(nextMessages);

    try {
      await uploadChatFile(file);
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: `Tải tệp **${file.name}** lên hệ thống thành công và đã nhúng vào dữ liệu dự án! Bạn có thể sử dụng chế độ \`@agent\` để đặt câu hỏi trực tiếp về tài liệu này.`
        }
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: `Không thể tải lên tệp: ${error.message || 'Lỗi kết nối hoặc xử lý tệp.'}`
        }
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading || uploading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setShowSuggest(false);
    setLoading(true);

    try {
      const result = await askAssistant(text, { currentView, currentLotId });
      setMessages([
        ...nextMessages,
        { 
          role: 'assistant', 
          content: result.answer || 'Trợ lý chưa trả về nội dung trả lời.',
          sources: result.sources || [],
          source: result.source
        }
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearHistory}
              title="Xóa lịch sử cuộc trò chuyện"
              className="rounded-lg p-1.5 transition-colors text-slate-400 hover:text-red-500 hover:bg-slate-100 cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
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
                {message.role === 'assistant' ? (
                  <>
                    <MarkdownMessage content={message.content} />
                    <SourceCitation sources={message.sources} />
                  </>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 animate-pulse"
                style={{ background: 'var(--color-primary-soft)' }}
              >
                <Bot size={12} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div
                className="text-[12px]"
                style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}
              >
                Đang xử lý câu trả lời...
              </div>
            </div>
          )}

          {uploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 animate-bounce"
                style={{ background: 'var(--color-primary-soft)' }}
              >
                <Bot size={12} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div
                className="text-[12px]"
                style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}
              >
                Đang tải tệp lên và nhúng vào dữ liệu...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 px-3 py-3 shrink-0 relative"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          {/* Menu gợi ý lệnh @ */}
          {showSuggest && (
            <div 
              className="absolute bottom-[52px] left-3 right-3 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleSelectSuggest('@agent')}
                className="w-full px-3 py-2.5 text-left text-[13px] hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 cursor-pointer"
              >
                <Sparkles size={13} className="text-blue-500" />
                <div>
                  <span className="font-semibold text-blue-600">@agent</span>
                  <span className="text-slate-400 ml-1.5">— Truy vấn trực tiếp Database & RAG</span>
                </div>
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* File Upload Button */}
          <button
            type="button"
            onClick={handleFileClick}
            disabled={loading || uploading}
            title="Đính kèm tệp tin"
            className="flex items-center justify-center rounded-lg w-9 h-9 shrink-0 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Paperclip size={15} />
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || uploading}
            placeholder={uploading ? "Đang tải tệp..." : "Hỏi về phiếu, kho, công đoạn..."}
            className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[13px] outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-soft)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <button
            type="submit"
            disabled={loading || uploading || !input.trim()}
            className={`flex items-center justify-center rounded-lg w-9 h-9 shrink-0 transition-all active:scale-[0.98] ${
              loading || uploading || !input.trim()
                ? "bg-slate-100 border border-slate-200 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            style={loading || uploading || !input.trim() ? {} : { background: 'var(--color-primary)' }}
            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--color-primary-hover)')}
            onMouseLeave={e => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--color-primary)')}
          >
            <Send size={14} color={loading || uploading || !input.trim() ? '#94a3b8' : 'white'} />
          </button>
        </form>
      </div>
    </>
  );
}
