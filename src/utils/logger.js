/**
 * Logger básico con niveles.
 * En un entorno de producción real podría sustituirse por winston o pino.
 * Se mantiene sin dependencia externa para simplificar el TFG.
 */

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const currentLevel = levels[(process.env.LOG_LEVEL_APP || 'info').toLowerCase()] ?? 2;

const colors = {
  error: '\x1b[31m', // rojo
  warn: '\x1b[33m',  // amarillo
  info: '\x1b[36m',  // cian
  http: '\x1b[35m',  // magenta
  debug: '\x1b[90m', // gris
  reset: '\x1b[0m',
};

function format(level, args) {
  const ts = new Date().toISOString();
  const color = colors[level] || '';
  const reset = colors.reset;
  const prefix = `${color}[${ts}] [${level.toUpperCase()}]${reset}`;
  return [prefix, ...args];
}

function log(level, ...args) {
  if (levels[level] > currentLevel) return;
  const out = format(level, args);
  if (level === 'error') {
    console.error(...out);
  } else if (level === 'warn') {
    console.warn(...out);
  } else {
    console.log(...out);
  }
}

module.exports = {
  error: (...a) => log('error', ...a),
  warn: (...a) => log('warn', ...a),
  info: (...a) => log('info', ...a),
  http: (...a) => log('http', ...a),
  debug: (...a) => log('debug', ...a),
};
