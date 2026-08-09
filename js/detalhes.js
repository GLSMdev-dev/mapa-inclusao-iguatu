let currentLocation = null;
let detailMapInstance = null;

document.addEventListener("DOMContentLoaded", async function () {
  Logger.info("Iniciando pagina de detalhes...");
  try {
    if (!window.FIREBASE_CONFIG) {
      throw new Error("Firebase nao configurado");
    }

    API.init(window.FIREBASE_CONFIG);

    // Carregar categorias
    var categories = await API.createDefaultCategories();
    if (window.MapaApp) {
      MapaApp.setCategories(categories);
    }

    var urlParams = Utils.getURLParams();
    var id = urlParams.id;

    if (!id) {
      Utils.showNotification("ID da localizacao nao fornecido", "error");
      document.getElementById("loadingContainer").style.display = "none";
      document.getElementById("detailsContentInner").innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h2>Localizacao nao encontrada</h2>
          <p>O ID da localizacao nao foi fornecido.</p>
          <button onclick="window.location.href='index.html'" class="btn btn-primary">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      `;
      return;
    }

    await loadDetails(id);
    Logger.info("Detalhes carregados com sucesso");
  } catch (error) {
    Logger.error("Erro ao carregar detalhes", error);
    Utils.showNotification("Erro ao carregar detalhes. Verifique sua conexão.", "error");
    document.getElementById("loadingContainer").style.display = "none";
    document.getElementById("detailsContentInner").innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h2>Erro de Conexão (503)</h2>
        <p>Nao foi possivel conectar ao servidor. Tente recarregar a pagina em alguns segundos.</p>
        <button onclick="window.location.reload()" class="btn btn-primary">
          <i class="fas fa-sync"></i> Recarregar
        </button>
      </div>
    `;
  }
});

async function loadDetails(id) {
  try {
    document.getElementById("loadingContainer").style.display = "flex";
    document.getElementById("detailsContentInner").style.display = "none";

    currentLocation = await API.getById(id);

    if (!currentLocation) {
      throw new Error("Localizacao nao encontrada");
    }

    // PREENCHER OS DADOS
    populateDetails(currentLocation);

    document.getElementById("loadingContainer").style.display = "none";
    document.getElementById("detailsContentInner").style.display = "block";
    
    // CONFIGURAR OS BOTÕES
    setupDetailEvents(currentLocation);
    
    Logger.info("Detalhes da localizacao " + id + " carregados");
  } catch (error) {
    Logger.error("Erro ao carregar detalhes " + id, error);
    document.getElementById("loadingContainer").style.display = "none";
    document.getElementById("detailsContentInner").innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h2>Localizacao nao encontrada</h2>
        <p>Nao foi possivel encontrar a localizacao solicitada.</p>
        <button onclick="window.location.href='index.html'" class="btn btn-primary">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>
      </div>
    `;
  }
}

async function verificarSenha(acao) {
  return new Promise(function (resolve) {
    // CORREÇÃO: Usa a senha definida no config.js
    var senhaCorreta = window.APP_CONFIG?.adminPassword || "PertenSer26";
    var senhaDigitada = prompt("🔒 Para " + acao + ", digite a senha de administrador:", "");
    if (senhaDigitada === null) {
      Utils.showNotification("Operacao cancelada pelo usuario.", "info");
      resolve(false);
      return;
    }
    if (senhaDigitada === senhaCorreta) {
      resolve(true);
    } else {
      Utils.showNotification("❌ Senha incorreta! Tente novamente.", "error", 3000);
      resolve(false);
    }
  });
}

function populateDetails(location) {
  // --- DIAGNÓSTICO DE ELEMENTOS ---
  const requiredElements = [
    "detailTitulo", "detailCategoria", "detailDescricao", "detailEndereco",
    "detailPublicoAlvo", "detailProfissionais", "detailTelefone", "detailEmail",
    "detailSite", "detailHorario", "detailDataCriacao", "galleryContainer",
    "detailMap"
  ];
  
  let missingElements = [];
  requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
      missingElements.push(id);
    }
  });

  if (missingElements.length > 0) {
    console.error("🚨 ERRO CRÍTICO: Os seguintes IDs não existem no HTML:", missingElements);
    document.getElementById("detailsContentInner").innerHTML = `
      <div class="error-state" style="text-align:left; background:#fff3f3; border:2px solid red; padding:20px;">
        <h2 style="color:red;">🚨 ERRO DE CONFIGURAÇÃO</h2>
        <p><strong>Os seguintes elementos estão faltando no seu arquivo <code>detalhes.html</code>:</strong></p>
        <ul style="font-family:monospace; font-size:14px;">
          ${missingElements.map(id => `<li style="color:#d32f2f;">❌ ID: <strong>${id}</strong></li>`).join('')}
        </ul>
        <p style="margin-top:15px;">Verifique se o HTML da página <code>detalhes.html</code> foi alterado ou corrompido.</p>
        <button onclick="window.location.reload()" class="btn btn-primary" style="margin-top:10px;">
          <i class="fas fa-sync"></i> Recarregar
        </button>
      </div>
    `;
    return;
  }

  // 1. Título
  document.getElementById("detailTitulo").textContent = location.titulo || "Sem título";

  // 2. Categoria
  var category = null;
  if (window.MapaApp && window.MapaApp.categories) {
    for (var i = 0; i < window.MapaApp.categories.length; i++) {
      if (window.MapaApp.categories[i].id === location.categoria) {
        category = window.MapaApp.categories[i];
        break;
      }
    }
  }
  var categoryName = category ? category.nome : location.categoria;
  var categoryColor = location.cor_pin || (category ? category.cor : "#3498db");
  var categoryIcon = category ? category.icone : "📍";
  var badge = document.getElementById("detailCategoria");
  badge.textContent = categoryIcon + " " + categoryName;
  badge.style.backgroundColor = categoryColor;

  // 3. Descrição
  document.getElementById("detailDescricao").textContent = location.descricao || "Sem descrição";

  // 4. Endereço
  document.getElementById("detailEndereco").textContent = location.endereco || "Não informado";
  
  // 5. Público-alvo
  document.getElementById("detailPublicoAlvo").textContent = location.publico_alvo || "Não informado";
  
  // 6. Profissionais
  document.getElementById("detailProfissionais").textContent = location.profissionais || "Não informado";

  // 7. Telefone
  document.getElementById("detailTelefone").textContent = location.contato?.telefone || "Não informado";

  // 8. Email
  document.getElementById("detailEmail").textContent = location.contato?.email || "Não informado";

  // 9. Site
  document.getElementById("detailSite").textContent = location.contato?.site || "Não informado";

  // 10. Horário
  document.getElementById("detailHorario").textContent = location.horario_funcionamento || "Não informado";

  // 11. Data de Criação
  if (location.data_criacao) {
    var data = location.data_criacao.toDate ? location.data_criacao.toDate() : location.data_criacao;
    document.getElementById("detailDataCriacao").textContent = Utils.formatDate(data);
  } else {
    document.getElementById("detailDataCriacao").textContent = "Não informado";
  }

  // 12. Galeria de Imagens
  if (location.imagens && location.imagens.length > 0) {
    setupGallery(location.imagens);
  } else {
    document.getElementById("galleryContainer").innerHTML = `
      <div class="no-images">
        <i class="fas fa-image"></i>
        <p>Nenhuma imagem disponível</p>
      </div>
    `;
  }

  // 13. Mapa
  setupDetailMap(location);
}

function setupGallery(images) {
  var mainImage = document.getElementById("mainImage");
  var thumbnails = document.getElementById("galleryThumbnails");
  if (!mainImage || !thumbnails) return;

  mainImage.src = images[0];
  mainImage.alt = "Imagem principal";
  thumbnails.innerHTML = "";

  for (var i = 0; i < images.length; i++) {
    var url = images[i];
    var img = document.createElement("img");
    img.src = url;
    img.alt = "Imagem " + (i + 1);
    img.className = i === 0 ? "active" : "";
    img.dataset.index = i;

    img.addEventListener("click", function () {
      var clickedImg = this;
      mainImage.src = clickedImg.src;
      var allThumbs = document.querySelectorAll("#galleryThumbnails img");
      for (var j = 0; j < allThumbs.length; j++) {
        allThumbs[j].classList.remove("active");
      }
      clickedImg.classList.add("active");
    });
    thumbnails.appendChild(img);
  }
}

function setupDetailMap(location) {
  var mapElement = document.getElementById("detailMap");
  if (!mapElement) return;

  if (detailMapInstance) {
    detailMapInstance.remove();
    detailMapInstance = null;
  }

  // CORREÇÃO DO MAPA: Inicializa exatamente nas coordenadas da localização
  detailMapInstance = L.map(mapElement, {
    center: [location.latitude, location.longitude],
    zoom: 15,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(detailMapInstance);

  var categoryColor = location.cor_pin || "#3498db";
  var categoryIcon = "📍";

  var icon = L.divIcon({
    className: "detail-marker",
    html: '<div style="background-color:' + categoryColor + ';width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);font-size:20px;color:white;">' + categoryIcon + "</div>",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  L.marker([location.latitude, location.longitude], { icon: icon })
    .addTo(detailMapInstance)
    .bindPopup("<strong>" + Utils.sanitizeHTML(location.titulo) + "</strong>")
    .openPopup();
}

function setupDetailEvents(location) {
  var editBtn = document.getElementById("editBtn");
  if (editBtn) {
    var newEditBtn = editBtn.cloneNode(true);
    editBtn.parentNode.replaceChild(newEditBtn, editBtn);
    
    newEditBtn.addEventListener("click", async function () {
      var senhaOk = await verificarSenha("editar esta acao");
      if (senhaOk) {
        window.location.href = "cadastro.html?id=" + location.id;
      }
    });
  }

  var deleteBtn = document.getElementById("deleteBtn");
  if (deleteBtn) {
    var newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    
    newDeleteBtn.addEventListener("click", async function () {
      var senhaOk = await verificarSenha("excluir esta acao");
      if (!senhaOk) {
        return;
      }
      if (confirm('Tem certeza que deseja excluir "' + location.titulo + '"? Esta acao nao pode ser desfeita.')) {
        try {
          newDeleteBtn.disabled = true;
          newDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
          await API.delete(location.id);
          Utils.showNotification("Localizacao excluida com sucesso!", "success");
          setTimeout(function () {
            window.location.href = "index.html";
          }, 1500);
        } catch (error) {
          Logger.error("Erro ao excluir localizacao", error);
          Utils.showNotification("Erro ao excluir localizacao", "error");
          newDeleteBtn.disabled = false;
          newDeleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';
        }
      }
    });
  }
}

// Estilos para o estado de erro
var style = document.createElement("style");
style.textContent = `
  .error-state {
    text-align: center;
    padding: 60px 20px;
  }
  .error-state i {
    font-size: 48px;
    color: #e74c3c;
    margin-bottom: 20px;
  }
  .error-state h2 {
    color: #2c3e50;
    margin-bottom: 10px;
  }
  .error-state p {
    color: #7f8c8d;
    margin-bottom: 20px;
  }
  .no-images {
    text-align: center;
    padding: 40px;
    background-color: #f8f9fa;
    border-radius: 8px;
  }
  .no-images i {
    font-size: 48px;
    color: #bdc3c7;
    margin-bottom: 10px;
  }
  .no-images p {
    color: #95a5a6;
  }
`;
document.head.appendChild(style);
