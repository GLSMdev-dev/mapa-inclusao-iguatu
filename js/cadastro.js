/**
 * Cadastro - Mapa da Inclusão
 * Versão: 1.0.0
 */

document.addEventListener("DOMContentLoaded", async () => {
  Logger.info("Iniciando formulário de cadastro...");

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

    // Preencher select de categorias
    populateCategorySelect(categories);

    // Inicializar mapa
    const mapElement = document.getElementById("map");
    MapaApp.init(mapElement, {
      center: [-6.3616, -39.2925],
      zoom: 14,
    });

    // Verificar se é edição
    const urlParams = Utils.getURLParams();
    if (urlParams.id) {
      await loadLocationForEdit(urlParams.id);
    }

    // Configurar eventos
    setupFormEvents();

    // Adicionar marcador inicial
    MapaApp.centerOn(-6.3616, -39.2925);

    Logger.info("Formulário inicializado");
  } catch (error) {
    Logger.error("Erro ao inicializar formulário", error);
    Utils.showNotification("Erro ao carregar formulário", "error");
  }
});

// ===== POPULAR CATEGORIAS =====
function populateCategorySelect(categories) {
  const select = document.getElementById("categoria");
  if (!select) return;

  // Manter a opção padrão
  select.innerHTML = '<option value="">Selecione uma categoria</option>';

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.icone} ${category.nome}`;
    select.appendChild(option);
  });
}

// ===== CARREGAR PARA EDIÇÃO =====
async function loadLocationForEdit(id) {
  try {
    Logger.info(`Carregando localização ${id} para edição...`);

    // Buscar dados
    const location = await API.getById(id);

    if (!location) {
      Utils.showNotification("Localização não encontrada", "error");
      return;
    }

    // Preencher formulário
    const form = document.getElementById("locationForm");
    if (form) {
      document.getElementById("titulo").value = location.titulo || "";
      document.getElementById("descricao").value = location.descricao || "";
      document.getElementById("endereco").value = location.endereco || "";
      document.getElementById("categoria").value = location.categoria || "";
      document.getElementById("publicoAlvo").value = location.publico_alvo || "";
      document.getElementById("profissionais").value = location.profissionais || "";
      document.getElementById("latitude").value = location.latitude || "";
      document.getElementById("longitude").value = location.longitude || "";
      document.getElementById("telefone").value =
        location.contato?.telefone || "";
      document.getElementById("email").value = location.contato?.email || "";
      document.getElementById("site").value = location.contato?.site || "";
      document.getElementById("horario").value =
        location.horario_funcionamento || "";
    }

    // Mostrar imagens existentes
    if (location.imagens && location.imagens.length > 0) {
      const previewContainer = document.getElementById("imagePreview");
      if (previewContainer) {
        previewContainer.innerHTML = "";
        location.imagens.forEach((url, index) => {
          const div = document.createElement("div");
          div.className = "preview-item";
          div.innerHTML = `
                        <img src="${url}" alt="Imagem ${index + 1}">
                        <button type="button" class="remove-image" data-url="${url}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
          previewContainer.appendChild(div);
        });
      }
    }

    // Atualizar título
    const title = document.getElementById("formTitle");
    if (title) {
      title.innerHTML = '<i class="fas fa-edit"></i> Editar Localização';
    }

    // Salvar ID da localização para referência
    form.dataset.editId = id;

    // Adicionar marcador no mapa
    MapaApp.addSelectMarker(location.latitude, location.longitude);

    Logger.info(`Localização ${id} carregada para edição`);
  } catch (error) {
    Logger.error("Erro ao carregar localização para edição", error);
    Utils.showNotification("Erro ao carregar dados para edição", "error");
  }
}

