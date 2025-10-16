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

  // Detecta trimestre baseado na data fornecida (ou atual) no timezone de São Paulo
  getTrimestre(dataSabado = null) {
    const tz = 'America/Sao_Paulo';
    const d = dataSabado ? (dataSabado instanceof Date ? dataSabado : new Date(dataSabado)) : new Date();

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric'
    }).formatToParts(d);

    const ano = Number(parts.find(p => p.type === 'year').value);
    const mes = Number(parts.find(p => p.type === 'month').value); // 1..12
    const numeroTrimestre = Math.floor((mes - 1) / 3) + 1; // 1..4

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

  // Formata data para padrão do Informativo (DDMMYY) no timezone de São Paulo
  formatarDataInformativo(data) {
    const tz = 'America/Sao_Paulo';
    const d = (data instanceof Date) ? data : new Date(data);

    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).formatToParts(d);

    const get = t => parts.find(p => p.type === t).value;
    const dia = get('day');
    const mes = get('month');
    const ano2 = get('year'); // já vem com 2 dígitos em pt-BR

    const out = `${dia}${mes}${ano2}`;
    console.log(`Formatando data: ${out} (entrada: ${data})`);
    return out;
  }

  // Converte data para formato YYYY-MM-DD no timezone de São Paulo
  toLocalYMD(date, tz = 'America/Sao_Paulo') {
    const d = (date instanceof Date) ? date : new Date(date);
    // 'en-CA' formata como YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  // Checa a primeira URL que responder OK (HEAD ou GET pequeno)
  async checkFirstAvailable(urls) {
    const tryHead = async (url) => {
      try {
        const protocol = url.startsWith('https') ? require('https') : require('http');
        return new Promise((resolve) => {
          const req = protocol.request(url, { method: 'HEAD' }, (response) => {
            resolve(response.statusCode >= 200 && response.statusCode < 300);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
          });
          req.end();
        });
      } catch {
        return false;
      }
    };

    const tryByte = async (url) => {
      try {
        const protocol = url.startsWith('https') ? require('https') : require('http');
        return new Promise((resolve) => {
          const req = protocol.request(url, {
            method: 'GET',
            headers: { 'Range': 'bytes=0-0' }
          }, (response) => {
            resolve(response.statusCode === 200 || response.statusCode === 206);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
          });
          req.end();
        });
      } catch {
        return false;
      }
    };

    for (const u of urls) {
      if (await tryHead(u) || await tryByte(u)) {
        return { exists: true, url: u };
      }
    }
    return { exists: false, url: urls[0] };
  }

  // Verifica status do Informativo (tenta _alta.zip e cai para _texto.docx)
  async verificarStatusInformativo(dataSabado) {
    const trimestre = this.getTrimestre(dataSabado);
    const dataFormatada = this.formatarDataInformativo(dataSabado);
    console.log(`---> ${dataSabado}`)

    
    const out = dataSabado.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${d}${m}${y.slice(-2)}`);


    const base = `https://files.adventistas.org/daniellocutor/informativo/${trimestre.nome}/informativo_${out}`;
    const candidatos = [
      `${base}_alta.zip`,     // vídeo/ZIP em alta (quando disponível)
      `${base}_texto.docx`,   // quase sempre disponível
    ];


    console.log(`Verificando Informativo para ${dataFormatada} no trimestre ${trimestre.nome}`);
    console.log('URLs candidatas:', candidatos);

    const found = await this.checkFirstAvailable(candidatos);

    return {
      trimestre: trimestre.nome,
      dataReferencia: this.toLocalYMD(dataSabado), // local SP, não UTC
      zipUrl: found.url,
      status: found.exists ? 'disponivel' : 'aguardando',
      tipo: found.exists ? (found.url.endsWith('.zip') ? 'zip' : 'texto') : null
    };
  }

  // Baixa e extrai Informativo
  async baixarInformativo(zipUrl, trimestre, dataReferencia, onProgress) {
    const trimestreDir = path.join(this.downloadsPath, 'Informativo', trimestre);
    if (!fs.existsSync(trimestreDir)) {
      fs.mkdirSync(trimestreDir, { recursive: true });
    }

    const fileName = path.basename(zipUrl);
    const filePath = path.join(trimestreDir, fileName);

    // Baixa o arquivo (ZIP ou DOCX)
    await this.downloadFile(zipUrl, filePath, onProgress);

    // Se for ZIP, extrai o MP4
    if (zipUrl.endsWith('.zip')) {
      const videoPath = this.extractZip(filePath, trimestreDir);

      if (!videoPath) {
        throw new Error('Nenhum arquivo MP4 encontrado no ZIP');
      }

      return {
        localZipPath: filePath,
        videoExtraidoPath: videoPath,
        tipo: 'video',
        baixadoEm: new Date().toISOString()
      };
    } else {
      // Se for DOCX ou outro formato, retorna o caminho do arquivo
      return {
        localZipPath: null,
        videoExtraidoPath: filePath,
        tipo: 'texto',
        baixadoEm: new Date().toISOString()
      };
    }
  }

  // Sanitiza nome de arquivo
  sanitizeFileName(name) {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
  }
}

module.exports = DownloadManager;
