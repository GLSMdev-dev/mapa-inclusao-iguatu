/**
 * Utilitários - Mapa da Inclusão
 * Versão: 1.0.0
 *
 * Funções utilitárias para todo o sistema
 */

const Utils = {
  /**
   * Formata uma data
   */
  formatDate(date, format = "DD/MM/YYYY HH:mm") {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        return date;
      }

      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");

      return format
        .replace("DD", day)
        .replace("MM", month)
        .replace("YYYY", year)
        .replace("HH", hours)
        .replace("mm", minutes);
    } catch (e) {
      Logger.error("Erro ao formatar data", e);
      return date;
    }
  },

  /**
   * Gera um ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /**
   * Sanitiza um texto para uso em HTML
   */
  sanitizeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Valida um email
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Valida uma URL
   */
  validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Valida um telefone
   */
  validatePhone(phone) {
    const re = /^\(?[1-9]{2}\)?[0-9]{4,5}-?[0-9]{4}$/;
    return re.test(phone);
  },

  /**
   * Trunca um texto
   */
  truncateText(text, maxLength = 100, suffix = "...") {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + suffix;
  },

  /**
   * Converte um arquivo para base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Converte um arquivo para blob
   */
  fileToBlob(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const blob = new Blob([reader.result], { type: file.type });
        resolve(blob);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Download de um arquivo
   */
  downloadFile(content, filename, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Copia texto para a área de transferência
   */
  copyToClipboard(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }

    // Fallback para navegadores antigos
    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(textarea);
    });
  },

  /**
   * Debounce para funções
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle para funções
   */
  throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  },

  /**
   * Obtém parâmetros da URL
   */
  getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  },

  /**
   * Redireciona para uma URL com parâmetros
   */
  redirectWithParams(url, params) {
    const queryString = new URLSearchParams(params).toString();
    window.location.href = `${url}?${queryString}`;
  },

  /**
   * Mostra uma notificação
   */
  showNotification(message, type = "info", duration = 3000) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, duration);
  },

  /**
   * Cria um elemento com classes
   */
  createElement(tag, classes = "", content = "") {
    const element = document.createElement(tag);
    if (classes) {
      element.className = classes;
    }
    if (content) {
      element.innerHTML = content;
    }
    return element;
  },

  /**
   * Converte coordenadas para endereço (Geocoding reverso)
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      );
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      }
      return "Endereço não encontrado";
    } catch (e) {
      Logger.error("Erro no geocoding reverso", e);
      return "Erro ao buscar endereço";
    }
  },

  /**
   * Busca coordenadas por endereço (Geocoding)
   */
  async geocode(address) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name,
        };
      }
      return null;
    } catch (e) {
      Logger.error("Erro no geocoding", e);
      return null;
    }
  },

  /**
   * Valida tamanho de arquivo
   */
  validateFileSize(file, maxSizeMB = 5) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
  },

  /**
   * Valida tipo de arquivo (imagem)
   */
  validateImageType(file) {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    return validTypes.includes(file.type);
  },

  /**
   * Formata um número de telefone
   */
  formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  },

  /**
   * Escapa caracteres especiais para regex
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  /**
   * Agrupa um array por chave
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  },

  /**
   * Ordena um array por campo
   */
  sortBy(array, field, order = "asc") {
    return [...array].sort((a, b) => {
      const aVal = a[field] || "";
      const bVal = b[field] || "";

      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return order === "asc" ? comparison : -comparison;
      }

      return order === "asc" ? aVal - bVal : bVal - aVal;
    });
  },

  /**
   * Filtra um array por texto
   */
  filterByText(array, fields, searchText) {
    if (!searchText) return array;

    const searchLower = searchText.toLowerCase();
    return array.filter((item) => {
      return fields.some((field) => {
        const value = item[field] || "";
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  },
};

// Exporta para uso global
window.Utils = Utils;
