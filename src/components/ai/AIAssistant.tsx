import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, ChatResponseData, AvailableRoom, ChatSource } from '../../services/aiService';
import AIChatRoomCard from './AIChatRoomCard';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, X, Send, Trash2, User as UserIcon, Calendar, Info, RefreshCw } from 'lucide-react';
import './AIAssistant.css';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: ChatSource[];
  toolUsed?: string | null;
  availableRooms?: AvailableRoom[];
  checkIn?: string | null;
  checkOut?: string | null;
}

/**
 * Component to render markdown formatting (bold, italic, lists, paragraphs) nicely in UI
 */
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="formatted-ai-text">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Bullet lists (* item or - item)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletContent = line.replace(/^\s*[-*]\s+/, '');
          const parts = bulletContent.split(/(\*\*.*?\*\*|\*.*?\*)/g);

          return (
            <div key={lineIdx} className="d-flex align-items-start gap-2 my-1 ps-1">
              <span className="text-primary fw-bold" style={{ fontSize: '1.1em', lineHeight: 1 }}>•</span>
              <div>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                  }
                  if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
                    return <em key={pIdx}>{part.slice(1, -1)}</em>;
                  }
                  return part;
                })}
              </div>
            </div>
          );
        }

        // Standard text lines with inline bold (**bold**) and italic (*italic*)
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.startsWith('**')) {
            return <em key={pIdx}>{part.slice(1, -1)}</em>;
          }
          return part;
        });

        return (
          <React.Fragment key={lineIdx}>
            {renderedLine}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const AIAssistant: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hello! I am your Luxury Hotel AI Assistant. Ask me about room availability, hotel policies, check-in times, or sign in to view your personal room bookings!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome-init',
        sender: 'ai',
        text: isAuthenticated
          ? 'Hello! I am your Luxury Hotel AI Assistant. Ask me about room availability, check how many rooms you have booked, view your profile, reviews, or account dashboard summary!'
          : 'Hello! I am your Luxury Hotel AI Assistant. Ask me about room availability, hotel amenities, policies, or sign in to check your personal room bookings!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [isAuthenticated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading]);

  // Close AI Assistant modal when clicking or scrolling outside the assistant widget
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScrollOutside = (e: Event) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleWheelOutside = (e: WheelEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOutside, true);
    window.addEventListener('wheel', handleWheelOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOutside, true);
      window.removeEventListener('wheel', handleWheelOutside);
    };
  }, [isOpen]);

  // Isolate scroll within the AI Assistant window to prevent background page scrolling
  useEffect(() => {
    const windowEl = chatWindowRef.current;
    const bodyEl = chatBodyRef.current;
    if (!windowEl || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent wheel event from scrolling background document
      e.preventDefault();

      if (!bodyEl) return;
      const { scrollTop, scrollHeight, clientHeight } = bodyEl;
      const delta = e.deltaY;

      if (delta < 0 && scrollTop > 0) {
        bodyEl.scrollTop = Math.max(0, scrollTop + delta);
      } else if (delta > 0 && scrollTop + clientHeight < scrollHeight) {
        bodyEl.scrollTop = Math.min(scrollHeight - clientHeight, scrollTop + delta);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!bodyEl) return;
      const isInsideBody = bodyEl.contains(e.target as Node);
      const isScrollable = bodyEl.scrollHeight > bodyEl.clientHeight;

      if (!isInsideBody || !isScrollable) {
        e.preventDefault();
      }
    };

    windowEl.addEventListener('wheel', handleWheel, { passive: false });
    windowEl.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      windowEl.removeEventListener('wheel', handleWheel);
      windowEl.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setErrorText(null);
    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const data: ChatResponseData = await sendChatMessage(query, isAuthenticated);

      const aiMsgId = `ai-${Date.now()}`;
      const aiMessage: Message = {
        id: aiMsgId,
        sender: 'ai',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        toolUsed: data.toolUsed || null,
        availableRooms: data.availableRooms || [],
        checkIn: data.checkIn || null,
        checkOut: data.checkOut || null
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Failed to get AI response:', err);
      setErrorText(err.message || 'Sorry, I failed to process your query.');
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'I apologize, but I am unable to answer right now. Please verify your connection or contact our 24/7 front desk.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: isAuthenticated
          ? 'Welcome to Luxury Hotel Concierge! How may I assist you with room availability, checking your reservations, profile details, or hotel amenities today?'
          : 'Welcome to Luxury Hotel Concierge! How may I assist you with room availability, amenities, policies, or checking room options today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorText(null);
  };

  const quickQuestions = [
    'How many rooms have I booked?',
    'Show my account dashboard',
    'Show my profile details',
    'Which rooms are available tomorrow?',
    'What time is check-in?'
  ];

  return (
    <div className="ai-assistant-wrapper" ref={wrapperRef}>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ai-assistant-trigger"
        aria-label="Toggle AI Hotel Assistant Chat"
        title="Hotel AI Assistant"
      >
        {isOpen ? <X size={26} /> : <Sparkles size={26} />}
        {!isOpen && <span className="ai-assistant-badge">AI</span>}
      </button>

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="ai-chat-window" ref={chatWindowRef}>
          {/* Header */}
          <div className="ai-chat-header">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-white rounded-circle d-flex align-items-center justify-content-center p-1 shadow-sm" style={{ width: '38px', height: '38px', minWidth: '38px', overflow: 'hidden' }}>
                <img src="/favicon.svg" alt="Hotel AI Logo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              </div>
              <div>
                <h6 className="fw-bold m-0 text-white" style={{ fontSize: '0.95rem' }}>
                  Hotel AI Assistant
                </h6>
                <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                  <span className="ai-status-indicator"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                onClick={handleClearChat}
                className="btn btn-sm btn-link text-white text-opacity-75 p-1"
                title="Clear Chat"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-sm btn-link text-white p-1"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Body / Messages */}
          <div className="ai-chat-body" ref={chatBodyRef}>
            {messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <div className={`ai-chat-bubble ${msg.sender}`}>
                  <div className="d-flex align-items-center gap-1 mb-1 opacity-75" style={{ fontSize: '0.7rem' }}>
                    {msg.sender === 'user' ? (
                      <UserIcon size={12} />
                    ) : (
                      <img src="/favicon.svg" alt="AI Avatar" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                    )}
                    <span>{msg.sender === 'user' ? 'You' : 'AI Assistant'}</span>
                    <span className="ms-auto">{msg.timestamp}</span>
                  </div>

                  <FormattedText text={msg.text} />

                  {/* Render Sources Badges (only when no backend tool was used) */}
                  {msg.sources && msg.sources.length > 0 && !msg.toolUsed && (
                    <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 d-flex flex-column gap-1" style={{ fontSize: '0.72rem' }}>
                      <span className="text-muted fw-medium d-inline-flex align-items-center gap-1">
                        <Info size={12} /> Sources:
                      </span>
                      <div className="d-flex flex-wrap gap-1 mt-1" style={{ maxWidth: '100%' }}>
                        {msg.sources.map((src, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSend(src.title)}
                            className="ai-source-badge"
                            title={`Ask AI about: "${src.title}"`}
                            disabled={loading}
                          >
                            {src.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Render Room Cards if availableRooms exist */}
                {msg.availableRooms && msg.availableRooms.length > 0 && (
                  <div className="my-2 px-1">
                    <div className="d-flex align-items-center gap-1 text-primary fw-bold mb-2" style={{ fontSize: '0.85rem' }}>
                      <Calendar size={16} />
                      <span>Available Rooms ({msg.checkIn} to {msg.checkOut}):</span>
                    </div>

                    {msg.availableRooms.map((room) => (
                      <AIChatRoomCard
                        key={room.roomId}
                        room={room}
                        checkIn={msg.checkIn}
                        checkOut={msg.checkOut}
                        onSelect={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Quick Action Chips when messages are short */}
            {messages.length <= 2 && !loading && (
              <div className="mt-2">
                <div className="text-muted mb-2 fw-medium" style={{ fontSize: '0.75rem' }}>
                  Suggested Questions:
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(q)}
                      className="ai-quick-chip"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {loading && (
              <div className="ai-chat-bubble ai d-flex align-items-center gap-2" style={{ width: 'fit-content' }}>
                <img src="/favicon.svg" alt="AI" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>AI is thinking</span>
                <div className="d-flex gap-1">
                  <span className="ai-typing-dot"></span>
                  <span className="ai-typing-dot"></span>
                  <span className="ai-typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Footer */}
          <div className="ai-chat-input-area">
            {errorText && (
              <div className="alert alert-danger py-1 px-2 mb-2 text-truncate" style={{ fontSize: '0.75rem' }}>
                {errorText}
              </div>
            )}

            <div className="input-group">
              <input
                ref={inputRef}
                type="text"
                className="form-control form-control-sm border-end-0"
                placeholder="Ask about rooms, check-in, wifi..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{ fontSize: '0.88rem', boxShadow: 'none' }}
              />
              <button
                onClick={() => handleSend()}
                className="btn btn-primary btn-sm d-flex align-items-center justify-content-center px-3"
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                {loading ? <RefreshCw size={16} className="spin-animation" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
