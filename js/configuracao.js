/**
 * Configurações - Mapa da Inclusão
 * Versão: 1.0.0
 */

document.addEventListener("DOMContentLoaded", async () => {
  Logger.info("Iniciando página de configurações...");

  try {
    // Verificar configuração do Firebase
    if (!window.FIREBASE_CONFIG) {
      throw new Error("Firebase não configurado");
    }

    // Inicializar Firebase
    API.init(window.FIREBASE_CONFIG);

    // Inicializar categorias
    const categories = await API.createDefaultCategories();
    MapaApp.setCategories(categories);

    // Carregar dados
    await loadConfigData();

    // Configurar eventos
    setupConfigEvents();

    Logger.info("Configurações carregadas com sucesso");
  } catch (error) {
    Logger.error("Erro ao carregar configurações", error);
    Utils.showNotification("Erro ao carregar configurações", "error");
  }
});

// ===== CARREGAR DADOS =====
async function loadConfigData() {
  try {
    // Verificar conexão com Firebase
    await checkFirebaseConnection();

    // Carregar estatísticas
    await loadStats();

    // Carregar categorias
    await loadCategories();

    Logger.info("Dados de configuração carregados");
  } catch (error) {
    Logger.error("Erro ao carregar dados de configuração", error);
  }
}

// ===== VERIFICAR CONEXÃO FIREBASE =====
async function checkFirebaseConnection() {
  try {
    // Tentar buscar dados do Firestore
    await API.getAll();

    // Firestore OK
    const firestoreStatus = document.getElementById("firestoreStatus");
    if (firestoreStatus) {
      firestoreStatus.className = "status-badge status-connected";
      firestoreStatus.innerHTML =
        '<i class="fas fa-check-circle"></i> Conectado';
    }

    // Storage OK
    const storageStatus = document.getElementById("storageStatus");
    if (storageStatus) {
      storageStatus.className = "status-badge status-connected";
      storageStatus.innerHTML = '<i class="fas fa-check-circle"></i> Conectado';
    }

    Logger.info("Conexão com Firebase estabelecida");
  } catch (error) {
    Logger.error("Falha na conexão com Firebase", error);

    const firestoreStatus = document.getElementById("firestoreStatus");
    if (firestoreStatus) {
      firestoreStatus.className = "status-badge status-disconnected";
      firestoreStatus.innerHTML =
        '<i class="fas fa-times-circle"></i> Desconectado';
    }

    const storageStatus = document.getElementById("storageStatus");
    if (storageStatus) {
      storageStatus.className = "status-badge status-disconnected";
      storageStatus.innerHTML =
        '<i class="fas fa-times-circle"></i> Desconectado';
    }

    Utils.showNotification("Falha na conexão com o Firebase", "error");
  }
}

// ===== CARREGAR ESTATÍSTICAS =====
async function loadStats() {
  try {
    const stats = await API.getStats();

    document.getElementById("totalLocations").textContent = stats.total;
    document.getElementById("totalImages").textContent = stats.totalImages;
    document.getElementById("totalViews").textContent = stats.totalViews;

    Logger.info("Estatísticas carregadas", stats);
  } catch (error) {
    Logger.error("Erro ao carregar estatísticas", error);
  }
}

// ===== CARREGAR CATEGORIAS =====
async function loadCategories() {
  try {
    const categories = await API.getCategories();
    const container = document.getElementById("categoriesList");

    if (!container) return;

    container.innerHTML = "";

    if (!categories.length) {
      container.innerHTML = '<p class="empty-state">Nenhuma categoria cadastrada ainda.</p>';
      return;
    }

    categories.forEach((category) => {
      const div = document.createElement("div");
      div.className = "category-item";
      div.innerHTML = `
                <div class="category-main">
                  <span class="color-indicator" style="background-color: ${category.cor}"></span>
                  <div class="category-info">
                    <strong>${category.icone} ${category.nome}</strong>
                    <small>ID: ${category.id}</small>
                  </div>
                </div>
                <span class="category-chip" style="background-color: ${category.cor}20; color: ${category.cor};">
                  ${category.cor}
                </span>
            `;
      container.appendChild(div);
    });

    Logger.info(`${categories.length} categorias carregadas`);
  } catch (error) {
    Logger.error("Erro ao carregar categorias", error);
  }
}

