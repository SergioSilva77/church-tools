// Church Util - Renderer Process
const api = window.electronAPI;

// Estado global
let acoes = [];
let dias = [];
let acaoEmEdicao = null;
let dadosProvaiVede = null;
let dadosInformativo = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  await carregarDados();
  setupEventListeners();
  setupNotifications();
});

// Carrega dados iniciais
async function carregarDados() {
  try {
    dias = await api.dias.list();
    acoes = await api.acoes.list();

    // Ordena ações por ordem
    acoes.sort((a, b) => a.ordem - b.ordem);

    preencherFiltros();
    renderizarAcoes();
  } catch (error) {
    mostrarToast('Erro ao carregar dados: ' + error.message, 'error');
  }
}

// Preenche dropdowns de filtros
function preencherFiltros() {
  const filtroDia = document.getElementById('filtroDia');
  const acaoDia = document.getElementById('acaoDia');

  // Limpa e adiciona opção padrão
  filtroDia.innerHTML = '<option value="">Todos</option>';
  acaoDia.innerHTML = '<option value="">Nenhum</option>';

  // Adiciona dias
  dias.forEach(dia => {
    const option1 = document.createElement('option');
    option1.value = dia.id;
    option1.textContent = dia.nome;
    filtroDia.appendChild(option1);

    const option2 = option1.cloneNode(true);
    acaoDia.appendChild(option2);
  });
}

