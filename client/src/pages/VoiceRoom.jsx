import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getRoomTheme } from '../utils/getRoomTheme';

// SVG Icons
const Mic = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOff = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const Send = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const Paperclip = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);

const Users = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const MessageCircle = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const X = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const LogOut = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// Emoji and Sticker Pickers
const EmojiPicker = React.memo(({ onEmojiSelect, onClose }) => {
  const emojis = useMemo(() => ({
    '😀': ['😀', '😂', '😍', '😎', '🤩', '😊', '🙂', '😢', '😜', '😉', '😇', '🥳', '😘', '😴', '🤓', '😤'],
    '👍': ['👍', '👎', '✋', '👊', '👌', '🙌', '👏', '🤝', '✌️', '🖐️', '🤙', '👈', '👉', '👆', '👇', '🤞'],
    '❤️': ['❤️', '💖', '💔', '💕', '💞', '💓', '💗', '💘', '💝', '💟', '❣️', '💌', '💑', '👩‍❤️‍👩', '👨‍❤️‍👨', '💋'],
    '🌟': ['🌟', '✨', '⭐', '💫', '🎇', '🎆', '🎈', '🎉', '🎁', '🎄', '🎂', '🎊', '🏮', '🎆', '🎇', '🎀'],
    '🐶': ['🐶', '🐱', '🦁', '🐯', '🐻', '🐼', '🐨', '🐷', '🐰', '🐸', '🐵', '🐔', '🦉', '🦋', '🐢', '🐙'],
    '🍎': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆']
  }), []);

  const [category, setCategory] = useState('😀');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={pickerRef} 
      className="absolute bottom-16 left-4 bg-gray-900/90 backdrop-blur-md border border-indigo-500/20 rounded-xl shadow-2xl shadow-black/70 p-3 z-50 w-80 max-h-64 overflow-y-auto"
      role="dialog"
      aria-label="Emoji Seçici"
    >
      <div className="flex justify-between items-center mb-2 border-b border-indigo-500/30 pb-2">
        <span className="text-sm font-semibold text-white">Emojiler</span>
        <button 
          onClick={onClose} 
          className="text-indigo-300 hover:text-white p-1 rounded-full hover:bg-indigo-700 transition-colors"
          aria-label="Emoji seçiciyi kapat"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-1 mb-2 flex-wrap" role="tablist">
        {Object.keys(emojis).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`p-1 rounded-lg transition-colors ${category === cat ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-700 text-gray-300'}`}
            role="tab"
            aria-selected={category === cat}
            aria-label={`Kategori ${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1" role="grid">
        {emojis[category].map((emoji, index) => (
          <button
            key={index}
            onClick={() => onEmojiSelect(emoji)}
            className="text-lg hover:bg-gray-700 rounded p-1 hover:scale-110 transition-transform"
            title={emoji}
            aria-label={`Emoji ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});

EmojiPicker.displayName = 'EmojiPicker';

const StickerPicker = React.memo(({ onStickerSelect, onClose }) => {
  const stickers = useMemo(() => ({
    '🐾': ['😺', '🐶', '🐼', '🦊', '🐨', '🐯', '🦁', '🐮', '🐰', '🐸', '🐵', '🐔', '🦉', '🦋', '🐢', '🐙', '🐝', '🦒', '🦓', '🐘'],
    '🎉': ['🎈', '🎊', '🎁', '💝', '🎯', '🏆', '🎂', '🎄', '🎃', '🎆', '🎇', '🎀', '🎉', '🎈', '🎁', '🏮', '🎊', '🎄', '🎂', '🎁'],
    '⚽': ['⚽', '🏀', '🏈', '🎾', '🏐', '🏓', '🎳', '🎱', '🏒', '🏸', '🥊', '🏉', '🏅', '🥇', '🥈', '🥉', '🏀', '⚽', '🏈', '🎾'],
    '🎨': ['🎨', '🎸', '🎹', '🎤', '🎬', '📷', '📚', '🎮', '🎻', '🎷', '🎺', '🥁', '🎭', '🎨', '📸', '🎥', '🎬', '📚', '🎮', '🎸'],
    '🚀': ['🚀', '🛸', '✈️', '🚤', '🚗', '🚲', '🛵', '🚂', '🚁', '🚀', '🛸', '✈️', '🚤', '🚗', '🚲', '🛵', '🚂', '🚁', '🚀', '🛸']
  }), []);

  const [category, setCategory] = useState('🐾');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={pickerRef} 
      className="absolute bottom-16 left-4 bg-gray-900/90 backdrop-blur-md border border-pink-500/20 rounded-xl shadow-2xl shadow-black/70 p-3 z-50 w-80 max-h-64 overflow-y-auto"
      role="dialog"
      aria-label="Çıkartma Seçici"
    >
      <div className="flex justify-between items-center mb-2 border-b border-pink-500/30 pb-2">
        <span className="text-sm font-semibold text-white">Çıkartmalar</span>
        <button 
          onClick={onClose} 
          className="text-pink-300 hover:text-white p-1 rounded-full hover:bg-pink-700 transition-colors"
          aria-label="Çıkartma seçiciyi kapat"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-1 mb-2 flex-wrap" role="tablist">
        {Object.keys(stickers).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`p-1 rounded-lg transition-colors ${category === cat ? 'bg-pink-600 text-white shadow-lg' : 'hover:bg-gray-700 text-gray-300'}`}
            role="tab"
            aria-selected={category === cat}
            aria-label={`Kategori ${cat}`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2" role="grid">
        {stickers[category].map((sticker, index) => (
          <button
            key={index}
            onClick={() => onStickerSelect(sticker)}
            className="text-2xl hover:bg-gray-700 rounded-lg p-1 hover:scale-110 transition-transform"
            title={sticker}
            aria-label={`Çıkartma ${sticker}`}
          >
            {sticker}
          </button>
        ))}
      </div>
    </div>
  );
});

StickerPicker.displayName = 'StickerPicker';

// Participant Item
const ParticipantItem = React.memo(({ participant, isCurrentUser, isSpeaking, isMuted }) => {
  const displayName = useMemo(() => 
    participant.username?.charAt(0)?.toUpperCase() || 'U', 
    [participant.username]
  );

  const statusText = useMemo(() => {
    if (isMuted) return '🔇 Sessiz';
    if (isSpeaking) return '🎤 Konuşuyor';
    return '🎧 Dinliyor';
  }, [isMuted, isSpeaking]);

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 shadow-lg border border-gray-700/50 ${
        isCurrentUser 
          ? 'bg-indigo-700/40 border-2 border-indigo-500 shadow-indigo-500/30' 
          : 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700'
      } ${isSpeaking ? 'ring-2 ring-green-500 shadow-green-500/20 animate-pulse-low' : ''}`}
      role="listitem"
    >
      <div className="relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
          isCurrentUser ? 'bg-indigo-500' : 'bg-purple-600'
        }`}>
          {displayName}
        </div>
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-gray-800 rounded-full animate-pulse-low" />
        )}
        {isMuted && !isSpeaking && (
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-gray-800 rounded-full flex items-center justify-center">
            <MicOff size={8} className="text-white"/>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">
            {participant.username}
          </span>
          {isCurrentUser && (
            <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full font-medium shadow-sm">Siz</span>
          )}
        </div>
        <div className="text-xs text-gray-400 font-medium">
          {statusText}
        </div>
      </div>
    </div>
  );
});

