// Preload script - expõe API segura para o renderer via contextBridge
const { contextBridge, ipcRenderer } = require('electron');

// API exposta para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ========== DIAS ==========
  dias: {
    list: () => ipcRenderer.invoke('dias:list'),
    create: (nome) => ipcRenderer.invoke('dias:create', nome),
    update: (id, nome) => ipcRenderer.invoke('dias:update', { id, nome }),
    delete: (id) => ipcRenderer.invoke('dias:delete', id)
  },

  // ========== AÇÕES ==========
  acoes: {
    list: () => ipcRenderer.invoke('acoes:list'),
    create: (acaoData) => ipcRenderer.invoke('acoes:create', acaoData),
    update: (id, acaoData) => ipcRenderer.invoke('acoes:update', { id, acaoData }),
    delete: (id) => ipcRenderer.invoke('acoes:delete', id),
    reorder: (acoesOrdenadas) => ipcRenderer.invoke('acoes:reorder', acoesOrdenadas)
  },

  // ========== ARQUIVOS ==========
  files: {
    choose: () => ipcRenderer.invoke('files:choose'),
    open: (filePath) => ipcRenderer.invoke('files:open', filePath)
  },

  // ========== PROVAI E VEDE ==========
  provai: {
    listarVideos: (usarCache = true) => ipcRenderer.invoke('provai:listarVideos', { usarCache }),
    baixar: (videoUrl, titulo, trimestre) =>
      ipcRenderer.invoke('provai:baixar', { videoUrl, titulo, trimestre })
  },

  // ========== INFORMATIVO ==========
  informativo: {
    status: (dataSabado) => ipcRenderer.invoke('informativo:status', { dataSabado }),
    proximoSabado: () => ipcRenderer.invoke('informativo:proximoSabado'),
    baixar: (zipUrl, trimestre, dataReferencia) =>
      ipcRenderer.invoke('informativo:baixar', { zipUrl, trimestre, dataReferencia })
  },

  // ========== DISPLAY (Multi-monitor) ==========
  display: {
    list: () => ipcRenderer.invoke('display:list'),
    abrirCronometro: (screenIndex) =>
      ipcRenderer.invoke('display:cronometro:abrir', { screenIndex }),
    abrirTelaPreta: (screenIndex) =>
      ipcRenderer.invoke('display:telapreta:abrir', { screenIndex })
  },

  // ========== EVENTOS ==========
  on: {
    downloadProgress: (callback) => {
      ipcRenderer.on('download:progress', (event, data) => callback(data));
    },
    notification: (callback) => {
      ipcRenderer.on('notification', (event, data) => callback(data));
    }
  },

  // Remove listeners
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