// ===== EVENTOS DO FORMULÁRIO =====
function setupFormEvents() {
  // Clique no mapa
  MapaApp.onLocationClick = (latlng) => {
    const { lat, lng } = latlng;
    document.getElementById("latitude").value = lat;
    document.getElementById("longitude").value = lng;
    MapaApp.addSelectMarker(lat, lng);
  };

  // Geolocalização
  const getLocationBtn = document.getElementById("getCurrentLocation");
  if (getLocationBtn) {
    getLocationBtn.addEventListener("click", async () => {
      try {
        const position = await MapaApp.getUserLocation();
        document.getElementById("latitude").value = position.lat;
        document.getElementById("longitude").value = position.lng;
        MapaApp.addSelectMarker(position.lat, position.lng);

        // Tentar buscar endereço
        const address = await Utils.reverseGeocode(position.lat, position.lng);
        if (address && address !== "Endereço não encontrado") {
          document.getElementById("endereco").value = address;
        }

        Utils.showNotification("Localização obtida com sucesso!", "success");
      } catch (error) {
        Logger.error("Erro ao obter localização", error);
        Utils.showNotification(
          "Não foi possível obter sua localização",
          "warning",
        );
      }
    });
  }

  // Upload de imagens
  setupImageUpload();

  // Remover imagens existentes (edição)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".remove-image")) {
      const btn = e.target.closest(".remove-image");
      const url = btn.dataset.url;
      if (url) {
        // Marcar para remoção
        btn.closest(".preview-item").remove();
        // Adicionar à lista de imagens a remover
        const removedList =
          document.getElementById("removedImages") ||
          (() => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.id = "removedImages";
            input.name = "removedImages";
            document.getElementById("locationForm").appendChild(input);
            return input;
          })();

        const current = JSON.parse(removedList.value || "[]");
        current.push(url);
        removedList.value = JSON.stringify(current);
      }
    }
  });

  // Submit do formulário
  const form = document.getElementById("locationForm");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  // Cancelar
  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (
        confirm(
          "Tem certeza que deseja cancelar? As alterações não serão salvas.",
        )
      ) {
        window.location.href = "index.html";
      }
    });
  }
}

// ===== UPLOAD DE IMAGENS =====
function setupImageUpload() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("imageInput");
  const previewContainer = document.getElementById("imagePreview");

  if (!dropZone || !fileInput || !previewContainer) return;

  // Clique para upload
  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  // Drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#3498db";
    dropZone.style.backgroundColor = "#ebf5fb";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#bdc3c7";
    dropZone.style.backgroundColor = "#f8f9fa";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#bdc3c7";
    dropZone.style.backgroundColor = "#f8f9fa";

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  });

  // Seleção de arquivos
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
    }
  });
}

