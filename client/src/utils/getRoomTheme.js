export const getRoomTheme = (roomName, description = '') => {
  const text = `${roomName} ${description}`.toLowerCase();
  
  // 💖 Romantizm/Aşk Teması
  if (text.match(/romantik|aşk|sevgi|love|date|kalp|heart/)) {
    return {
      gradient: 'from-pink-500 via-red-600 to-purple-600',
      icon: '💖', // Kalp ikonu
      bgPattern: 'bg-[radial-gradient(circle_at_50%_70%,_rgba(236,72,153,0.4),_transparent_70%)]'
    };
  }
  
  // 🎮 Oyun Teması
  if (text.match(/oyun|game|gaming|valorant|lol|cs|pubg|minecraft/)) {
    return {
      gradient: 'from-purple-600 via-pink-600 to-red-600',
      icon: '🎮',
      bgPattern: 'bg-[radial-gradient(circle_at_30%_50%,_rgba(168,85,247,0.4),_transparent_70%)]'
    };
  }
  
  // 🎵 Müzik Teması
  if (text.match(/müzik|music|şarkı|song|spotify|dinle/)) {
    return {
      gradient: 'from-green-500 via-emerald-500 to-teal-600',
      icon: '🎵',
      bgPattern: 'bg-[radial-gradient(circle_at_70%_50%,_rgba(16,185,129,0.4),_transparent_70%)]'
    };
  }
  
  // 💻 Teknoloji Teması
  if (text.match(/teknoloji|tech|kod|code|yazılım|software|programming/)) {
    return {
      gradient: 'from-blue-600 via-cyan-600 to-blue-800',
      icon: '💻',
      bgPattern: 'bg-[radial-gradient(circle_at_50%_30%,_rgba(37,99,235,0.4),_transparent_70%)]'
    };
  }
  
  // ⚽ Spor Teması
  if (text.match(/spor|sport|futbol|basketbol|fitness|gym/)) {
    return {
      gradient: 'from-orange-500 via-red-500 to-pink-600',
      icon: '⚽',
      bgPattern: 'bg-[radial-gradient(circle_at_40%_60%,_rgba(249,115,22,0.4),_transparent_70%)]'
    };
  }
  
  // 🎬 Film/Dizi Teması
  if (text.match(/film|movie|dizi|series|sinema|cinema/)) {
    return {
      gradient: 'from-yellow-500 via-amber-600 to-orange-600',
      icon: '🎬',
      bgPattern: 'bg-[radial-gradient(circle_at_60%_40%,_rgba(245,158,11,0.4),_transparent_70%)]'
    };
  }
  
  // 🍕 Yemek Teması
  if (text.match(/yemek|food|tarif|recipe|mutfak|kitchen/)) {
    return {
      gradient: 'from-red-500 via-orange-500 to-yellow-500',
      icon: '🍕',
      bgPattern: 'bg-[radial-gradient(circle_at_50%_50%,_rgba(239,68,68,0.4),_transparent_70%)]'
    };
  }
  
  // 📚 Eğitim Teması
  if (text.match(/eğitim|education|öğren|learn|ders|lesson/)) {
    return {
      gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
      icon: '📚',
      bgPattern: 'bg-[radial-gradient(circle_at_35%_45%,_rgba(79,70,229,0.4),_transparent_70%)]'
    };
  }
  
  // 🎨 Sanat Teması
  if (text.match(/sanat|art|resim|paint|çiz|draw/)) {
    return {
      gradient: 'from-pink-500 via-purple-500 to-indigo-600',
      icon: '🎨',
      bgPattern: 'bg-[radial-gradient(circle_at_65%_55%,_rgba(236,72,153,0.4),_transparent_70%)]'
    };
  }
  
  // 💬 Varsayılan Tema
  return {
    gradient: 'from-purple-600 via-indigo-600 to-blue-600',
    icon: '💬',
    bgPattern: 'bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.4),_transparent_70%)]'
  };
};