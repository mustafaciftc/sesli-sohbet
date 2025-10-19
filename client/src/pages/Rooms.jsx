import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchRooms, createRoom, deleteRoom, updateRoom, clearError } from '../features/rooms/roomsSlice';
import { logout } from '../features/auth/authSlice';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { getRoomTheme } from '../utils/getRoomTheme';

const RoomCard = React.memo(({ room, isAdmin, onJoin, onDelete, onEdit }) => {
  const isFull = room.current_participants >= room.max_participants;
  const participantPercentage = Math.min((room.current_participants / room.max_participants) * 100, 100);
  const availableSpots = room.max_participants - room.current_participants;
  const theme = getRoomTheme(room.name, room.description);

  return (
    <div className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
      <div className={`relative h-32 bg-gradient-to-br ${theme.gradient} overflow-hidden`}>
        <div className={`absolute inset-0 ${theme.bgPattern} opacity-50`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute top-4 left-4 text-6xl opacity-20 group-hover:scale-110 transition-transform duration-500">
          {theme.icon}
        </div>
        <div className="absolute top-4 right-4">
          {isFull ? (
            <span className="px-3 py-1.5 bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Dolu
            </span>
          ) : availableSpots <= 3 ? (
            <span className="px-3 py-1.5 bg-orange-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {availableSpots} Koltuk
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full" />
              Müsait
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={() => onEdit(room)}
              className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg transition-all hover:scale-110 shadow-lg"
              title="Odayı Düzenle"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(room.id, room.name)}
              className="p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg transition-all hover:scale-110 shadow-lg"
              title="Odayı Sil"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-blue-600 transition-all">
            {room.name}
          </h3>
          {room.created_by_username && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>👤</span>
              <span>{room.created_by_username}</span>
            </p>
          )}
        </div>
        {room.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">
            {room.description}
          </p>
        )}
        <div className="mb-4 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{theme.icon}</span>
              <span className="text-sm font-bold text-gray-900">
                {room.current_participants || 0} / {room.max_participants}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {participantPercentage.toFixed(0)}% Dolu
            </span>
          </div>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${theme.gradient}`}
              style={{ width: `${participantPercentage}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => onJoin(room)}
          disabled={isFull}
          className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-md ${
            isFull 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : `bg-gradient-to-r ${theme.gradient} text-white hover:shadow-xl hover:-translate-y-1 active:translate-y-0`
          }`}
        >
          <span className="text-lg">{isFull ? '🔒' : '🚪'}</span>
          <span>{isFull ? 'Oda Dolu' : 'Odaya Katıl'}</span>
        </button>
      </div>
    </div>
  );
});

RoomCard.displayName = 'RoomCard';

const RoomModal = React.memo(({ isOpen, onClose, onCreate, onUpdate, editingRoom }) => {
  const [formData, setFormData] = useState({ name: '', description: '', max_participants: 10 });

  useEffect(() => {
    setFormData({
      name: editingRoom?.name || '',
      description: editingRoom?.description || '',
      max_participants: editingRoom?.max_participants || 10
    });
  }, [editingRoom]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        toast.error('Oda adı gereklidir');
        return;
      }
      const sanitizedData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        max_participants: Math.max(2, Math.min(100, parseInt(formData.max_participants) || 10))
      };
      if (editingRoom) {
        onUpdate(editingRoom.id, sanitizedData);
      } else {
        onCreate(sanitizedData);
      }
    },
    [formData, editingRoom, onCreate, onUpdate]
  );

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-8 py-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(255,255,255,0.1),_transparent_70%)]" />
          <div className="relative flex justify-between items-center">
            <div>
              <h3 className="text-3xl font-black text-white flex items-center gap-3">
                <span className="text-4xl">{editingRoom ? '✏️' : '➕'}</span>
                {editingRoom ? 'Odayı Düzenle' : 'Yeni Oda Oluştur'}
              </h3>
              <p className="text-purple-100 text-sm mt-2">
                {editingRoom ? 'Oda bilgilerini güncelleyin' : 'Tematik bir sohbet odası oluşturun'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white hover:rotate-90 transition-all duration-300 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <p className="text-sm text-blue-900 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span className="font-medium">
                İpucu: Oda adında tema belirtin (oyun, müzik, teknoloji vb.) ve özel bir görsel tema kazanın!
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="room-name" className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="text-lg">📝</span>
              <span>Oda Adı <span className="text-red-500">*</span></span>
            </label>
            <input
              id="room-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: Oyun Sohbeti, Müzik Keyfi, Kod Yazıyoruz"
              required
              maxLength={50}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
            />
            <span className={`text-xs font-medium text-right ${formData.name.length > 40 ? 'text-orange-600' : 'text-gray-500'}`}>
              {formData.name.length}/50
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="room-description" className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span>Açıklama</span>
            </label>
            <textarea
              id="room-description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Oda hakkında detaylı bilgi verin..."
              rows={4}
              maxLength={200}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y transition-all text-base"
            />
            <span className={`text-xs font-medium text-right ${formData.description.length > 180 ? 'text-orange-600' : 'text-gray-500'}`}>
              {formData.description.length}/200
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="max-participants" className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="text-lg">👥</span>
              <span>Maksimum Katılımcı</span>
            </label>
            <input
              id="max-participants"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData((prev) => ({ ...prev, max_participants: e.target.value }))}
              min="2"
              max="100"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base"
            />
            <span className="text-xs text-gray-500">2-100 arası bir değer girin</span>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all duration-300"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="text-lg">{editingRoom ? '💾' : '➕'}</span>
              <span>{editingRoom ? 'Güncelle' : 'Oluştur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

RoomModal.displayName = 'RoomModal';

const Rooms = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { rooms, isLoading, error } = useSelector((state) => state.rooms);
  const { user } = useSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const isAdmin = user?.role === 'admin';

  const filteredAndSortedRooms = useMemo(() => {
    const roomList = Array.isArray(rooms) ? rooms : [];
    const term = searchTerm.toLowerCase();
    return roomList
      .filter(
        (room) =>
          !term ||
          room.name?.toLowerCase().includes(term) ||
          room.description?.toLowerCase().includes(term) ||
          room.created_by_username?.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        switch (sortBy) {
          case 'participants':
            return (b.current_participants || 0) - (a.current_participants || 0);
          case 'recent':
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          case 'name':
          default:
            return (a.name || '').localeCompare(b.name || '');
        }
      });
  }, [rooms, searchTerm, sortBy]);

  useEffect(() => {
    dispatch(fetchRooms({ page: 1, limit: 50 }));
    return () => dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const debouncedSetSearchTerm = useMemo(() => debounce((value) => setSearchTerm(value), 300), []);

  const handleSearchChange = useCallback((e) => debouncedSetSearchTerm(e.target.value), [debouncedSetSearchTerm]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    toast.success('Güvenli çıkış yapıldı 👋');
    navigate('/login');
  }, [dispatch, navigate]);

  const createRoomSlug = useCallback((roomName) => {
    return roomName
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  const handleJoinRoom = useCallback((room) => {
    const roomSlug = createRoomSlug(room.name);
    navigate(`/rooms/${roomSlug}`, { 
      state: { roomId: room.id, room } // Pass full room object
    });
  }, [navigate, createRoomSlug]);

  const handleCreateRoom = useCallback(
    async (roomData) => {
      try {
        await dispatch(createRoom(roomData)).unwrap();
        toast.success('✅ Oda başarıyla oluşturuldu');
        setShowModal(false);
      } catch (error) {
        toast.error(error || 'Oda oluşturulamadı');
      }
    },
    [dispatch]
  );

  const handleUpdateRoom = useCallback(
    async (roomId, roomData) => {
      try {
        await dispatch(updateRoom({ roomId, roomData })).unwrap();
        toast.success('✅ Oda başarıyla güncellendi');
        setShowModal(false);
        setEditingRoom(null);
      } catch (error) {
        toast.error(error || 'Oda güncellenemedi');
      }
    },
    [dispatch]
  );

  const handleEditRoom = useCallback((room) => {
    setEditingRoom(room);
    setShowModal(true);
  }, []);

  const handleDeleteRoom = useCallback(
    async (roomId, roomName) => {
      if (window.confirm(`"${roomName}" odasını silmek istediğinize emin misiniz?`)) {
        try {
          await dispatch(deleteRoom(roomId)).unwrap();
          toast.success('🗑️ Oda başarıyla silindi');
        } catch (error) {
          toast.error(error || 'Oda silinemedi');
        }
      }
    },
    [dispatch]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingRoom(null);
  }, []);

  const handleClearSearch = useCallback(() => setSearchTerm(''), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-10 animate-bounce" style={{ animationDuration: '3s' }}>💬</div>
        <div className="absolute top-32 right-20 text-5xl opacity-10 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>🎤</div>
        <div className="absolute bottom-20 left-32 text-7xl opacity-10 animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }}>🗣️</div>
        <div className="absolute top-1/2 right-10 text-6xl opacity-10 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }}>💭</div>
        <div className="absolute bottom-32 right-1/4 text-5xl opacity-10 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1.5s' }}>🎧</div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(139,92,246,0.3),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,_rgba(219,39,119,0.3),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(79,70,229,0.2),_transparent_60%)]" />
      </div>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl text-3xl shadow-lg">
                  💬
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                  Sesli Sohbet 
                </h1>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <span>Hoş geldin,</span>
                  <span className="font-bold text-gray-900">{user?.username}</span>
                  {isAdmin && (
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full text-xs font-bold shadow-md">
                      👑 Admin
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 hover:scale-105 transition-all duration-300 font-semibold shadow-sm"
            >
              <span>🚪</span>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-white/20">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              <div className="relative flex-1 min-w-[280px]">
                <input
                  type="text"
                  placeholder="Oda ara..."
                  onChange={handleSearchChange}
                  className="w-full pl-12 pr-10 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full w-7 h-7 flex items-center justify-center transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border-2 border-gray-200">
                <label htmlFor="sort-select" className="text-sm font-bold text-gray-700 whitespace-nowrap">
                  Sırala:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium"
                >
                  <option value="name">📝 İsme Göre</option>
                  <option value="participants">👥 Katılımcı Sayısı</option>
                  <option value="recent">🕐 En Yeniler</option>
                </select>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3.5 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                <span className="text-xl">➕</span>
                <span>Yeni Oda Oluştur</span>
              </button>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-pulse">
                💬
              </div>
            </div>
            <p className="text-xl font-bold mt-8">Odalar yükleniyor...</p>
            <p className="text-sm text-white/70 mt-2">Lütfen bekleyin</p>
          </div>
        ) : filteredAndSortedRooms.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-16 text-center border border-white/20">
            <div className="mb-8">
              <div className="inline-block bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-8 rounded-full shadow-lg">
                <span className="text-7xl">{searchTerm ? '🔍' : '💬'}</span>
              </div>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4">
              {searchTerm ? 'Arama Sonucu Bulunamadı' : 'Henüz Oda Yok'}
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              {searchTerm 
                ? 'Farklı bir arama terimi deneyin' 
                : isAdmin 
                  ? 'İlk tematik odayı oluşturarak sohbete başlayın!' 
                  : 'Yakında admin tarafından odalar oluşturulacak'}
            </p>
            {searchTerm ? (
              <button 
                onClick={handleClearSearch} 
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 text-lg"
              >
                🔄 Aramayı Temizle
              </button>
            ) : isAdmin && (
              <button 
                onClick={() => setShowModal(true)} 
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg hover:shadow-xl hover:scale-105 text-lg"
              >
                ➕ İlk Odayı Oluştur
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/90 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg border border-white/20">
                  <span className="text-sm font-bold text-gray-700">
                    <span className="text-2xl mr-2">🏠</span>
                    <span className="text-purple-600 text-lg">{filteredAndSortedRooms.length}</span>
                    <span className="text-gray-600 ml-1">oda gösteriliyor</span>
                  </span>
                </div>
                {searchTerm && (
                  <div className="bg-white/90 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg border border-white/20">
                    <span className="text-sm text-gray-700">
                      <span className="text-lg mr-2">🔍</span>
                      <span className="font-semibold">&quot;{searchTerm}&quot;</span>
                      <span className="text-gray-500 ml-1">için sonuçlar</span>
                    </span>
                  </div>
                )}
              </div>
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="text-sm text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl transition-all border border-white/20 font-semibold shadow-lg"
                >
                  ✕ Temizle
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isAdmin={isAdmin}
                  onJoin={handleJoinRoom}
                  onDelete={handleDeleteRoom}
                  onEdit={handleEditRoom}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <RoomModal 
        isOpen={showModal} 
        onClose={handleCloseModal} 
        onCreate={handleCreateRoom} 
        onUpdate={handleUpdateRoom} 
        editingRoom={editingRoom} 
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Rooms;