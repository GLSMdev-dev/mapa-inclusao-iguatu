/**
 * Aplicação Principal - Projeto PertenSer
 * Versão: 1.0.0
 */

const APP_STATE = {
  isAddingLocation: false,
  uploadFiles: [],
  pendingLocation: null,
};

// ===== INICIALIZAÇÃO =====
document.addEventListener("DOMContentLoaded", async () => {
  Logger.info("Iniciando aplicação...");

  try {
    if (!window.FIREBASE_CONFIG) {
      throw new Error("Firebase não configurado");
    }

    API.init(window.FIREBASE_CONFIG);

    const categories = await API.createDefaultCategories();
    MapaApp.setCategories(categories);
    populateCategoryFilter(categories);

    const mapElement = document.getElementById("map");
    MapaApp.init(mapElement);

    setupEvents();

    if (window.location.hash === "#cadastrar") {
      openModal();
    }

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
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", async () => {
      Logger.info("Filtro alterado:", categoryFilter.value);
      await loadData(categoryFilter.value);
    });
  }

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
    searchInput.addEventListener("input", Utils.debounce(doSearch, 500));
  }

  const openModalBtn = document.getElementById("openRegisterModal");
  if (openModalBtn) {
    openModalBtn.addEventListener("click", () => startAddLocationMode());
  }

  const cancelAddBtn = document.getElementById("cancelAddMode");
  if (cancelAddBtn) {
    cancelAddBtn.addEventListener("click", () => {
      exitAddLocationMode();
      Utils.showNotification("Modo de cadastro cancelado", "info");
    });
  }

  const modal = document.getElementById("registerModal");
  const closeModalBtn = document.getElementById("closeRegisterModal");
  const detailsModal = document.getElementById("detailsModal");
  const closeDetailsBtn = document.getElementById("closeDetailsModal");

  if (modal && closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  if (detailsModal && closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", closeDetailsModal);
    detailsModal.addEventListener("click", (event) => {
      if (event.target === detailsModal) {
        closeDetailsModal();
      }
    });
  }

  const form = document.getElementById("locationFormModal");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      const color = swatch.dataset.color;
      const colorInput = document.getElementById("pinColor");
      if (colorInput) {
        colorInput.value = color;
      }
      updatePinColorSelection(color);
    });
  });

  const photoInput = document.getElementById("photoInput");
  if (photoInput) {
    photoInput.addEventListener("change", (event) => {
      handleFiles(event.target.files);
    });
  }

  const dropZone = document.getElementById("dropZoneModal");
  if (dropZone) {
    dropZone.addEventListener("click", () => photoInput.click());
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("drag-active");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("drag-active");
    });
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.classList.remove("drag-active");
      if (event.dataTransfer.files.length) {
        handleFiles(event.dataTransfer.files);
      }
    });
  }

  const pickLocationHint = document.getElementById("pickLocationHint");
  if (pickLocationHint) {
    pickLocationHint.addEventListener("click", () => startAddLocationMode());
  }

  MapaApp.onMarkerClick = (location) => {
    openDetailsModal(location);
  };

  MapaApp.onLocationClick = (latlng) => {
    if (!APP_STATE.isAddingLocation) {
      return;
    }

    const { lat, lng } = latlng;
    APP_STATE.pendingLocation = { lat, lng };
    document.getElementById("latitude").value = lat;
    document.getElementById("longitude").value = lng;
    document.getElementById("address").value = "Buscando endereço...";

    Utils.reverseGeocode(lat, lng).then((address) => {
      if (document.getElementById("address").value === "Buscando endereço...") {
        document.getElementById("address").value = address;
      }
    });

    MapaApp.addSelectMarker(lat, lng);
    openModal({ lat, lng });
    exitAddLocationMode();
  };

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#cadastrar") {
      openModal();
    }
  });
}

function populateCategoryFilter(categories) {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  categoryFilter.innerHTML = '<option value="all">Todas as categorias</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.icone} ${category.nome}`;
    categoryFilter.appendChild(option);
  });

  const categorySelect = document.getElementById("actionCategory");
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Selecione a categoria</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = `${category.icone} ${category.nome}`;
      categorySelect.appendChild(option);
    });
  }
}

function startAddLocationMode() {
  APP_STATE.isAddingLocation = true;
  const hint = document.getElementById("pickLocationHint");
  const cancelBtn = document.getElementById("cancelAddMode");
  if (hint) {
    hint.classList.add("active");
  }
  if (cancelBtn) {
    cancelBtn.classList.remove("hidden");
  }
  Utils.showNotification("Clique no mapa para marcar o local da ação", "info");
}

