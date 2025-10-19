const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Response override to track timing
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) { // 1 saniyeden uzun süren istekler
      console.warn(`🐌 Yavaş istek: ${req.method} ${req.url} - ${duration}ms`);
    }
    
    // Add header for client-side monitoring
    res.set('X-Response-Time', `${duration}ms`);
    
    originalSend.call(this, data);
  };
  
  next();
};

// Memory usage monitoring
const monitorMemoryUsage = () => {
  setInterval(() => {
    const used = process.memoryUsage();
    const memoryUsage = {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100
    };
    
    if (memoryUsage.heapUsed > 500) { // 500MB'den fazla heap kullanımı
      console.warn('⚠️ Yüksek memory kullanımı:', memoryUsage);
    }
  }, 30000); // 30 saniyede bir
};

module.exports = { performanceMiddleware, monitorMemoryUsage };