// Renderiza lista de ações
function renderizarAcoes() {
  const container = document.getElementById('acoesContainer');
  const emptyState = document.getElementById('emptyState');

  // Aplica filtros
  const filtroDia = document.getElementById('filtroDia').value;
  const filtroCategoria = document.getElementById('filtroCategoria').value;

  let acoesFiltradas = acoes.filter(acao => {
    if (filtroDia && acao.diaId !== filtroDia) return false;
    if (filtroCategoria && acao.categoria !== filtroCategoria) return false;
    return true;
  });

  if (acoesFiltradas.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');

  container.innerHTML = '<div class="acoes-list"></div>';
  const list = container.querySelector('.acoes-list');

  acoesFiltradas.forEach((acao, index) => {
    const card = criarCardAcao(acao, index);
    list.appendChild(card);
  });
}

// Cria card de ação
function criarCardAcao(acao, index) {
  const card = document.createElement('div');
  card.className = 'acao-card';
  card.dataset.id = acao.id;
  card.draggable = true;

  // Informações da ação
  const info = document.createElement('div');
  info.className = 'acao-info';

  const titulo = document.createElement('div');
  titulo.className = 'acao-titulo';
  titulo.textContent = acao.titulo;

  const meta = document.createElement('div');
  meta.className = 'acao-meta';

  // Badge de categoria
  const badgeCategoria = document.createElement('span');
  badgeCategoria.className = 'badge badge-categoria';
  badgeCategoria.textContent = getNomeCategoria(acao.categoria);
  meta.appendChild(badgeCategoria);

  // Badge de dia
  if (acao.diaId) {
    const dia = dias.find(d => d.id === acao.diaId);
    if (dia) {
      const badgeDia = document.createElement('span');
      badgeDia.className = 'badge badge-dia';
      badgeDia.textContent = dia.nome;
      meta.appendChild(badgeDia);
    }
  }

  // Detalhes específicos por categoria
  const detalhes = document.createElement('div');
  detalhes.className = 'acao-detalhes';

  if (acao.categoria === 'geral' && acao.arquivoPath) {
    detalhes.textContent = `Arquivo: ${acao.arquivoPath}`;
  } else if (acao.categoria === 'provai_vede' && acao.categoriaMeta?.provai_vede?.videoSelecionado) {
    const video = acao.categoriaMeta.provai_vede.videoSelecionado;
    detalhes.textContent = `Vídeo: ${video.titulo}`;
  } else if (acao.categoria === 'informativo' && acao.categoriaMeta?.informativo) {
    const info = acao.categoriaMeta.informativo;
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge-status ${info.status}`;
    statusBadge.textContent = info.status === 'disponivel' ? 'Disponível' : 'Aguardando';
    detalhes.appendChild(statusBadge);
    detalhes.appendChild(document.createTextNode(` - ${info.dataReferencia}`));
  }

  info.appendChild(titulo);
  info.appendChild(meta);
  info.appendChild(detalhes);

  // Ações (botões)
  const actions = document.createElement('div');
  actions.className = 'acao-actions';

  // Botão Executar/Abrir
  const btnExecutar = document.createElement('button');
  btnExecutar.className = 'btn btn-success btn-small';
  btnExecutar.textContent = '▶️ Executar';
  btnExecutar.onclick = () => executarAcao(acao);
  actions.appendChild(btnExecutar);

  // Botão Editar
  const btnEditar = document.createElement('button');
  btnEditar.className = 'btn btn-secondary btn-small';
  btnEditar.textContent = '✏️ Editar';
  btnEditar.onclick = () => editarAcao(acao);
  actions.appendChild(btnEditar);

  // Botão Excluir
  const btnExcluir = document.createElement('button');
  btnExcluir.className = 'btn btn-error btn-small';
  btnExcluir.textContent = '🗑️ Excluir';
  btnExcluir.onclick = () => excluirAcao(acao.id);
  actions.appendChild(btnExcluir);

  // Botões de reordenação
  if (index > 0) {
    const btnSubir = document.createElement('button');
    btnSubir.className = 'btn btn-secondary btn-icon';
    btnSubir.textContent = '↑';
    btnSubir.onclick = () => moverAcao(acao.id, 'up');
    actions.appendChild(btnSubir);
  }

  if (index < acoes.length - 1) {
    const btnDescer = document.createElement('button');
    btnDescer.className = 'btn btn-secondary btn-icon';
    btnDescer.textContent = '↓';
    btnDescer.onclick = () => moverAcao(acao.id, 'down');
    actions.appendChild(btnDescer);
  }

  card.appendChild(info);
  card.appendChild(actions);

  // Drag and drop
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragover', handleDragOver);
  card.addEventListener('drop', handleDrop);
  card.addEventListener('dragend', handleDragEnd);

  return card;
}

// Utilitários
function getNomeCategoria(categoria) {
  const nomes = {
    'geral': 'Geral',
    'provai_vede': 'Provai e Vede',
    'informativo': 'Informativo'
  };
  return nomes[categoria] || categoria;
}

// Executar ação
async function executarAcao(acao) {
  try {
    if (acao.categoria === 'geral' && acao.arquivoPath) {
      await api.files.open(acao.arquivoPath);
      mostrarToast('Arquivo aberto com sucesso', 'success');
    } else if (acao.categoria === 'provai_vede') {
      const video = acao.categoriaMeta?.provai_vede?.videoSelecionado;
      if (video?.localPath) {
        await api.files.open(video.localPath);
        mostrarToast('Vídeo aberto com sucesso', 'success');
      } else {
        mostrarToast('Vídeo não baixado. Edite a ação e baixe o vídeo.', 'warning');
      }
    } else if (acao.categoria === 'informativo') {
      const info = acao.categoriaMeta?.informativo;
      if (info?.videoExtraidoPath) {
        await api.files.open(info.videoExtraidoPath);
        mostrarToast('Informativo aberto com sucesso', 'success');
      } else {
        mostrarToast('Informativo não baixado. Edite a ação e baixe o vídeo.', 'warning');
      }
    } else {
      mostrarToast('Nenhum arquivo associado a esta ação', 'warning');
    }
  } catch (error) {
    mostrarToast('Erro ao executar ação: ' + error.message, 'error');
  }
}

// Editar ação
function editarAcao(acao) {
  acaoEmEdicao = acao;
  document.getElementById('modalAcaoTitulo').textContent = 'Editar Ação';
  document.getElementById('acaoTitulo').value = acao.titulo;
  document.getElementById('acaoCategoria').value = acao.categoria;
  document.getElementById('acaoDia').value = acao.diaId || '';
  document.getElementById('acaoArquivo').value = acao.arquivoPath || '';

  mostrarSecaoCategoria(acao.categoria);

  // Preenche dados específicos
  if (acao.categoria === 'provai_vede' && acao.categoriaMeta?.provai_vede) {
    const pv = acao.categoriaMeta.provai_vede;
    if (pv.videoSelecionado) {
      document.getElementById('videoProvaiSelecionado').classList.remove('hidden');
      document.getElementById('videoProvaiTitulo').textContent = pv.videoSelecionado.titulo;
      document.getElementById('videoProvaiPath').textContent = pv.videoSelecionado.localPath || 'Não baixado';
    }
  } else if (acao.categoria === 'informativo' && acao.categoriaMeta?.informativo) {
    const inf = acao.categoriaMeta.informativo;
    if (inf.videoExtraidoPath) {
      document.getElementById('informativoBaixado').classList.remove('hidden');
      document.getElementById('informativoPath').textContent = inf.videoExtraidoPath;
    }
  }

  document.getElementById('modalAcao').classList.remove('hidden');
}

// Excluir ação
async function excluirAcao(id) {
  if (!confirm('Deseja realmente excluir esta ação?')) return;

  try {
    await api.acoes.delete(id);
    await carregarDados();
    mostrarToast('Ação excluída com sucesso', 'success');
  } catch (error) {
    mostrarToast('Erro ao excluir ação: ' + error.message, 'error');
  }
}

// Mover ação (reordenação)
async function moverAcao(id, direcao) {
  const index = acoes.findIndex(a => a.id === id);
  if (index === -1) return;

  const novoIndex = direcao === 'up' ? index - 1 : index + 1;
  if (novoIndex < 0 || novoIndex >= acoes.length) return;

  // Troca posições
  [acoes[index], acoes[novoIndex]] = [acoes[novoIndex], acoes[index]];

  // Envia nova ordem para o backend
  const novaOrdem = acoes.map(a => a.id);
  await api.acoes.reorder(novaOrdem);

  renderizarAcoes();
  mostrarToast('Ordem atualizada', 'success');
}

// Drag and Drop
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();

  if (draggedElement !== this) {
    const allCards = Array.from(document.querySelectorAll('.acao-card'));
    const draggedIndex = allCards.indexOf(draggedElement);
    const targetIndex = allCards.indexOf(this);

    if (draggedIndex < targetIndex) {
      this.parentNode.insertBefore(draggedElement, this.nextSibling);
    } else {
      this.parentNode.insertBefore(draggedElement, this);
    }

    // Atualiza ordem no array e backend
    const draggedId = draggedElement.dataset.id;
    const targetId = this.dataset.id;

    const dragIdx = acoes.findIndex(a => a.id === draggedId);
    const targIdx = acoes.findIndex(a => a.id === targetId);

    const [removed] = acoes.splice(dragIdx, 1);
    acoes.splice(targIdx, 0, removed);

    const novaOrdem = acoes.map(a => a.id);
    api.acoes.reorder(novaOrdem);
  }

  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  renderizarAcoes();
}

// Setup de event listeners
function setupEventListeners() {
  // Botão Cadastrar
  document.getElementById('btnCadastrar').onclick = () => {
    acaoEmEdicao = null;
    document.getElementById('modalAcaoTitulo').textContent = 'Cadastrar Ação';
    document.getElementById('formAcao').reset();
    mostrarSecaoCategoria('geral');
    document.getElementById('modalAcao').classList.remove('hidden');
  };

  // Fechar modais
  document.getElementById('btnFecharModalAcao').onclick = () => {
    document.getElementById('modalAcao').classList.add('hidden');
  };

  document.getElementById('btnCancelarAcao').onclick = () => {
    document.getElementById('modalAcao').classList.add('hidden');
  };

  // Salvar ação
  document.getElementById('btnSalvarAcao').onclick = salvarAcao;

  // Categoria change
  document.getElementById('acaoCategoria').onchange = (e) => {
    mostrarSecaoCategoria(e.target.value);
  };

  // Escolher arquivo
  document.getElementById('btnEscolherArquivo').onclick = async () => {
    const filePath = await api.files.choose();
    if (filePath) {
      document.getElementById('acaoArquivo').value = filePath;
    }
  };

  // Provai e Vede
  document.getElementById('btnRecarregarProvai').onclick = carregarVideosProvai;

  // Informativo
  document.getElementById('btnVerificarInformativo').onclick = verificarInformativo;
  document.getElementById('btnBaixarInformativo').onclick = baixarInformativo;

  // Filtros
  document.getElementById('filtroDia').onchange = renderizarAcoes;
  document.getElementById('filtroCategoria').onchange = renderizarAcoes;
  document.getElementById('btnRecarregar').onclick = carregarDados;

  // Gerenciar Dias
  document.getElementById('btnGerenciarDias').onclick = abrirModalDias;
  document.getElementById('btnFecharModalDias').onclick = () => {
    document.getElementById('modalDias').classList.add('hidden');
  };
  document.getElementById('btnAdicionarDia').onclick = adicionarDia;

  // Cronômetro e Tela Preta
  document.getElementById('btnAbrirCronometro').onclick = async () => {
    const screenIndex = parseInt(document.getElementById('cronometroTela').value);
    await api.display.abrirCronometro(screenIndex);
    mostrarToast('Cronômetro aberto', 'success');
  };

  document.getElementById('btnAbrirTelaPreta').onclick = async () => {
    const screenIndex = parseInt(document.getElementById('telaPretaTela').value);
    await api.display.abrirTelaPreta(screenIndex);
    mostrarToast('Tela preta aberta', 'success');
  };
}

// Mostrar seção por categoria
function mostrarSecaoCategoria(categoria) {
  document.getElementById('secaoGeral').classList.add('hidden');
  document.getElementById('secaoProvaiVede').classList.add('hidden');
  document.getElementById('secaoInformativo').classList.add('hidden');

  if (categoria === 'geral') {
    document.getElementById('secaoGeral').classList.remove('hidden');
  } else if (categoria === 'provai_vede') {
    document.getElementById('secaoProvaiVede').classList.remove('hidden');
    carregarVideosProvai();
  } else if (categoria === 'informativo') {
    document.getElementById('secaoInformativo').classList.remove('hidden');
    carregarProximoSabado();
  }
}

// Carrega vídeos Provai e Vede
async function carregarVideosProvai(forcarReload = false) {
  try {
    const container = document.getElementById('videosProvaiContainer');
    container.classList.remove('hidden');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando vídeos...</p></div>';

    const resultado = await api.provai.listarVideos(!forcarReload);
    dadosProvaiVede = resultado;

    document.getElementById('trimestreProvai').textContent = resultado.trimestre;

    if (resultado.videos.length === 0) {
      container.innerHTML = '<p class="text-center">Nenhum vídeo encontrado</p>';
      return;
    }

    container.innerHTML = '';
    resultado.videos.forEach(video => {
      const item = document.createElement('div');
      item.className = 'video-item';

      const info = document.createElement('div');
      info.className = 'video-info';

      const titulo = document.createElement('div');
      titulo.className = 'video-titulo';
      titulo.textContent = video.titulo;

      const url = document.createElement('div');
      url.className = 'video-url';
      url.textContent = video.url;

      info.appendChild(titulo);
      info.appendChild(url);

      const btnBaixar = document.createElement('button');
      btnBaixar.className = 'btn btn-success btn-small';
      btnBaixar.textContent = '⬇️ Baixar e Selecionar';
      btnBaixar.onclick = () => baixarVideoProvai(video);

      item.appendChild(info);
      item.appendChild(btnBaixar);
      container.appendChild(item);
    });

  } catch (error) {
    mostrarToast('Erro ao carregar vídeos: ' + error.message, 'error');
  }
}

// Baixa vídeo Provai e Vede
async function baixarVideoProvai(video) {
  try {
    mostrarProgresso(true);

    const resultado = await api.provai.baixar(
      video.url,
      video.titulo,
      dadosProvaiVede.trimestre
    );

    // Atualiza UI
    document.getElementById('videoProvaiSelecionado').classList.remove('hidden');
    document.getElementById('videoProvaiTitulo').textContent = video.titulo;
    document.getElementById('videoProvaiPath').textContent = resultado.localPath;
    document.getElementById('videosProvaiContainer').classList.add('hidden');

    mostrarProgresso(false);
    mostrarToast('Vídeo baixado com sucesso', 'success');

  } catch (error) {
    mostrarProgresso(false);
    mostrarToast('Erro ao baixar vídeo: ' + error.message, 'error');
  }
}

// Carrega próximo sábado
async function carregarProximoSabado() {
  try {
    const proximoSabado = await api.informativo.proximoSabado();
    document.getElementById('proximoSabado').textContent = proximoSabado;
  } catch (error) {
    console.error('Erro ao carregar próximo sábado:', error);
  }
}

// Verifica status do Informativo
async function verificarInformativo() {
  try {
    const statusDiv = document.getElementById('informativoStatus');
    statusDiv.innerHTML = '<div class="spinner"></div>';

    const proximoSabado = await api.informativo.proximoSabado();
    const status = await api.informativo.status(proximoSabado);

    dadosInformativo = status;

    if (status.status === 'disponivel') {
      statusDiv.innerHTML = '<span class="badge-status disponivel">✅ Disponível</span>';
      document.getElementById('btnBaixarInformativo').classList.remove('hidden');
    } else {
      statusDiv.innerHTML = '<span class="badge-status aguardando">⏳ Ainda não liberado</span>';
      document.getElementById('btnBaixarInformativo').classList.add('hidden');
    }

  } catch (error) {
    mostrarToast('Erro ao verificar status: ' + error.message, 'error');
  }
}

// Baixa Informativo
async function baixarInformativo() {
  try {
    mostrarProgresso(true);

    const resultado = await api.informativo.baixar(
      dadosInformativo.zipUrl,
      dadosInformativo.trimestre,
      dadosInformativo.dataReferencia
    );

    document.getElementById('informativoBaixado').classList.remove('hidden');
    document.getElementById('informativoPath').textContent = resultado.videoExtraidoPath;

    mostrarProgresso(false);
    mostrarToast('Informativo baixado e extraído com sucesso', 'success');

  } catch (error) {
    mostrarProgresso(false);
    mostrarToast('Erro ao baixar Informativo: ' + error.message, 'error');
  }
}

// Salvar ação
async function salvarAcao() {
  try {
    const titulo = document.getElementById('acaoTitulo').value.trim();
    const categoria = document.getElementById('acaoCategoria').value;
    const diaId = document.getElementById('acaoDia').value || null;

    if (!titulo) {
      mostrarToast('Título é obrigatório', 'warning');
      return;
    }

    const acaoData = {
      titulo,
      categoria,
      diaId,
      arquivoPath: '',
      categoriaMeta: {}
    };

    // Dados específicos por categoria
    if (categoria === 'geral') {
      acaoData.arquivoPath = document.getElementById('acaoArquivo').value;
    } else if (categoria === 'provai_vede') {
      const videoTitulo = document.getElementById('videoProvaiTitulo').textContent;
      const videoPath = document.getElementById('videoProvaiPath').textContent;

      if (videoTitulo && videoPath && videoPath !== 'Não baixado') {
        acaoData.categoriaMeta.provai_vede = {
          trimestre: dadosProvaiVede?.trimestre,
          videoSelecionado: {
            titulo: videoTitulo,
            localPath: videoPath,
            baixadoEm: new Date().toISOString()
          }
        };
      }
    } else if (categoria === 'informativo') {
      if (dadosInformativo) {
        acaoData.categoriaMeta.informativo = dadosInformativo;
      }
    }

    if (acaoEmEdicao) {
      await api.acoes.update(acaoEmEdicao.id, acaoData);
      mostrarToast('Ação atualizada com sucesso', 'success');
    } else {
      await api.acoes.create(acaoData);
      mostrarToast('Ação cadastrada com sucesso', 'success');
    }

    document.getElementById('modalAcao').classList.add('hidden');
    await carregarDados();

  } catch (error) {
    mostrarToast('Erro ao salvar ação: ' + error.message, 'error');
  }
}

// Gerenciar Dias
async function abrirModalDias() {
  document.getElementById('modalDias').classList.remove('hidden');
  await renderizarDias();
}

async function renderizarDias() {
  const list = document.getElementById('diasList');
  list.innerHTML = '';

  dias.forEach(dia => {
    const item = document.createElement('div');
    item.style.cssText = 'display: flex; gap: 8px; align-items: center; padding: 8px; background: var(--bg-card); border-radius: 8px; margin-top: 8px;';

    const nome = document.createElement('span');
    nome.textContent = dia.nome;
    nome.style.flex = '1';

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-error btn-small';
    btnExcluir.textContent = '🗑️ Excluir';
    btnExcluir.onclick = async () => {
      if (confirm(`Excluir dia "${dia.nome}"?`)) {
        await api.dias.delete(dia.id);
        await carregarDados();
        await renderizarDias();
        mostrarToast('Dia excluído', 'success');
      }
    };

    item.appendChild(nome);
    item.appendChild(btnExcluir);
    list.appendChild(item);
  });
}

async function adicionarDia() {
  const nome = document.getElementById('novoDiaNome').value.trim();
  if (!nome) {
    mostrarToast('Nome é obrigatório', 'warning');
    return;
  }

  await api.dias.create(nome);
  document.getElementById('novoDiaNome').value = '';
  await carregarDados();
  await renderizarDias();
  mostrarToast('Dia adicionado', 'success');
}

// Mostrar/ocultar progresso
function mostrarProgresso(mostrar) {
  const progressContainer = document.getElementById('progressoDownload');
  if (mostrar) {
    progressContainer.classList.remove('hidden');
  } else {
    progressContainer.classList.add('hidden');
  }
}

// Setup de notificações
function setupNotifications() {
  // Progresso de download
  api.on.downloadProgress((data) => {
    document.getElementById('progressFill').style.width = data.percent + '%';
    document.getElementById('progressText').textContent =
      `Baixando... ${data.percent}% (${formatBytes(data.downloaded)} / ${formatBytes(data.total)})`;
  });

  // Notificações do sistema
  api.on.notification((data) => {
    mostrarToast(data.body, 'success', data.title);
  });
}

// Formata bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Toast/Notificação
function mostrarToast(mensagem, tipo = 'success', titulo = null) {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;

  const content = document.createElement('div');
  if (titulo) {
    const tituloEl = document.createElement('strong');
    tituloEl.textContent = titulo;
    content.appendChild(tituloEl);
    content.appendChild(document.createElement('br'));
  }
  content.appendChild(document.createTextNode(mensagem));

  toast.appendChild(content);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}
