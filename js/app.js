/**
 * Aplicação Principal - Mapa da Inclusão
 * Versão: 1.0.0
 */

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", async () => {
  Logger.info("Iniciando aplicação...");

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

    // Inicializar mapa
    const mapElement = document.getElementById("map");
    MapaApp.init(mapElement);

    // Configurar eventos
    setupEvents();

    // Carregar dados
    await loadData();

    Logger.info("Aplicação iniciada com sucesso");
  } catch (error) {
    Logger.error("Erro ao iniciar aplicação", error);
    Utils.showNotification(
      "Erro ao carregar o sistema. Tente recarregar a página.",
      "error",
      5000,
    );
  }
});

// ===== EVENTOS =====
function setupEvents() {
  // Navegação mobile
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  // Filtro por categoria
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", async () => {
      Logger.info("Filtro alterado:", categoryFilter.value);
      await loadData(categoryFilter.value);
    });
  }

  // Busca
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  if (searchInput && searchBtn) {
    const doSearch = async () => {
      const query = searchInput.value.trim();
      await loadData(null, query);
    };

    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        doSearch();
      }
    });
    // Busca automática com debounce
    searchInput.addEventListener("input", Utils.debounce(doSearch, 500));
  }

  // Configurar callback do mapa
  MapaApp.onMarkerClick = (location) => {
    // Navegar para detalhes
    window.location.href = `detalhes.html?id=${location.id}`;
  };
}

// ===== CARREGAR DADOS =====
async function loadData(category = null, search = null) {
  Logger.info("Carregando dados...");

  try {
    // Mostrar loading
    showLoading(true);

    // Preparar filtros
    const filters = {};
    if (category && category !== "all") {
      filters.categoria = category;
    }

    // Buscar localizações
    let locations;
    if (search && search.trim()) {
      locations = await API.search(search.trim(), filters);
    } else {
      locations = await API.getAll(filters);
    }

    // Atualizar mapa
    MapaApp.addMarkers(locations, { fitBounds: true });

    // Atualizar lista
    updateLocationsList(locations);

    // Atualizar estatísticas
    await updateStats();

    Logger.info(`${locations.length} localizações carregadas`);
  } catch (error) {
    Logger.error("Erro ao carregar dados", error);
    Utils.showNotification("Erro ao carregar localizações", "error");
  } finally {
    showLoading(false);
  }
}

// ===== LISTA DE LOCALIZAÇÕES =====
function updateLocationsList(locations) {
  const container = document.getElementById("locationsContainer");
  const countSpan = document.getElementById("listCount");

  if (!container) return;

  // Atualizar contador
  if (countSpan) {
    countSpan.textContent = `${locations.length} encontrados`;
  }

  if (locations.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt"></i>
                <p>Nenhuma localização encontrada</p>
            </div>
        `;
    return;
  }

  // Gerar cards
  let html = "";
  locations.forEach((location) => {
    const category = MapaApp.categories.find(
      (c) => c.id === location.categoria,
    );
    const categoryName = category ? category.nome : location.categoria;
    const categoryColor = category ? category.cor : "#3498db";

    const imageUrl =
      location.imagens && location.imagens.length > 0
        ? location.imagens[0]
        : "assets/placeholder.jpg";

    html += `
            <div class="location-card" onclick="window.location.href='detalhes.html?id=${location.id}'">
                <div class="location-card-image">
                    <img src="${imageUrl}" alt="${Utils.sanitizeHTML(location.titulo)}" loading="lazy">
                </div>
                <div class="location-card-content">
                    <h4>${Utils.sanitizeHTML(location.titulo)}</h4>
                    <span class="category-badge" style="background-color: ${categoryColor}">
                        ${category ? category.icone : ""} ${categoryName}
                    </span>
                    <p>${Utils.sanitizeHTML(Utils.truncateText(location.descricao, 80))}</p>
                    <div class="card-footer">
                        <span class="address">
                            <i class="fas fa-map-pin"></i> ${Utils.sanitizeHTML(location.endereco)}
                        </span>
                        <span class="views">
                            <i class="fas fa-eye"></i> ${location.visualizacoes || 0}
                        </span>
                    </div>
                </div>
            </div>
        `;
  });

  container.innerHTML = html;
}

// ===== ESTATÍSTICAS =====
async function updateStats() {
  try {
    const stats = await API.getStats();

    // Atualizar elementos
    const elements = {
      totalCount: stats.total,
      educacaoCount: stats.byCategory.educacao || 0,
      saudeCount: stats.byCategory.saude || 0,
      culturaCount: stats.byCategory.cultura || 0,
      esporteCount: stats.byCategory.esporte || 0,
      assistenciaCount: stats.byCategory.assistencia || 0,
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }

    Logger.info("Estatísticas atualizadas", stats);
  } catch (error) {
    Logger.error("Erro ao atualizar estatísticas", error);
  }
}

// ===== LOADING =====
function showLoading(show) {
  const container = document.getElementById("locationsContainer");
  if (!container) return;

  if (show) {
    container.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Carregando localizações...</p>
            </div>
        `;
  }
}

// ===== NOTIFICAÇÕES GLOBAIS =====
// A função Utils.showNotification já está disponível

// ===== EXPORTAR FUNÇÕES =====
window.loadData = loadData;
window.updateStats = updateStats;
