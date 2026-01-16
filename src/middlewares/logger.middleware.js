/**
 * Middleware de logging pour toutes les requêtes
 */

const logger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log de la requête entrante
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  }

  // Intercepter la réponse pour logger la durée
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    
    if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
      console.log(
        `[${timestamp}] ${logLevel} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
      );
    }
    originalSend.call(this, data);
  };

  next();
};

module.exports = logger;