function handleFiles(files) {
  const previewContainer = document.getElementById("imagePreview");
  if (!previewContainer) return;

  // Limitar a 5 imagens
  const currentCount =
    previewContainer.querySelectorAll(".preview-item").length;
  const maxFiles = 5;
  const remaining = maxFiles - currentCount;

  if (remaining <= 0) {
    Utils.showNotification("Máximo de 5 imagens permitidas", "warning");
    return;
  }

  let addedCount = 0;
  const validFiles = [];

  for (const file of files) {
    if (addedCount >= remaining) break;

    // Validar tipo e tamanho
    if (!Utils.validateImageType(file)) {
      Utils.showNotification(`${file.name}: Tipo não suportado`, "warning");
      continue;
    }

    if (!Utils.validateFileSize(file, 5)) {
      Utils.showNotification(
        `${file.name}: Arquivo muito grande (max 5MB)`,
        "warning",
      );
      continue;
    }

    validFiles.push(file);
    addedCount++;
  }

  if (validFiles.length === 0) {
    Utils.showNotification("Nenhum arquivo válido selecionado", "warning");
    return;
  }

  // Adicionar previews
  validFiles.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "preview-item";
      div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button type="button" class="remove-image" data-file="${file.name}">
                    <i class="fas fa-times"></i>
                </button>
            `;
      previewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  // Salvar arquivos para upload
  const fileList =
    document.getElementById("fileList") ||
    (() => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.id = "fileList";
      input.name = "fileList";
      document.getElementById("locationForm").appendChild(input);
      return input;
    })();

  const currentFiles = JSON.parse(fileList.value || "[]");
  validFiles.forEach((file) => {
    currentFiles.push({
      name: file.name,
      size: file.size,
      type: file.type,
    });
  });
  fileList.value = JSON.stringify(currentFiles);

  // Armazenar os arquivos em um objeto global
  if (!window.uploadFiles) {
    window.uploadFiles = [];
  }
  window.uploadFiles.push(...validFiles);

  Utils.showNotification(
    `${validFiles.length} imagem(ns) adicionada(s)`,
    "success",
  );
}

// ===== SUBMIT =====
async function handleSubmit(e) {
  e.preventDefault();
  Logger.info("Submetendo formulário...");

  try {
    // Validar campos obrigatórios
    const form = e.target;
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

    if (!isValid) {
      Utils.showNotification(
        "Preencha todos os campos obrigatórios",
        "warning",
      );
      return;
    }

    // Validar coordenadas
    const lat = parseFloat(document.getElementById("latitude").value);
    const lng = parseFloat(document.getElementById("longitude").value);

    if (isNaN(lat) || isNaN(lng)) {
      Utils.showNotification("Selecione uma localização no mapa", "warning");
      return;
    }

    // Preparar dados
    const locationData = {
      titulo: document.getElementById("titulo").value.trim(),
      descricao: document.getElementById("descricao").value.trim(),
      endereco: document.getElementById("endereco").value.trim(),
      categoria: document.getElementById("categoria").value,
      latitude: lat,
      longitude: lng,
      contato: {
        telefone: document.getElementById("telefone").value.trim(),
        email: document.getElementById("email").value.trim(),
        site: document.getElementById("site").value.trim(),
      },
      horario_funcionamento: document.getElementById("horario").value.trim(),
      publico_alvo: document.getElementById("publicoAlvo").value.trim(),
      profissionais: document.getElementById("profissionais").value.trim(),
    };

    // Verificar se é edição
    const isEdit = form.dataset.editId;
    const locationId = isEdit || null;

    // Mostrar loading
    const submitBtn = document.getElementById("submitBtn");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    let existingImages = [];

    if (isEdit) {
      const previewItems = document.querySelectorAll(
        "#imagePreview .preview-item",
      );
      previewItems.forEach((item) => {
        const img = item.querySelector("img");
        if (img && img.src) {
          existingImages.push(img.src);
        }
      });

      const removedList = document.getElementById("removedImages");
      if (removedList) {
        const removed = JSON.parse(removedList.value || "[]");
        for (const url of removed) {
          try {
            await API.deleteImage(url);
            Logger.info(`Imagem removida: ${url}`);
          } catch (e) {
            Logger.warn(`Erro ao remover imagem ${url}`, e);
          }
        }
      }
    }

    const result = await API.saveLocation(
      locationData,
      locationId,
      window.uploadFiles || [],
      existingImages,
    );

    if (isEdit) {
      Utils.showNotification("Localização atualizada com sucesso!", "success");
    } else {
      Utils.showNotification("Localização criada com sucesso!", "success");
    }

    Logger.info("Localização salva com sucesso", result);

    // Redirecionar
    setTimeout(() => {
      window.location.href = `detalhes.html?id=${result.id}`;
    }, 1500);
  } catch (error) {
    Logger.error("Erro ao salvar localização", error);
    Utils.showNotification("Erro ao salvar. Tente novamente.", "error");

    // Restaurar botão
    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
  }
}

// ===== FUNÇÕES AUXILIARES =====
function showNotification(message, type = "info") {
  // Usa a função global
  if (window.Utils && Utils.showNotification) {
    Utils.showNotification(message, type);
  } else {
    alert(message);
  }
}
