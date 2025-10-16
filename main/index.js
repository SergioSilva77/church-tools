// Processo principal do Electron

// Polyfill para File/FormData (Node < 20)
// Necessário porque algumas dependências (como cheerio via undici) podem precisar de File
try {
  if (typeof globalThis.File === 'undefined') {
    // Tenta importar do buffer nativo do Node
    const { Blob } = require('buffer');

    // Polyfill simples de File baseado em Blob
    class File extends Blob {
      constructor(bits, name, options = {}) {
        super(bits, options);
        this.name = name;
        this.lastModified = options.lastModified || Date.now();
      }
    }

    // Adiciona ao globalThis
    globalThis.File = File;
  }
} catch (error) {
  console.warn('Aviso: Não foi possível criar polyfill de File:', error.message);
}

const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const cron = require('node-cron');
const Database = require('./database');
const DownloadManager = require('./downloads');

let mainWindow;
let db;
let downloadManager;

// Cria a janela principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');

  // Abre DevTools em desenvolvimento
  // mainWindow.webContents.openDevTools();
}

// Inicialização do app
app.whenReady().then(() => {
  db = new Database();
  downloadManager = new DownloadManager();

  createWindow();
  setupIpcHandlers();
  setupCronJobs();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Configuração de IPC Handlers
function setupIpcHandlers() {
  // ========== DIAS ==========
  ipcMain.handle('dias:list', () => {
    return db.listDias();
  });

  ipcMain.handle('dias:create', (event, nome) => {
    return db.createDia(nome);
  });

  ipcMain.handle('dias:update', (event, { id, nome }) => {
    return db.updateDia(id, nome);
  });

  ipcMain.handle('dias:delete', (event, id) => {
    return db.deleteDia(id);
  });

  // ========== AÇÕES ==========
  ipcMain.handle('acoes:list', () => {
    return db.listAcoes();
  });

  ipcMain.handle('acoes:create', (event, acaoData) => {
    return db.createAcao(acaoData);
  });

  ipcMain.handle('acoes:update', (event, { id, acaoData }) => {
    return db.updateAcao(id, acaoData);
  });

  ipcMain.handle('acoes:delete', (event, id) => {
    return db.deleteAcao(id);
  });

  ipcMain.handle('acoes:reorder', (event, acoesOrdenadas) => {
    return db.reorderAcoes(acoesOrdenadas);
  });

  // ========== ARQUIVOS ==========
  ipcMain.handle('files:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Todos os arquivos', extensions: ['*'] },
        { name: 'Vídeos', extensions: ['mp4', 'avi', 'mov', 'mkv'] },
        { name: 'Áudio', extensions: ['mp3', 'wav'] },
        { name: 'PowerPoint', extensions: ['ppt', 'pptx'] }
      ]
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('files:open', async (event, filePath) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========== PROVAI E VEDE ==========
  ipcMain.handle('provai:listarVideos', async (event, { usarCache = true }) => {
    try {
      const trimestre = downloadManager.getTrimestre().nome;
      const cacheKey = `provai_${trimestre}`;

      // Verifica cache
      if (usarCache) {
        const cached = db.getCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Busca online
      const resultado = await downloadManager.listarVideosProvaiEVede();

      // Salva no cache
      db.setCache(cacheKey, resultado);

      return resultado;
    } catch (error) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('provai:baixar', async (event, { videoUrl, titulo, trimestre }) => {
    try {
      const resultado = await downloadManager.baixarProvaiEVede(
        videoUrl,
        titulo,
        trimestre,
        (percent, downloaded, total) => {
          // Envia progresso para o renderer
          mainWindow.webContents.send('download:progress', {
            percent: Math.round(percent),
            downloaded,
            total
          });
        }
      );

      return resultado;
    } catch (error) {
      throw new Error(error.message);
    }
  });

  // ========== INFORMATIVO ==========
  ipcMain.handle('informativo:status', async (event, { dataSabado }) => {
    try {
      const data = dataSabado ? new Date(dataSabado) : downloadManager.getProximoSabado();
      return await downloadManager.verificarStatusInformativo(data);
    } catch (error) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle('informativo:proximoSabado', () => {
    const proximoSabado = downloadManager.getProximoSabado();
    return proximoSabado.toISOString().split('T')[0];
  });

  ipcMain.handle('informativo:baixar', async (event, { zipUrl, trimestre, dataReferencia }) => {
    try {
      const resultado = await downloadManager.baixarInformativo(
        zipUrl,
        trimestre,
        dataReferencia,
        (percent, downloaded, total) => {
          mainWindow.webContents.send('download:progress', {
            percent: Math.round(percent),
            downloaded,
            total
          });
        }
      );

      return resultado;
    } catch (error) {
      throw new Error(error.message);
    }
  });

  // ========== DISPLAY (Multi-monitor) ==========
  ipcMain.handle('display:list', () => {
    const displays = screen.getAllDisplays();
    return displays.map((display, index) => ({
      id: display.id,
      index: index,
      bounds: display.bounds,
      primary: display.bounds.x === 0 && display.bounds.y === 0
    }));
  });

  ipcMain.handle('display:cronometro:abrir', (event, { screenIndex }) => {
    const displays = screen.getAllDisplays();
    const targetDisplay = displays[screenIndex] || displays[0];

    const cronometroWindow = new BrowserWindow({
      x: targetDisplay.bounds.x,
      y: targetDisplay.bounds.y,
      fullscreen: true,
      frame: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    cronometroWindow.loadFile('renderer/cronometro.html');
    return { success: true };
  });

  ipcMain.handle('display:telapreta:abrir', (event, { screenIndex }) => {
    const displays = screen.getAllDisplays();
    const targetDisplay = displays[screenIndex] || displays[0];

    const telaPretaWindow = new BrowserWindow({
      x: targetDisplay.bounds.x,
      y: targetDisplay.bounds.y,
      fullscreen: true,
      frame: false,
      backgroundColor: '#000000',
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    telaPretaWindow.loadFile('renderer/telapreta.html');
    return { success: true };
  });

  // ========== NOTIFICAÇÕES ==========
  ipcMain.handle('notify', (event, { title, body }) => {
    if (mainWindow) {
      mainWindow.webContents.send('notification', { title, body });
    }
  });
}

// Configuração de agendamentos (Cron Jobs)
function setupCronJobs() {
  // Todo sábado às 18:00 (timezone America/Sao_Paulo)
  // Formato: segundo minuto hora dia-do-mês mês dia-da-semana
  cron.schedule('0 18 * * 6', async () => {
    console.log('Executando verificação automática de Informativo...');

    try {
      const proximoSabado = downloadManager.getProximoSabado();
      const status = await downloadManager.verificarStatusInformativo(proximoSabado);

      // Atualiza ações do tipo informativo
      const acoes = db.listAcoes();
      let atualizou = false;

      acoes.forEach(acao => {
        if (acao.categoria === 'informativo') {
          if (!acao.categoriaMeta) {
            acao.categoriaMeta = {};
          }

          acao.categoriaMeta.informativo = status;
          db.updateAcao(acao.id, acao);
          atualizou = true;
        }
      });

      // Notifica usuário
      if (atualizou && status.status === 'disponivel' && mainWindow) {
        mainWindow.webContents.send('notification', {
          title: 'Informativo Disponível',
          body: `O Informativo de ${status.dataReferencia} está disponível para download!`
        });
      }

    } catch (error) {
      console.error('Erro na verificação automática:', error);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  console.log('Agendamento configurado: Sábados 18:00 (America/Sao_Paulo)');
}
