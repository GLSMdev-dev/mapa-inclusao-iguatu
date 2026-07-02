/**
 * API Firebase - Mapa da Inclusão
 * Versão: 1.0.0
 *
 * Gerencia comunicação com Firestore e Storage
 */

class FirebaseAPI {
  constructor() {
    this.db = null;
    this.storage = null;
    this.collection = "localizacoes";
    this.categoriesCollection = "categorias";
    this.initialized = false;
  }

  /**
   * Inicializa o Firebase
   */
  init(firebaseConfig) {
    try {
      Logger.info("Inicializando Firebase...");

      // Inicializar Firebase
      firebase.initializeApp(firebaseConfig);

      // Inicializar Firestore
      this.db = firebase.firestore();

      // Configurações do Firestore
      this.db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
      });

      // Habilitar persistência offline
      this.db
        .enablePersistence()
        .then(() => {
          Logger.info("Persistência offline habilitada");
        })
        .catch((err) => {
          Logger.warn("Persistência offline não disponível", err);
        });

      // Inicializar Storage
      this.storage = firebase.storage();

      this.initialized = true;
      Logger.info("Firebase inicializado com sucesso");
      return true;
    } catch (error) {
      Logger.error("Erro ao inicializar Firebase", error);
      throw error;
    }
  }

  /**
   * Verifica se está inicializado
   */
  checkInitialized() {
    if (!this.initialized) {
      throw new Error("Firebase não inicializado");
    }
  }

  // ===== CRUD - Localizações =====

  /**
   * Cria uma nova localização
   */
  async create(locationData) {
    this.checkInitialized();
    Logger.info("Criando nova localização", locationData);

    try {
      // Preparar dados
      const data = {
        ...locationData,
        data_criacao: firebase.firestore.FieldValue.serverTimestamp(),
        data_atualizacao: firebase.firestore.FieldValue.serverTimestamp(),
        status: "ativo",
        visualizacoes: 0,
      };

      // Salvar no Firestore
      const docRef = await this.db.collection(this.collection).add(data);
      const docId = docRef.id;

      Logger.info(`Localização criada com ID: ${docId}`);

      // Atualizar o documento com seu próprio ID
      await docRef.update({ id: docId });

      return {
        ...data,
        id: docId,
      };
    } catch (error) {
      Logger.error("Erro ao criar localização", error);
      throw error;
    }
  }

  /**
   * Busca todas as localizações
   */
  async getAll(filters = {}) {
    this.checkInitialized();
    Logger.info("Buscando localizações", filters);

    try {
      let query = this.db.collection(this.collection);

      // Aplicar filtros
      if (filters.categoria && filters.categoria !== "all") {
        query = query.where("categoria", "==", filters.categoria);
      }

      if (filters.status) {
        query = query.where("status", "==", filters.status);
      }

      // Ordenar por data de criação (mais recentes primeiro)
      query = query.orderBy("data_criacao", "desc");

      const snapshot = await query.get();
      const locations = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        locations.push({
          id: doc.id,
          ...data,
        });
      });

      Logger.info(`${locations.length} localizações encontradas`);
      return locations;
    } catch (error) {
      Logger.error("Erro ao buscar localizações", error);
      throw error;
    }
  }

  /**
   * Busca uma localização por ID
   */
  async getById(id) {
    this.checkInitialized();
    Logger.info(`Buscando localização ${id}`);

    try {
      const docRef = this.db.collection(this.collection).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        Logger.warn(`Localização ${id} não encontrada`);
        return null;
      }

      const data = doc.data();

      // Incrementar visualizações
      await docRef.update({
        visualizacoes: firebase.firestore.FieldValue.increment(1),
      });

      return {
        id: doc.id,
        ...data,
      };
    } catch (error) {
      Logger.error(`Erro ao buscar localização ${id}`, error);
      throw error;
    }
  }

  /**
   * Atualiza uma localização
   */
  async update(id, data) {
    this.checkInitialized();
    Logger.info(`Atualizando localização ${id}`, data);

    try {
      const docRef = this.db.collection(this.collection).doc(id);

      // Remover campos que não devem ser atualizados
      delete data.id;
      delete data.data_criacao;
      delete data.visualizacoes;

      // Adicionar data de atualização
      data.data_atualizacao = firebase.firestore.FieldValue.serverTimestamp();

      await docRef.update(data);

      Logger.info(`Localização ${id} atualizada`);

      // Retornar dados atualizados
      const updatedDoc = await docRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };
    } catch (error) {
      Logger.error(`Erro ao atualizar localização ${id}`, error);
      throw error;
    }
  }

  /**
   * Deleta uma localização
   */
  async delete(id) {
    this.checkInitialized();
    Logger.info(`Deletando localização ${id}`);

    try {
      // Buscar a localização para pegar as imagens
      const location = await this.getById(id);

      if (location && location.imagens && location.imagens.length > 0) {
        // Deletar imagens do Storage
        for (const imageUrl of location.imagens) {
          try {
            const ref = this.storage.refFromURL(imageUrl);
            await ref.delete();
            Logger.info(`Imagem deletada: ${imageUrl}`);
          } catch (e) {
            Logger.warn(`Erro ao deletar imagem ${imageUrl}`, e);
          }
        }
      }

      // Deletar documento do Firestore
      await this.db.collection(this.collection).doc(id).delete();

      Logger.info(`Localização ${id} deletada`);
      return true;
    } catch (error) {
      Logger.error(`Erro ao deletar localização ${id}`, error);
      throw error;
    }
  }

  /**
   * Busca localizações por texto
   */
  async search(searchText, filters = {}) {
    this.checkInitialized();
    Logger.info(`Buscando por: ${searchText}`, filters);

    try {
      // Primeiro buscar todas as localizações com filtros
      const locations = await this.getAll(filters);

      // Filtrar por texto
      const searchLower = searchText.toLowerCase();
      const results = locations.filter((loc) => {
        const title = (loc.titulo || "").toLowerCase();
        const description = (loc.descricao || "").toLowerCase();
        const address = (loc.endereco || "").toLowerCase();

        return (
          title.includes(searchLower) ||
          description.includes(searchLower) ||
          address.includes(searchLower)
        );
      });

      Logger.info(
        `${results.length} resultados encontrados para "${searchText}"`,
      );
      return results;
    } catch (error) {
      Logger.error("Erro ao buscar localizações", error);
      throw error;
    }
  }

  // ===== IMAGENS =====

  /**
   * Upload de uma imagem
   */
  async uploadImage(file, locationId) {
    this.checkInitialized();
    Logger.info(`Fazendo upload de imagem para ${locationId}`, file.name);

    try {
      // Validar arquivo
      if (!Utils.validateImageType(file)) {
        throw new Error(
          "Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.",
        );
      }

      if (!Utils.validateFileSize(file, 5)) {
        throw new Error("Arquivo muito grande. Máximo 5MB.");
      }

      // Gerar nome único
      const extension = file.name.split(".").pop();
      const fileName = `${locationId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${extension}`;

      // Upload para o Storage
      const ref = this.storage.ref(`imagens/${fileName}`);
      const snapshot = await ref.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();

      Logger.info(`Imagem enviada: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      Logger.error("Erro ao fazer upload de imagem", error);
      throw error;
    }
  }

  /**
   * Upload de múltiplas imagens
   */
  async uploadMultipleImages(files, locationId) {
    this.checkInitialized();
    Logger.info(`Fazendo upload de ${files.length} imagens para ${locationId}`);

    try {
      const uploadPromises = [];
      const maxFiles = Math.min(files.length, 5);

      for (let i = 0; i < maxFiles; i++) {
        uploadPromises.push(this.uploadImage(files[i], locationId));
      }

      const urls = await Promise.all(uploadPromises);
      Logger.info(`${urls.length} imagens enviadas com sucesso`);
      return urls;
    } catch (error) {
      Logger.error("Erro ao fazer upload de imagens", error);
      throw error;
    }
  }

  /**
   * Deleta uma imagem
   */
  async deleteImage(imageUrl) {
    this.checkInitialized();
    Logger.info(`Deletando imagem: ${imageUrl}`);

    try {
      const ref = this.storage.refFromURL(imageUrl);
      await ref.delete();
      Logger.info("Imagem deletada");
      return true;
    } catch (error) {
      Logger.error("Erro ao deletar imagem", error);
      throw error;
    }
  }

  // ===== CATEGORIAS =====

  /**
   * Busca todas as categorias
   */
  async getCategories() {
    this.checkInitialized();
    Logger.info("Buscando categorias");

    try {
      const snapshot = await this.db
        .collection(this.categoriesCollection)
        .get();
      const categories = [];

      snapshot.forEach((doc) => {
        categories.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Ordenar por nome
      categories.sort((a, b) => a.nome.localeCompare(b.nome));

      Logger.info(`${categories.length} categorias encontradas`);
      return categories;
    } catch (error) {
      Logger.error("Erro ao buscar categorias", error);
      throw error;
    }
  }

  /**
   * Cria categorias padrão (se não existirem)
   */
  async createDefaultCategories() {
    this.checkInitialized();
    Logger.info("Criando categorias padrão...");

    const defaultCategories = [
      { id: "educacao", nome: "Educação", icone: "🎓", cor: "#3498db" },
      { id: "saude", nome: "Saúde", icone: "🏥", cor: "#2ecc71" },
      { id: "cultura", nome: "Cultura", icone: "🎭", cor: "#e67e22" },
      { id: "esporte", nome: "Esporte", icone: "⚽", cor: "#3498db" },
      {
        id: "assistencia",
        nome: "Assistência Social",
        icone: "🤝",
        cor: "#9b59b6",
      },
    ];

    try {
      // Verificar se já existem categorias
      const existing = await this.getCategories();

      if (existing.length > 0) {
        Logger.info("Categorias já existem");
        return existing;
      }

      // Criar categorias padrão
      for (const category of defaultCategories) {
        await this.db
          .collection(this.categoriesCollection)
          .doc(category.id)
          .set(category);
      }

      Logger.info(`${defaultCategories.length} categorias criadas`);
      return defaultCategories;
    } catch (error) {
      Logger.error("Erro ao criar categorias padrão", error);
      throw error;
    }
  }

  // ===== ESTATÍSTICAS =====

  /**
   * Obtém estatísticas do sistema
   */
  async getStats() {
    this.checkInitialized();
    Logger.info("Buscando estatísticas...");

    try {
      const locations = await this.getAll();
      const categories = await this.getCategories();

      // Total por categoria
      const categoryCount = {};
      let totalViews = 0;
      let totalImages = 0;

      locations.forEach((loc) => {
        // Contar por categoria
        const cat = loc.categoria || "sem_categoria";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        // Soma de visualizações
        totalViews += loc.visualizacoes || 0;

        // Soma de imagens
        totalImages += (loc.imagens || []).length;
      });

      // Mapear nomes das categorias
      const categoryStats = {};
      categories.forEach((cat) => {
        categoryStats[cat.id] = {
          nome: cat.nome,
          cor: cat.cor,
          icone: cat.icone,
          total: categoryCount[cat.id] || 0,
        };
      });

      const stats = {
        total: locations.length,
        totalViews,
        totalImages,
        categories: categoryStats,
        byCategory: categoryCount,
      };

      Logger.info("Estatísticas obtidas com sucesso", stats);
      return stats;
    } catch (error) {
      Logger.error("Erro ao buscar estatísticas", error);
      throw error;
    }
  }
}

// Criar instância única
const API = new FirebaseAPI();

// Exportar para uso global
window.API = API;
