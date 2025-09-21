const { config } = require('../config');

class Logger {
  constructor() {
    this.logLevel = config.app.logLevel;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    this.colors = {
      error: '\x1b[31m', // red
      warn: '\x1b[33m', // yellow
      info: '\x1b[32m', // green
      debug: '\x1b[34m', // blue
    };
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const color = this.colors[level] || '\x1b[0m';
    const resetColor = '\x1b[0m';
    const levelString = `[${level.toUpperCase()}]`.padEnd(7);

    let logString = `${color}[${timestamp}] ${levelString} ${message}${resetColor}`;

    if (Object.keys(meta).length > 0) {
      logString += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return logString;
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

const logger = new Logger();

module.exports = { Logger, logger };