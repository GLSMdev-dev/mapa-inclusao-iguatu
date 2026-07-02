/**
 * Sistema de Logs - Mapa da Inclusão
 * Versão: 1.0.0
 *
 * Gerencia logs do sistema com diferentes níveis de severidade
 */

const Logger = {
  // Configuração
  config: {
    enabled: true,
    level: "info", // debug, info, warn, error
    showTimestamp: true,
    showSource: true,
    storeInMemory: true,
    maxLogs: 1000,
  },

  // Armazenamento em memória
  logs: [],

  // Níveis de log
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },

  /**
   * Inicializa o logger
   */
  init(config = {}) {
    this.config = { ...this.config, ...config };
    this.logs = [];
    this.info("Logger inicializado com sucesso");
  },

  /**
   * Log de debug
   */
  debug(message, data = null, source = "") {
    if (this.levels.debug >= this.levels[this.config.level]) {
      this._log("debug", message, data, source);
    }
  },

  /**
   * Log de informação
   */
  info(message, data = null, source = "") {
    if (this.levels.info >= this.levels[this.config.level]) {
      this._log("info", message, data, source);
    }
  },

  /**
   * Log de aviso
   */
  warn(message, data = null, source = "") {
    if (this.levels.warn >= this.levels[this.config.level]) {
      this._log("warn", message, data, source);
    }
  },

  /**
   * Log de erro
   */
  error(message, data = null, source = "") {
    if (this.levels.error >= this.levels[this.config.level]) {
      this._log("error", message, data, source);
    }
  },

  /**
   * Função interna de log
   */
  _log(level, message, data, source) {
    // Criar entrada de log
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      source: source || this._getCallerInfo(),
      message: message,
      data: data,
    };

    // Adicionar ao armazenamento em memória
    if (this.config.storeInMemory) {
      this.logs.push(logEntry);
      if (this.logs.length > this.config.maxLogs) {
        this.logs.shift();
      }
    }

    // Exibir no console
    const consoleMethod = level === "debug" ? "log" : level;
    const style = this._getConsoleStyle(level);

    if (this.config.showTimestamp) {
      console[consoleMethod](
        `%c[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}`,
        style,
        data || "",
      );
    } else {
      console[consoleMethod](
        `%c${logEntry.level}: ${logEntry.message}`,
        style,
        data || "",
      );
    }

    // Se for erro, exibir stack trace
    if (level === "error" && data && data.stack) {
      console.error(data.stack);
    }
  },

  /**
   * Retorna o estilo para o console
   */
  _getConsoleStyle(level) {
    const styles = {
      debug: "color: #7f8c8d; font-weight: bold;",
      info: "color: #3498db; font-weight: bold;",
      warn: "color: #f39c12; font-weight: bold;",
      error: "color: #e74c3c; font-weight: bold;",
    };
    return styles[level] || styles.info;
  },

  /**
   * Obtém informações do caller (arquivo e linha)
   */
  _getCallerInfo() {
    try {
      const stack = new Error().stack;
      const lines = stack.split("\n");
      // Pular as primeiras linhas (do logger)
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("js/")) {
          const match = line.match(/js\/([^:]+):(\d+)/);
          if (match) {
            return `${match[1]}:${match[2]}`;
          }
        }
      }
      return "unknown";
    } catch (e) {
      return "unknown";
    }
  },

  /**
   * Obtém todos os logs armazenados
   */
  getLogs(filter = null) {
    if (!filter) {
      return this.logs;
    }

    return this.logs.filter((log) => {
      if (filter.level && log.level !== filter.level.toUpperCase()) {
        return false;
      }
      if (filter.source && !log.source.includes(filter.source)) {
        return false;
      }
      if (filter.message && !log.message.includes(filter.message)) {
        return false;
      }
      return true;
    });
  },

  /**
   * Limpa os logs em memória
   */
  clearLogs() {
    this.logs = [];
    this.info("Logs limpos");
  },

  /**
   * Exporta logs para CSV
   */
  exportCSV() {
    const headers = ["Timestamp", "Level", "Source", "Message", "Data"];
    const rows = this.logs.map((log) => [
      log.timestamp,
      log.level,
      log.source,
      log.message,
      JSON.stringify(log.data || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );
    return csv;
  },

  /**
   * Exporta logs para JSON
   */
  exportJSON() {
    return JSON.stringify(this.logs, null, 2);
  },
};

// Inicializa o logger automaticamente
Logger.init();

// Exporta para uso global
window.Logger = Logger;
