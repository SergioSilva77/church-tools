// Gerenciador de downloads e processamento de arquivos
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

class DownloadManager {
  constructor() {
    this.downloadsPath = path.join(app.getPath('downloads'), 'ChurchUtil');
    this.ensureDirectories();
  }

  // Garante que os diretórios existem
  ensureDirectories() {
    const dirs = [
      this.downloadsPath,
      path.join(this.downloadsPath, 'ProvaiEVede'),
      path.join(this.downloadsPath, 'Informativo')
    ];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Faz download de arquivo com callback de progresso
  async downloadFile(url, destinationPath, onProgress) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const file = fs.createWriteStream(destinationPath);

      protocol.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Segue redirects
          file.close();
          fs.unlinkSync(destinationPath);
          return this.downloadFile(response.headers.location, destinationPath, onProgress)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destinationPath);
          return reject(new Error(`Status: ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (onProgress && totalBytes) {
            const percent = (downloadedBytes / totalBytes) * 100;
            onProgress(percent, downloadedBytes, totalBytes);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(destinationPath);
        });

      }).on('error', (err) => {
        fs.unlinkSync(destinationPath);
        reject(err);
      });
    });
  }

  // Faz HEAD request para verificar se arquivo existe
  async checkFileExists(url) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.request(url, { method: 'HEAD' }, (response) => {
        resolve(response.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.end();
    });
  }

  // Busca conteúdo HTML de uma URL
  async fetchHtml(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          return reject(new Error(`Status: ${response.statusCode}`));
        }

        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }

  // Extrai ZIP e retorna caminho do primeiro MP4 encontrado
  extractZip(zipPath, destinationDir) {
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destinationDir, true);

      // Procura pelo arquivo MP4
      const files = fs.readdirSync(destinationDir);
      const mp4File = files.find(f => f.toLowerCase().endsWith('.mp4'));

      if (mp4File) {
        return path.join(destinationDir, mp4File);
      }

      return null;
    } catch (error) {
      console.error('Erro ao extrair ZIP:', error);
      return null;
    }
  }

  // Detecta trimestre atual baseado na data
  getTrimestre() {
    const now = new Date();
    const mes = now.getMonth(); // 0-11
    const ano = now.getFullYear();

    let numeroTrimestre;
    if (mes < 3) numeroTrimestre = 1;
    else if (mes < 6) numeroTrimestre = 2;
    else if (mes < 9) numeroTrimestre = 3;
    else numeroTrimestre = 4;

    return {
      numero: numeroTrimestre,
      ano: ano,
      nome: `${numeroTrimestre}trimestre${ano}`
    };
  }

  // Lista vídeos Provai e Vede do trimestre atual
  async listarVideosProvaiEVede() {
    try {
      const trimestre = this.getTrimestre();
      const url = `https://downloads.adventistas.org/pt/mordomia-crista/video/provai-e-vede-${trimestre.ano}-${trimestre.numero}o-trimestre/`;

      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const videos = [];

      // Busca links que terminam com .mp4
      $('a[href$=".mp4"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const titulo = $(elem).text().trim() || path.basename(href);

        // Monta URL completa se for relativa
        let videoUrl = href;
        if (!href.startsWith('http')) {
          videoUrl = new URL(href, url).href;
        }

        videos.push({
          titulo: titulo,
          url: videoUrl
        });
      });

      return {
        trimestre: trimestre.nome,
        videos: videos
      };
    } catch (error) {
      console.error('Erro ao listar vídeos Provai e Vede:', error);
      throw new Error('Erro ao buscar vídeos. Verifique sua conexão ou se o formato do site mudou.');
    }
  }

  // Baixa vídeo Provai e Vede
  async baixarProvaiEVede(videoUrl, titulo, trimestre, onProgress) {
    const trimestreDir = path.join(this.downloadsPath, 'ProvaiEVede', trimestre);
    if (!fs.existsSync(trimestreDir)) {
      fs.mkdirSync(trimestreDir, { recursive: true });
    }

    const fileName = this.sanitizeFileName(titulo) + '.mp4';
    const destinationPath = path.join(trimestreDir, fileName);

    await this.downloadFile(videoUrl, destinationPath, onProgress);

    return {
      localPath: destinationPath,
      baixadoEm: new Date().toISOString()
    };
  }

  // Retorna próximo sábado (timezone America/Sao_Paulo)
  getProximoSabado() {
    // Cria data atual em São Paulo (UTC-3)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = domingo, 6 = sábado

    let diasAteProximoSabado;
    if (dayOfWeek === 6) {
      // Se hoje é sábado, retorna o próximo (7 dias)
      diasAteProximoSabado = 7;
    } else {
      // Calcula dias até o próximo sábado
      diasAteProximoSabado = (6 - dayOfWeek + 7) % 7;
      if (diasAteProximoSabado === 0) diasAteProximoSabado = 7;
    }

    const proximoSabado = new Date(now);
    proximoSabado.setDate(now.getDate() + diasAteProximoSabado);

    return proximoSabado;
  }

  // Formata data para padrão do Informativo (DDMMYY)
  formatarDataInformativo(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = String(data.getFullYear()).slice(-2);
    return `${dia}${mes}${ano}`;
  }

  // Verifica status do Informativo
  async verificarStatusInformativo(dataSabado) {
    const trimestre = this.getTrimestre();
    const dataFormatada = this.formatarDataInformativo(dataSabado);
    const zipUrl = `https://files.adventistas.org/daniellocutor/informativo/${trimestre.nome}/informativo_${dataFormatada}_alta.zip`;

    const existe = await this.checkFileExists(zipUrl);

    return {
      trimestre: trimestre.nome,
      dataReferencia: dataSabado.toISOString().split('T')[0],
      zipUrl: zipUrl,
      status: existe ? 'disponivel' : 'aguardando'
    };
  }

  // Baixa e extrai Informativo
  async baixarInformativo(zipUrl, trimestre, dataReferencia, onProgress) {
    const trimestreDir = path.join(this.downloadsPath, 'Informativo', trimestre);
    if (!fs.existsSync(trimestreDir)) {
      fs.mkdirSync(trimestreDir, { recursive: true });
    }

    const zipFileName = path.basename(zipUrl);
    const zipPath = path.join(trimestreDir, zipFileName);

    // Baixa o ZIP
    await this.downloadFile(zipUrl, zipPath, onProgress);

    // Extrai o MP4
    const videoPath = this.extractZip(zipPath, trimestreDir);

    if (!videoPath) {
      throw new Error('Nenhum arquivo MP4 encontrado no ZIP');
    }

    return {
      localZipPath: zipPath,
      videoExtraidoPath: videoPath,
      baixadoEm: new Date().toISOString()
    };
  }

  // Sanitiza nome de arquivo
  sanitizeFileName(name) {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
  }
}

module.exports = DownloadManager;