ParticipantItem.displayName = 'ParticipantItem';

// Message Item
const MessageItem = React.memo(({ message, currentUserId }) => {
  const isOwnMessage = useMemo(() => 
    message.userId === currentUserId, 
    [message.userId, currentUserId]
  );

  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-gray-700/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs text-gray-300 font-medium border border-gray-600 max-w-xs text-center shadow-lg">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl p-3 shadow-xl ${
        isOwnMessage 
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-blue-800/30' 
          : 'bg-gray-800/70 backdrop-blur-md text-white border border-gray-700 rounded-bl-none shadow-black/30'
      }`}>
        {!isOwnMessage && (
          <div className="text-xs font-bold mb-1.5 text-blue-400">
            {message.username}
          </div>
        )}
        <div className="text-sm break-words whitespace-pre-wrap">
          {message.type === 'sticker' ? (
            <span className="text-3xl">{message.content}</span>
          ) : message.type === 'file' ? (
            <a 
              href={message.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`underline ${isOwnMessage ? 'text-blue-200 hover:text-blue-100' : 'text-blue-400 hover:text-blue-300'}`}
              aria-label={`Dosya: ${message.content}`}
            >
              {message.content}
            </a>
          ) : (
            message.content
          )}
        </div>
        <div className={`text-xs mt-1.5 text-right ${isOwnMessage ? 'text-blue-200 opacity-80' : 'text-gray-400'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

// VoiceRoom Component
const VoiceRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = location.state || {};
  const { user } = useSelector((state) => state.auth);
  const room = useSelector((state) => state.rooms.rooms.find(r => r.id === roomId) || location.state?.room || {});
  
  // Compute theme based on room data
  const theme = useMemo(() => getRoomTheme(room?.name || '', room?.description || ''), [room]);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const [participants, setParticipants] = useState([
    { 
      id: user?.id, 
      username: user?.username, 
      socketId: 'current_user', 
      isSpeaking: false, 
      isMuted: false,
      joinedAt: new Date().toISOString()
    }
  ]);
  const [messages, setMessages] = useState([
    { 
      id: 1,
      type: 'system',
      content: 'Odaya hoş geldiniz! Sesli sohbete başlayabilirsiniz.',
      timestamp: new Date(Date.now() - 300000).toISOString()
    }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [socketConnected] = useState(true); 
  const [mediaError, setMediaError] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const fileUrlsRef = useRef(new Map()); 

  useEffect(() => {
    if (!user || !roomId) {
      toast.error('Geçersiz oda veya kullanıcı');
      navigate('/rooms');
    }
  }, [user, roomId, navigate]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initializeMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      });
      mediaStreamRef.current = stream;
      return true;
    } catch (error) {
      console.error('❌ Microphone error:', error);
      setMediaError('Mikrofon erişimi reddedildi. Lütfen tarayıcı izinlerini kontrol edin.');
      return false;
    }
  }, []);

  const toggleMicrophone = useCallback(async () => {
    if (!socketConnected) return;

    if (isRecording) {
      setIsRecording(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.enabled = false);
      }
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${user?.username} konuşmayı bitirdi`,
        timestamp: new Date().toISOString()
      }]);
      setParticipants(prev => prev.map(p => 
        p.id === user?.id ? { ...p, isSpeaking: false } : p
      ));
    } else {
      if (!mediaStreamRef.current) {
        const success = await initializeMicrophone();
        if (!success) return;
      }
      setIsRecording(true);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.enabled = true);
      }
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'system',
        content: `${user?.username} konuşmaya başladı`,
        timestamp: new Date().toISOString()
      }]);
      setParticipants(prev => prev.map(p => 
        p.id === user?.id ? { ...p, isSpeaking: true } : p
      ));
    }
  }, [isRecording, socketConnected, initializeMicrophone, user]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !socketConnected) return;

    const newMessage = {
      id: Date.now(),
      userId: user?.id,
      username: user?.username,
      content: messageInput.trim(),
      type: 'text',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    setShowEmojiPicker(false);
  }, [messageInput, socketConnected, user]);

  const handleEmojiSelect = useCallback((emoji) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const handleStickerSelect = useCallback((sticker) => {
    if (!socketConnected) return;

    const newMessage = {
      id: Date.now(),
      userId: user?.id,
      username: user?.username,
      content: sticker,
      type: 'sticker',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setShowStickerPicker(false);
  }, [socketConnected, user]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file || !socketConnected) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/gif', 'application/pdf'].includes(file.type)) {
      toast.error('Sadece PNG, JPEG, GIF veya PDF dosyaları yüklenebilir');
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    if (fileUrlsRef.current.has(file.name)) {
      URL.revokeObjectURL(fileUrlsRef.current.get(file.name));
    }
    fileUrlsRef.current.set(file.name, fileUrl);

    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      const newMessage = {
        id: Date.now(),
        userId: user?.id,
        username: user?.username,
        content: `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        type: 'file',
        fileUrl,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMessage]);
      setUploadProgress(0);
      event.target.value = '';
    }, 2000);
  }, [socketConnected, user]);

  const handleLeaveRoom = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    toast.success('Odadan ayrıldınız');
    navigate('/rooms');
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fileUrls = fileUrlsRef.current; 
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      fileUrls.forEach(url => URL.revokeObjectURL(url));
      fileUrls.clear();
    };
  }, []);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse-low {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      }
      .animate-pulse-low {
        animation: pulse-low 2s infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={`flex h-screen bg-gray-900 text-white overflow-hidden ${theme.bgPattern}`}>
      {(isMobile || isTablet) && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden fixed top-4 ${isMobileMenuOpen ? 'left-60 sm:left-80' : 'left-4'} z-50 p-3 rounded-xl shadow-2xl transition-all duration-300 ${
            isMobileMenuOpen ? `bg-gradient-to-r ${theme.gradient} text-white shadow-purple-500/50` : 'bg-gray-800 text-indigo-400 shadow-black/70'
          }`}
          aria-label="Katılımcı menüsünü aç/kapat"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Users size={20} />}
        </button>
      )}
      <div className={`
        ${(isMobile || isTablet) ? (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        w-full sm:w-80 lg:w-96
        fixed lg:relative z-40 h-full 
        bg-gray-800/95 backdrop-blur-xl 
        border-r border-indigo-500/30 
        flex flex-col shadow-2xl shadow-black/50 
        transition-transform duration-300
      `}>
        <div className={`p-5 bg-gradient-to-br ${theme.gradient} text-white border-b border-purple-700/50`}>
          <button 
            onClick={handleLeaveRoom}
            className="mb-3 px-4 py-2 bg-white/20 rounded-full text-sm font-semibold hover:bg-white/30 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            aria-label="Odayı terk et"
          >
            <LogOut size={16} /> Odayı Terk Et
          </button>
          <h2 className="text-2xl font-black mb-1 truncate text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-pink-300">
            {room?.name || 'Yükleniyor...'} <span className="text-xl ml-2">{theme.icon}</span>
          </h2>
          <p className="text-sm text-indigo-300/80 mb-2 truncate">{room?.description || 'Sesli Sohbet Odası'}</p>
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="flex items-center gap-1 text-cyan-300">
              <Users size={14} />
              {participants.length} / {room?.max_participants || 10}
            </span>
            <span className="text-gray-400">Katılımcı</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3" role="list">
          {participants.map(participant => (
            <ParticipantItem
              key={participant.socketId}
              participant={participant}
              isCurrentUser={participant.id === user?.id}
              isSpeaking={participant.isSpeaking}
              isMuted={participant.isMuted}
            />
          ))}
        </div>
        <div className={`p-4 mx-4 mb-4 rounded-xl text-sm font-semibold shadow-inner border ${
          socketConnected 
            ? 'bg-green-900/40 text-green-300 border-green-500/50' 
            : 'bg-red-900/40 text-red-300 border-red-500/50'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${socketConnected ? 'bg-green-400 animate-ping' : 'bg-red-400'}`} />
            {socketConnected ? 'Bağlantı Aktif (Socket)' : 'Bağlantı Yok (Socket)'}
          </div>
        </div>
      </div>
      {(isMobile || isTablet) && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {!isMobile && (
          <div className={`p-4 lg:p-6 bg-gray-900/90 backdrop-blur-md border-b border-gray-700 shadow-xl shadow-black/50 ${theme.bgPattern}`}>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{room?.name || 'Yükleniyor...'} <span className="text-lg ml-2">{theme.icon}</span></h1>
              {room?.description && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{room?.description}</p>
              )}
            </div>
          </div>
        )}
        {mediaError && (
          <div className="px-6 py-3 bg-red-900/50 border-b border-red-700 text-red-300 flex items-center justify-between shadow-lg">
            <span className="text-sm font-medium flex items-center gap-2">⚠️ {mediaError}</span>
            <button 
              onClick={() => setMediaError(null)} 
              className="text-red-300 hover:text-white transition-colors"
              aria-label="Hata mesajını kapat"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="px-6 py-3 bg-blue-900/50 border-b border-blue-700 text-blue-300">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Dosya yükleniyor: {uploadProgress}%</span>
              <div className="flex-1 h-2 bg-blue-700 rounded-full">
                <div className={`h-full rounded-full transition-all duration-200 bg-gradient-to-r ${theme.gradient}`} style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-900/95">
          {messages.length > 0 ? (
            <>
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={user?.id}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
              <MessageCircle size={isMobile ? 48 : 64} className="mb-4 opacity-50" />
              <p className="text-lg font-semibold">Henüz mesaj yok</p>
              <p className="text-sm mt-1">İlk mesajı göndererek sohbete başlayın!</p>
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-900 border-t border-gray-700 shadow-2xl shadow-black/70 relative">
          <div className="max-w-6xl mx-auto">
            <div className={`flex items-center gap-2 ${isMobile && windowWidth < 400 ? 'flex-col' : 'flex-row'}`}>
              <div className={`${isMobile && windowWidth < 400 ? 'flex justify-between w-full' : 'flex gap-2'}`}>
                <button
                  onClick={toggleMicrophone}
                  disabled={!socketConnected}
                  className={`flex-shrink-0 p-3 rounded-xl transition-all duration-200 shadow-xl border border-transparent ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/50'
                      : `bg-gradient-to-r ${theme.gradient} hover:from-purple-700 hover:to-blue-700 text-white shadow-purple-500/50`
                  } ${!socketConnected ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                  aria-label={isRecording ? 'Mikrofonu kapat' : 'Mikrofonu aç'}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  onClick={() => {
                    setShowEmojiPicker(prev => !prev);
                    setShowStickerPicker(false);
                  }}
                  disabled={!socketConnected}
                  className="flex-shrink-0 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg text-white"
                  aria-label="Emoji seç"
                >
                  <span className="text-lg">😀</span>
                </button>
                <button
                  onClick={() => {
                    setShowStickerPicker(prev => !prev);
                    setShowEmojiPicker(false);
                  }}
                  disabled={!socketConnected}
                  className="flex-shrink-0 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg text-white"
                  aria-label="Çıkartma seç"
                >
                  <span className="text-lg">😺</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!socketConnected || uploadProgress > 0}
                  className="flex-shrink-0 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all disabled:opacity-50 active:scale-95 shadow-lg text-gray-300"
                  aria-label="Dosya yükle (Max 5MB)"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/png,image/jpeg,image/gif,application/pdf"
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Mesajınızı yazın..."
                  disabled={!socketConnected}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-700 transition-all shadow-inner placeholder-gray-500"
                  aria-label="Mesaj yaz"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !socketConnected}
                  className={`px-4 lg:px-6 py-3 bg-gradient-to-r ${theme.gradient} text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl active:scale-95`}
                  aria-label="Mesaj gönder"
                >
                  <Send size={18} />
                  <span className="hidden lg:inline">Gönder</span>
                </button>
              </div>
            </div>
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
            {showStickerPicker && (
              <StickerPicker
                onStickerSelect={handleStickerSelect}
                onClose={() => setShowStickerPicker(false)}
              />
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse-low {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        }
        .animate-pulse-low {
          animation: pulse-low 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default VoiceRoom;