function exitAddLocationMode() {
  APP_STATE.isAddingLocation = false;
  const hint = document.getElementById("pickLocationHint");
  const cancelBtn = document.getElementById("cancelAddMode");
  if (hint) {
    hint.classList.remove("active");
  }
  if (cancelBtn) {
    cancelBtn.classList.add("hidden");
  }
}

function openModal(defaults = {}) {
  const modal = document.getElementById("registerModal");
  const form = document.getElementById("locationFormModal");
  if (!modal || !form) return;

  const resolvedDefaults = {
    ...defaults,
    lat: defaults.lat ?? APP_STATE.pendingLocation?.lat,
    lng: defaults.lng ?? APP_STATE.pendingLocation?.lng,
  };

  if (resolvedDefaults.lat !== undefined && resolvedDefaults.lng !== undefined) {
    APP_STATE.pendingLocation = { lat: resolvedDefaults.lat, lng: resolvedDefaults.lng };
  }

  resetModalForm(resolvedDefaults);
  modal.classList.add("open");
  document.body.classList.add("modal-open");
  window.location.hash = "cadastrar";
}

function closeModal() {
  const modal = document.getElementById("registerModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("modal-open");
  APP_STATE.pendingLocation = null;
  exitAddLocationMode();
  if (window.location.hash === "#cadastrar") {
    history.replaceState(null, "", window.location.pathname);
  }
}

function openDetailsModal(location) {
  const modal = document.getElementById("detailsModal");
  if (!modal) return;

  const title = document.getElementById("detailsModalTitle");
  const content = document.getElementById("detailsModalContent");
  const images = document.getElementById("detailsModalImages");

  if (title) {
    title.textContent = location.titulo || "Ação inclusiva";
  }

  if (content) {
    const category = MapaApp.categories.find((c) => c.id === location.categoria);
    const categoryName = category ? category.nome : location.categoria;
    const categoryColor = location.cor_pin || (category ? category.cor : "#3498db");
    const imageHtml = location.imagens && location.imagens.length > 0
      ? `<img src="${location.imagens[0]}" alt="${Utils.sanitizeHTML(location.titulo || "Imagem")}" class="details-modal-image">`
      : "";

    content.innerHTML = `
      <div class="details-modal-badge" style="background-color:${categoryColor}">${category ? category.icone : "📍"} ${Utils.sanitizeHTML(categoryName)}</div>
      <p>${Utils.sanitizeHTML(location.descricao || "Sem descrição")}</p>
      <div class="details-modal-meta">
        <span><strong>Endereço:</strong> ${Utils.sanitizeHTML(location.endereco || "Não informado")}</span>
        <span><strong>Público-alvo:</strong> ${Utils.sanitizeHTML(location.publico_alvo || "Não informado")}</span>
        <span><strong>Profissionais:</strong> ${Utils.sanitizeHTML(location.profissionais || "Não informado")}</span>
      </div>
      ${imageHtml}
    `;
  }

  if (images) {
    if (location.imagens && location.imagens.length > 1) {
      images.innerHTML = location.imagens
        .slice(1)
        .map((imageUrl) => `<img src="${imageUrl}" alt="Foto da ação" class="details-modal-thumb">`)
        .join("");
    } else {
      images.innerHTML = "";
    }
  }

  modal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeDetailsModal() {
  const modal = document.getElementById("detailsModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("modal-open");
}

function updatePinColorSelection(colorValue) {
  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.color === colorValue);
  });
}

function resetModalForm(defaults = {}) {
  const form = document.getElementById("locationFormModal");
  if (!form) return;
  form.reset();

  const lat = defaults.lat ?? APP_STATE.pendingLocation?.lat ?? "";
  const lng = defaults.lng ?? APP_STATE.pendingLocation?.lng ?? "";
  document.getElementById("latitude").value = lat;
  document.getElementById("longitude").value = lng;
  document.getElementById("address").value = defaults.address || "";
  const colorInput = document.getElementById("pinColor");
  const colorValue = defaults.pinColor || "#e74c3c";
  if (colorInput) {
    colorInput.value = colorValue;
  }
  updatePinColorSelection(colorValue);
  document.getElementById("imagePreviewModal").innerHTML = "";
  APP_STATE.uploadFiles = [];
  const fileList = document.getElementById("fileListModal");
  if (fileList) fileList.value = "";
}

