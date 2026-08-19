/* Nome e Local do Arquivo: js/logging.js

/* ============================================================
   LOG ESTRUTURADO E CAPTURA GLOBAL DE ERROS
   ============================================================ */
const LOG_KEY = 'gt_logs';
const LOG_MAX_ENTRIES = 100;

function logStructuredError({ level = 'ERROR', operation = 'unknown', message = '', context = {} }) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    operation,
    message,
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    }
  };

  const consoleMethod = level === 'CRITICAL' || level === 'ERROR' ? console.error : (level === 'WARN' ? console.warn : console.log);
  consoleMethod(`[${entry.timestamp}] [${level}] [${operation}] ${message}`, context);

  try {
    const raw = localStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.push(entry);
    while (logs.length > LOG_MAX_ENTRIES) logs.shift();
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (e) {
    // Falha silenciosa para evitar loop infinito de erro
  }
}

window.onerror = function(message, source, lineno, colno, error) {
  logStructuredError({
    level: 'CRITICAL',
    operation: 'window.onerror',
    message: message,
    context: { source, lineno, colno, stack: error?.stack || null }
  });
  showToast("⚠ Algo deu errado. Tente recarregar a página (F5).");
  return false;
};

window.onunhandledrejection = function(event) {
  logStructuredError({
    level: 'CRITICAL',
    operation: 'unhandledrejection',
    message: event.reason?.message || String(event.reason),
    context: { stack: event.reason?.stack || null }
  });
  showToast("⚠ Algo deu errado. Tente recarregar a página (F5).");
};

