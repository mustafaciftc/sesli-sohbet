const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const sanitizeConfig = {
  ALLOWED_TAGS: [], // Tüm HTML tag'lerini engelle
  ALLOWED_ATTR: [], // Tüm attribute'ları engelle
  KEEP_CONTENT: true // Sadece text içeriğini koru
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Temel temizlik
  let cleaned = input.trim();
  
  // DOM Purify ile sanitize
  cleaned = DOMPurify.sanitize(cleaned, sanitizeConfig);
  
  // Ek güvenlik önlemleri
  cleaned = cleaned
    .replace(/[<>]/g, '') // HTML tag karakterlerini kaldır
    .replace(/\b(ALTER|CREATE|DELETE|DROP|EXEC|INSERT|SELECT|UPDATE|UNION|SCRIPT|JAVASCRIPT)\b/gi, '')
    .substring(0, 5000); // Maksimum uzunluk

  return cleaned;
};

const sanitizeRoomName = (name) => {
  const cleaned = sanitizeInput(name);
  // Sadece harf, rakam, boşluk ve bazı özel karakterlere izin ver
  return cleaned.replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s\-_]/g, '');
};

module.exports = { sanitizeInput, sanitizeRoomName };