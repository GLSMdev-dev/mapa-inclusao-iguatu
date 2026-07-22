/**
 * Detalhes - Mapa da Inclusão
 * Versão: 1.0.0
 */

let currentLocation = null;

document.addEventListener("DOMContentLoaded", async () => {
    Logger.info("Iniciando página de detalhes...");

    try {
        // Verificar configuração do Firebase
        if (!window.FIREBASE_CONFIG) {
            throw new Error("Firebase não configurado");
        }

        // Inicializar Firebase
        API.init(window.FIREBASE_CONFIG);

        // Inicializar categorias
        const categories = await API.createDefaultCategories();
        if (window.MapaApp) {
            MapaApp.setCategories(categories);
        }

        // Obter ID da URL
        const urlParams = Utils.getURLParams();
        const id = urlParams.id;

        if (!id) {
            Utils.showNotification("ID da localização não fornecido", "error");
            document.getElementById("loadingContainer").style.display = "none";
            document.getElementById("detailsContentInner").innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Localização não encontrada</h2>
                    <p>O ID da localização não foi fornecido.</p>
                    <button onclick="window.location.href='index.html'" class="btn btn-primary">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                </div>
            `;
            return;
        }

        // Carregar dados
        await loadDetails(id);

        Logger.info("Detalhes carregados com sucesso");
    } catch (error) {
        Logger.error("Erro ao carregar detalhes", error);
        Utils.showNotification("Erro ao carregar detalhes", "error");
    }
});

// ===== CARREGAR DETALHES =====
async function loadDetails(id) {
    try {
        // Mostrar loading
        document.getElementById("loadingContainer").style.display = "flex";
        document.getElementById("detailsContentInner").style.display = "none";

        // Buscar localização
        currentLocation = await API.getById(id);

        if (!currentLocation) {
            throw new Error("Localização não encontrada");
        }

        // Preencher dados
        populateDetails(currentLocation);

        // Esconder loading e mostrar conteúdo
        document.getElementById("loadingContainer").style.display = "none";
        document.getElementById("detailsContentInner").style.display = "block";

        // Configurar eventos
        setupDetailEvents(currentLocation);

        Logger.info(`Detalhes da localização ${id} carregados`);
    } catch (error) {
        Logger.error(`Erro ao carregar detalhes ${id}`, error);
        document.getElementById("loadingContainer").style.display = "none";
        document.getElementById("detailsContentInner").innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Localização não encontrada</h2>
                <p>Não foi possível encontrar a localização solicitada.</p>
                <button onclick="window.location.href='index.html'" class="btn btn-primary">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
            </div>
        `;
    }
}

// ===== VERIFICAÇÃO DE SENHA =====
/**
 * Verifica se a senha está correta
 * @param {string} acao - Nome da ação (para exibir no prompt)
 * @returns {Promise<boolean>} - True se a senha estiver correta
 */
async function verificarSenha(acao = "realizar esta ação") {
    return new Promise((resolve) => {
        // Obter a senha configurada
        const senhaCorreta = window.APP_CONFIG?.adminPassword || "pertencer2024";
        
        // Solicitar senha ao usuário
        const senhaDigitada = prompt(
            `🔒 Para ${acao}, digite a senha de administrador:`,
            ""
        );
        
        // Se o usuário cancelou ou não digitou nada
        if (senhaDigitada === null) {
            Utils.showNotification("Operação cancelada pelo usuário.", "info");
            resolve(false);
            return;
        }
        
        // Verificar senha
        if (senhaDigitada === senhaCorreta) {
            resolve(true);
        } else {
            Utils.showNotification("❌ Senha incorreta! Tente novamente.", "error", 3000);
            resolve(false);
        }
    });
}

// ===== POPULAR DETALHES =====
function populateDetails(location) {
    // Título e categoria
    document.getElementById("detailTitulo").textContent =
        location.titulo || "Sem título";

    const category = window.MapaApp?.categories?.find((c) => c.id === location.categoria);
    const categoryName = category ? category.nome : location.categoria;
    const categoryColor = location.cor_pin || (category ? category.cor : "#3498db");
    const categoryIcon = category ? category.icone : "📍";

    const badge = document.getElementById("detailCategoria");
    badge.textContent = `${categoryIcon} ${categoryName}`;
    badge.style.backgroundColor = categoryColor;

    // Descrição
    document.getElementById("detailDescricao").textContent =
        location.descricao || "Sem descrição";

    // Endereço
    document.getElementById("detailEndereco").textContent =
        location.endereco || "Não informado";

    // Informações adicionais
    document.getElementById("detailPublicoAlvo").textContent =
        location.publico_alvo || "Não informado";

    document.getElementById("detailProfissionais").textContent =
        location.profissionais || "Não informado";

    // Data de criação
    document.getElementById("detailDataCriacao").textContent =
        location.data_criacao
            ? Utils.formatDate(
                location.data_criacao.toDate
                    ? location.data_criacao.toDate()
                    : location.data_criacao,
            )
            : "Não informado";

    // Galeria de imagens
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

    // Mapa
    setupDetailMap(location);
}

// ===== GALERIA =====
function setupGallery(images) {
    const mainImage = document.getElementById("mainImage");
    const thumbnails = document.getElementById("galleryThumbnails");

    if (!mainImage || !thumbnails) return;

    // Primeira imagem como principal
    mainImage.src = images[0];
    mainImage.alt = "Imagem principal";

    // Thumbnails
    thumbnails.innerHTML = "";
    images.forEach((url, index) => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = `Imagem ${index + 1}`;
        img.className = index === 0 ? "active" : "";
        img.dataset.index = index;

        img.addEventListener("click", () => {
            // Atualizar imagem principal
            mainImage.src = url;

            // Atualizar active
            document.querySelectorAll("#galleryThumbnails img").forEach((el) => {
                el.classList.remove("active");
            });
            img.classList.add("active");
        });

        thumbnails.appendChild(img);
    });
}

// ===== MAPA DE DETALHES =====
function setupDetailMap(location) {
    const mapElement = document.getElementById("detailMap");
    if (!mapElement) return;

    // Criar mapa
    const map = L.map(mapElement, {
        center: [location.latitude, location.longitude],
        zoom: 15,
        zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Adicionar marcador
    const categoryColor = window.MapaApp?.getCategoryColor?.(location.categoria) || location.cor_pin || "#3498db";
    const categoryIcon = window.MapaApp?.getCategoryIcon?.(location.categoria) || "📍";

    const icon = L.divIcon({
        className: "detail-marker",
        html: `
            <div style="
                background-color: ${categoryColor};
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                font-size: 20px;
                color: white;
            ">
                ${categoryIcon}
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });

    L.marker([location.latitude, location.longitude], { icon })
        .addTo(map)
        .bindPopup(`<strong>${Utils.sanitizeHTML(location.titulo)}</strong>`)
        .openPopup();
}

// ===== EVENTOS DE AÇÃO =====
function setupDetailEvents(location) {
    // Editar
    const editBtn = document.getElementById("editBtn");
    if (editBtn) {
        editBtn.addEventListener("click", async () => {
            // Verificar senha antes de editar
            const senhaOk = await verificarSenha("editar esta ação");
            if (senhaOk) {
                window.location.href = `cadastro.html?id=${location.id}`;
            }
        });
    }

    // Excluir
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            // Verificar senha antes de excluir
            const senhaOk = await verificarSenha("excluir esta ação");
            if (!senhaOk) {
                return;
            }
            
            // Segunda confirmação (já existente)
            if (
                confirm(
                    `Tem certeza que deseja excluir "${location.titulo}"? Esta ação não pode ser desfeita.`,
                )
            ) {
                try {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML =
                        '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

                    await API.delete(location.id);

                    Utils.showNotification(
                        "Localização excluída com sucesso!",
                        "success",
                    );

                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1500);
                } catch (error) {
                    Logger.error("Erro ao excluir localização", error);
                    Utils.showNotification("Erro ao excluir localização", "error");
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Excluir';
                }
            }
        });
    }
}

// ===== ESTILOS ADICIONAIS =====
// Adicionar estilos dinâmicos para a página de detalhes
const style = document.createElement("style");
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