function handleFiles(files) {
  const previewContainer = document.getElementById("imagePreviewModal");
  if (!previewContainer) return;

  const validFiles = Array.from(files).filter((file) => {
    if (!Utils.validateImageType(file)) {
      Utils.showNotification(`${file.name}: tipo não suportado`, "warning");
      return false;
    }
    if (!Utils.validateFileSize(file, 5)) {
      Utils.showNotification(`${file.name}: tamanho máximo de 5MB`, "warning");
      return false;
    }
    return true;
  });

  if (!validFiles.length) {
    Utils.showNotification("Nenhuma imagem válida foi selecionada", "warning");
    return;
  }

  validFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.innerHTML = `
        <img src="${event.target.result}" alt="${file.name}">
        <button type="button" class="remove-image" data-file="${file.name}">
          <i class="fas fa-times"></i>
        </button>
      `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  APP_STATE.uploadFiles.push(...validFiles);
  Utils.showNotification(`${validFiles.length} imagem(ns) adicionada(s)`, "success");
}

function attachPreviewRemoveHandler() {
  document.querySelectorAll("#imagePreviewModal .remove-image").forEach((button) => {
    button.addEventListener("click", () => {
      const fileName = button.dataset.file;
      APP_STATE.uploadFiles = APP_STATE.uploadFiles.filter((file) => file.name !== fileName);
      button.closest(".preview-item").remove();
    });
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  Logger.info("Submetendo ação inclusiva...");

  const form = event.target;
  const requiredFields = form.querySelectorAll("[required]");
  let isValid = true;

  requiredFields.forEach((field) => {
    if (!field.value.trim()) {
      isValid = false;
      field.style.borderColor = "#e74c3c";
    } else {
      field.style.borderColor = "#bdc3c7";
    }
  });

  const lat = parseFloat(document.getElementById("latitude").value);
  const lng = parseFloat(document.getElementById("longitude").value);
  const resolvedLocation = APP_STATE.pendingLocation || (Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);

  if (!resolvedLocation) {
    Utils.showNotification("Marque o local no mapa antes de salvar", "warning");
    return;
  }

  if (!isValid) {
    Utils.showNotification("Preencha os campos obrigatórios antes de salvar", "warning");
    return;
  }

  const submitBtn = document.getElementById("submitActionBtn");
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    const locationData = {
      titulo: document.getElementById("actionName").value.trim(),
      descricao: document.getElementById("actionDescription").value.trim(),
      endereco: document.getElementById("address").value.trim(),
      categoria: document.getElementById("actionCategory").value,
      publico_alvo: document.getElementById("publicTarget").value.trim(),
      profissionais: document.getElementById("professionals").value.trim(),
      cor_pin: document.getElementById("pinColor").value,
      latitude: resolvedLocation.lat,
      longitude: resolvedLocation.lng,
      contato: {
        telefone: "",
        email: "",
        site: "",
      },
      horario_funcionamento: "",
    };

    const result = await API.saveLocation(
      locationData,
      null,
      APP_STATE.uploadFiles,
      [],
    );

    Utils.showNotification("Ação inclusiva cadastrada com sucesso", "success");
    form.reset();
    APP_STATE.pendingLocation = null;
    closeModal();
    await loadData();
    MapaApp.centerOn(resolvedLocation.lat, resolvedLocation.lng, 15);
    Logger.info("Ação cadastrada", result);
  } catch (error) {
    Logger.error("Erro ao cadastrar ação", error);
    Utils.showNotification("Erro ao salvar a ação. Tente novamente.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// ===== CARREGAR DADOS =====
async function loadData(category = null, search = null) {
  Logger.info("Carregando dados...");

  try {
    showLoading(true);

    const filters = {};
    if (category && category !== "all") {
      filters.categoria = category;
    }

    let locations;
    if (search && search.trim()) {
      locations = await API.search(search.trim(), filters);
    } else {
      locations = await API.getAll(filters);
    }

    MapaApp.addMarkers(locations, { fitBounds: true });
    updateLocationsList(locations);
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

  if (countSpan) {
    countSpan.textContent = `${locations.length} encontrados`;
  }

  if (locations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-map-marker-alt"></i>
        <p>Nenhuma ação inclusiva cadastrada ainda.</p>
      </div>
    `;
    return;
  }

  let html = "";
  locations.forEach((location) => {
    const category = MapaApp.categories.find((c) => c.id === location.categoria);
    const categoryName = category ? category.nome : location.categoria;
    const categoryColor = location.cor_pin || (category ? category.cor : "#3498db");
    const imageUrl = location.imagens && location.imagens.length > 0 ? location.imagens[0] : "assets/placeholder.jpg";

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
            <span class="address"><i class="fas fa-map-pin"></i> ${Utils.sanitizeHTML(location.endereco)}</span>
            <span class="views"><i class="fas fa-eye"></i> ${location.visualizacoes || 0}</span>
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
    const elements = {
      totalCount: stats.total,
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
        <p>Carregando ações inclusivas...</p>
      </div>
    `;
  }
}

window.loadData = loadData;
window.updateStats = updateStats;
window.closeDetailsModal = closeDetailsModal;
window.updatePinColorSelection = updatePinColorSelection;