// ===== EVENTOS =====
function setupConfigEvents() {
  // Exportar CSV
  const exportCSV = document.getElementById("exportCSV");
  if (exportCSV) {
    exportCSV.addEventListener("click", async () => {
      try {
        const locations = await API.getAll();
        const csv = convertToCSV(locations);
        Utils.downloadFile(csv, "localizacoes.csv", "text/csv");
        Utils.showNotification("Arquivo CSV exportado com sucesso!", "success");
      } catch (error) {
        Logger.error("Erro ao exportar CSV", error);
        Utils.showNotification("Erro ao exportar CSV", "error");
      }
    });
  }

  // Exportar JSON
  const exportJSON = document.getElementById("exportJSON");
  if (exportJSON) {
    exportJSON.addEventListener("click", async () => {
      try {
        const locations = await API.getAll();
        const json = JSON.stringify(locations, null, 2);
        Utils.downloadFile(json, "localizacoes.json", "application/json");
        Utils.showNotification(
          "Arquivo JSON exportado com sucesso!",
          "success",
        );
      } catch (error) {
        Logger.error("Erro ao exportar JSON", error);
        Utils.showNotification("Erro ao exportar JSON", "error");
      }
    });
  }

  // Limpar Cache
  const clearCache = document.getElementById("clearCache");
  if (clearCache) {
    clearCache.addEventListener("click", () => {
      if (confirm("Tem certeza que deseja limpar o cache do navegador?")) {
        // Limpar cache de forma simples
        if ("caches" in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          });
        }
        // Limpar localStorage
        localStorage.clear();
        // Recarregar página
        location.reload();
      }
    });
  }

  // Recarregar Dados
  const refreshData = document.getElementById("refreshData");
  if (refreshData) {
    refreshData.addEventListener("click", async () => {
      try {
        refreshData.disabled = true;
        refreshData.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Recarregando...';

        await loadConfigData();

        Utils.showNotification("Dados recarregados com sucesso!", "success");

        setTimeout(() => {
          refreshData.disabled = false;
          refreshData.innerHTML =
            '<i class="fas fa-sync"></i> Recarregar Dados';
        }, 1000);
      } catch (error) {
        Logger.error("Erro ao recarregar dados", error);
        Utils.showNotification("Erro ao recarregar dados", "error");
        refreshData.disabled = false;
        refreshData.innerHTML = '<i class="fas fa-sync"></i> Recarregar Dados';
      }
    });
  }
}

// ===== CONVERTER PARA CSV =====
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return "Nenhum dado disponível";
  }

  // Cabeçalhos
  const headers = [
    "ID",
    "Título",
    "Descrição",
    "Endereço",
    "Categoria",
    "Latitude",
    "Longitude",
    "Telefone",
    "Email",
    "Site",
    "Horário",
    "Status",
    "Visualizações",
    "Data de Criação",
  ];

  // Linhas
  const rows = data.map((item) => {
    return [
      item.id || "",
      `"${(item.titulo || "").replace(/"/g, '""')}"`,
      `"${(item.descricao || "").replace(/"/g, '""')}"`,
      `"${(item.endereco || "").replace(/"/g, '""')}"`,
      item.categoria || "",
      item.latitude || "",
      item.longitude || "",
      `"${item.contato?.telefone || ""}"`,
      item.contato?.email || "",
      item.contato?.site || "",
      `"${item.horario_funcionamento || ""}"`,
      item.status || "",
      item.visualizacoes || 0,
      item.data_criacao
        ? new Date(item.data_criacao.seconds * 1000).toISOString()
        : "",
    ];
  });

  // Montar CSV
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
