// Sistema de persistência JSON
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    // Define o caminho do arquivo de dados
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'db.json');
    this.cachePath = path.join(userDataPath, 'cache.json');
    this.data = this.load();
    this.cache = this.loadCache();
  }

  // Carrega dados do arquivo
  load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('Erro ao carregar banco de dados:', error);
    }

    // Retorna estrutura padrão com dias iniciais
    return {
      dias: [
        { id: uuidv4(), nome: 'sábado' },
        { id: uuidv4(), nome: 'domingo' },
        { id: uuidv4(), nome: 'quarta' }
      ],
      acoes: []
    };
  }

  // Salva dados no arquivo
  save() {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Erro ao salvar banco de dados:', error);
      return false;
    }
  }

  // Cache para listas de vídeos (6h de validade)
  loadCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        const raw = fs.readFileSync(this.cachePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('Erro ao carregar cache:', error);
    }
    return {};
  }

  saveCache() {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (error) {
      console.error('Erro ao salvar cache:', error);
    }
  }

  // Verifica se cache está válido (6h)
  isCacheValid(key) {
    if (!this.cache[key]) return false;
    const sixHours = 6 * 60 * 60 * 1000;
    const now = Date.now();
    return (now - this.cache[key].timestamp) < sixHours;
  }

  setCache(key, value) {
    this.cache[key] = {
      timestamp: Date.now(),
      data: value
    };
    this.saveCache();
  }

  getCache(key) {
    if (this.isCacheValid(key)) {
      return this.cache[key].data;
    }
    return null;
  }

  // CRUD para Dias
  listDias() {
    return this.data.dias;
  }

  createDia(nome) {
    const dia = { id: uuidv4(), nome };
    this.data.dias.push(dia);
    this.save();
    return dia;
  }

  updateDia(id, nome) {
    const dia = this.data.dias.find(d => d.id === id);
    if (dia) {
      dia.nome = nome;
      this.save();
      return dia;
    }
    return null;
  }

  deleteDia(id) {
    const index = this.data.dias.findIndex(d => d.id === id);
    if (index !== -1) {
      this.data.dias.splice(index, 1);
      // Remove ações associadas ao dia
      this.data.acoes = this.data.acoes.filter(a => a.diaId !== id);
      this.save();
      return true;
    }
    return false;
  }

  // CRUD para Ações
  listAcoes() {
    return this.data.acoes;
  }

  createAcao(acaoData) {
    const acao = {
      id: uuidv4(),
      titulo: acaoData.titulo,
      diaId: acaoData.diaId || null,
      ordem: acaoData.ordem || this.data.acoes.length + 1,
      categoria: acaoData.categoria || 'geral',
      arquivoPath: acaoData.arquivoPath || '',
      categoriaMeta: acaoData.categoriaMeta || {}
    };
    this.data.acoes.push(acao);
    this.save();
    return acao;
  }

  updateAcao(id, acaoData) {
    const acao = this.data.acoes.find(a => a.id === id);
    if (acao) {
      Object.assign(acao, acaoData);
      this.save();
      return acao;
    }
    return null;
  }

  deleteAcao(id) {
    const index = this.data.acoes.findIndex(a => a.id === id);
    if (index !== -1) {
      this.data.acoes.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  // Reordena ações
  reorderAcoes(acoesOrdenadas) {
    acoesOrdenadas.forEach((id, index) => {
      const acao = this.data.acoes.find(a => a.id === id);
      if (acao) {
        acao.ordem = index + 1;
      }
    });
    this.data.acoes.sort((a, b) => a.ordem - b.ordem);
    this.save();
    return this.data.acoes;
  }
}

module.exports = Database;
