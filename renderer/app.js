// Church Util - Renderer Process
const api = window.electronAPI;

// Estado global
let acoes = [];
let dias = [];
let acaoEmEdicao = null;
let dadosProvaiVede = null;
let dadosInformativo = null;
let filtroAtualDia = ''; // Mantém filtro de dia ativo
let filtroAtualCategoria = ''; // Mantém filtro de categoria ativo

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

  // Salva valores atuais antes de recriar
  const valorFiltroDiaAtual = filtroDia.value || filtroAtualDia;
  const valorFiltroCategoriaAtual = document.getElementById('filtroCategoria').value || filtroAtualCategoria;

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

  // Restaura valores salvos
  filtroDia.value = valorFiltroDiaAtual;
  document.getElementById('filtroCategoria').value = valorFiltroCategoriaAtual;

  // Atualiza estado global
  filtroAtualDia = valorFiltroDiaAtual;
  filtroAtualCategoria = valorFiltroCategoriaAtual;
}

// Renderiza lista de ações
function renderizarAcoes() {
  const container = document.getElementById('acoesContainer');
  const emptyState = document.getElementById('emptyState');

  // Atualiza estado global dos filtros
  filtroAtualDia = document.getElementById('filtroDia').value;
  filtroAtualCategoria = document.getElementById('filtroCategoria').value;

  let acoesFiltradas = acoes.filter(acao => {
    if (filtroAtualDia && acao.diaId !== filtroAtualDia) return false;
    if (filtroAtualCategoria && acao.categoria !== filtroAtualCategoria) return false;
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
  card.className = 'card shadow-sm mb-3';
  card.dataset.id = acao.id;
  card.draggable = true;
  card.style.cursor = 'move';

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  // Linha superior: Botão executar + Título
  const topRow = document.createElement('div');
  topRow.className = 'd-flex align-items-start gap-2 mb-2';

  // Botão Executar (só ícone, grande)
  const btnExecutar = document.createElement('button');
  btnExecutar.className = 'btn btn-success btn-sm rounded-circle';
  btnExecutar.innerHTML = '<i class="bi bi-play-fill"></i>';
  btnExecutar.style.width = '40px';
  btnExecutar.style.height = '40px';
  btnExecutar.onclick = () => executarAcao(acao);
  topRow.appendChild(btnExecutar);

  // Título e badges
  const titleSection = document.createElement('div');
  titleSection.className = 'flex-grow-1';

  const titulo = document.createElement('h6');
  titulo.className = 'card-title mb-2 fw-bold';
  titulo.textContent = acao.titulo;
  titleSection.appendChild(titulo);

  // Badges (tags pequenas)
  const badgesDiv = document.createElement('div');
  badgesDiv.className = 'd-flex gap-1 flex-wrap mb-2';

  // Badge de categoria
  const badgeCategoria = document.createElement('span');
  badgeCategoria.className = 'badge bg-primary text-white';
  badgeCategoria.style.fontSize = '0.7rem';
  badgeCategoria.textContent = getNomeCategoria(acao.categoria);
  badgesDiv.appendChild(badgeCategoria);

  // Badge de dia
  if (acao.diaId) {
    const dia = dias.find(d => d.id === acao.diaId);
    if (dia) {
      const badgeDia = document.createElement('span');
      badgeDia.className = 'badge bg-secondary text-white';
      badgeDia.style.fontSize = '0.7rem';
      badgeDia.textContent = dia.nome;
      badgesDiv.appendChild(badgeDia);
    }
  }

  // Detalhes específicos por categoria
  if (acao.categoria === 'geral' && acao.arquivoPath) {
    const detalheBadge = document.createElement('span');
    detalheBadge.className = 'badge bg-info text-dark';
    detalheBadge.style.fontSize = '0.7rem';
    detalheBadge.innerHTML = '<i class="bi bi-file-earmark"></i> Arquivo';
    badgesDiv.appendChild(detalheBadge);
  } else if (acao.categoria === 'provai_vede' && acao.categoriaMeta?.provai_vede?.videoSelecionado) {
    const detalheBadge = document.createElement('span');
    detalheBadge.className = 'badge bg-success text-white';
    detalheBadge.style.fontSize = '0.7rem';
    detalheBadge.innerHTML = '<i class="bi bi-camera-video"></i> Vídeo';
    badgesDiv.appendChild(detalheBadge);
  } else if (acao.categoria === 'informativo' && acao.categoriaMeta?.informativo) {
    const info = acao.categoriaMeta.informativo;
    const statusBadge = document.createElement('span');
    statusBadge.className = info.status === 'disponivel' ? 'badge bg-success text-white' : 'badge bg-warning text-dark';
    statusBadge.style.fontSize = '0.7rem';
    statusBadge.innerHTML = info.status === 'disponivel'
      ? '<i class="bi bi-check-circle"></i> Disponível'
      : '<i class="bi bi-clock"></i> Aguardando';
    badgesDiv.appendChild(statusBadge);
  }

  titleSection.appendChild(badgesDiv);
  topRow.appendChild(titleSection);

  // Botões de ação (editar, excluir, ordenar)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'd-flex gap-1 flex-shrink-0';

  // Botão Editar
  const btnEditar = document.createElement('button');
  btnEditar.className = 'btn btn-sm btn-outline-secondary';
  btnEditar.innerHTML = '<i class="bi bi-pencil"></i>';
  btnEditar.title = 'Editar';
  btnEditar.onclick = () => editarAcao(acao);
  actionsDiv.appendChild(btnEditar);

  // Botão Excluir
  const btnExcluir = document.createElement('button');
  btnExcluir.className = 'btn btn-sm btn-outline-danger';
  btnExcluir.innerHTML = '<i class="bi bi-trash"></i>';
  btnExcluir.title = 'Excluir';
  btnExcluir.onclick = () => excluirAcao(acao.id);
  actionsDiv.appendChild(btnExcluir);

  // Botões de reordenação
  if (index > 0) {
    const btnSubir = document.createElement('button');
    btnSubir.className = 'btn btn-sm btn-outline-secondary';
    btnSubir.innerHTML = '<i class="bi bi-arrow-up"></i>';
    btnSubir.title = 'Mover para cima';
    btnSubir.onclick = () => moverAcao(acao.id, 'up');
    actionsDiv.appendChild(btnSubir);
  }

  if (index < acoes.length - 1) {
    const btnDescer = document.createElement('button');
    btnDescer.className = 'btn btn-sm btn-outline-secondary';
    btnDescer.innerHTML = '<i class="bi bi-arrow-down"></i>';
    btnDescer.title = 'Mover para baixo';
    btnDescer.onclick = () => moverAcao(acao.id, 'down');
    actionsDiv.appendChild(btnDescer);
  }

  topRow.appendChild(actionsDiv);
  cardBody.appendChild(topRow);
  card.appendChild(cardBody);

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
      document.getElementById('videoProvaiSelecionado').classList.remove('d-none');
      document.getElementById('videoProvaiTitulo').textContent = pv.videoSelecionado.titulo;
      document.getElementById('videoProvaiPath').textContent = pv.videoSelecionado.localPath || 'Não baixado';
    }
  } else if (acao.categoria === 'informativo' && acao.categoriaMeta?.informativo) {
    const inf = acao.categoriaMeta.informativo;
    if (inf.videoExtraidoPath) {
      document.getElementById('informativoBaixado').classList.remove('d-none');
      document.getElementById('informativoPath').textContent = inf.videoExtraidoPath;
    }
  }

  mostrarModalAcao();
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

    // Pré-seleciona o dia filtrado (se houver) - DEPOIS do reset
    if (filtroAtualDia) {
      document.getElementById('acaoDia').value = filtroAtualDia;
    }

    // Pré-seleciona a categoria filtrada (se houver) - DEPOIS do reset
    if (filtroAtualCategoria) {
      document.getElementById('acaoCategoria').value = filtroAtualCategoria;
      mostrarSecaoCategoria(filtroAtualCategoria);
    } else {
      mostrarSecaoCategoria('geral');
    }

    mostrarModalAcao();
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
  document.getElementById('secaoGeral').classList.add('d-none');
  document.getElementById('secaoProvaiVede').classList.add('d-none');
  document.getElementById('secaoInformativo').classList.add('d-none');

  if (categoria === 'geral') {
    document.getElementById('secaoGeral').classList.remove('d-none');
  } else if (categoria === 'provai_vede') {
    document.getElementById('secaoProvaiVede').classList.remove('d-none');
    carregarVideosProvai();
  } else if (categoria === 'informativo') {
    document.getElementById('secaoInformativo').classList.remove('d-none');
    carregarProximoSabado();
  }
}

// Carrega vídeos Provai e Vede
async function carregarVideosProvai(forcarReload = false) {
  try {
    const container = document.getElementById('videosProvaiContainer');
    container.classList.remove('d-none');
    container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm" role="status"></div><p class="mt-2 mb-0">Carregando vídeos...</p></div>';

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
    document.getElementById('videoProvaiSelecionado').classList.remove('d-none');
    document.getElementById('videoProvaiTitulo').textContent = video.titulo;
    document.getElementById('videoProvaiPath').textContent = resultado.localPath;
    document.getElementById('videosProvaiContainer').classList.add('d-none');

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
      statusDiv.innerHTML = '<span class="badge bg-success">✅ Disponível</span>';
      document.getElementById('btnBaixarInformativo').classList.remove('d-none');
    } else {
      statusDiv.innerHTML = '<span class="badge bg-warning text-dark">⏳ Ainda não liberado</span>';
      document.getElementById('btnBaixarInformativo').classList.add('d-none');
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

    // Atualiza dadosInformativo com o caminho do vídeo extraído
    dadosInformativo.videoExtraidoPath = resultado.videoExtraidoPath;
    dadosInformativo.localZipPath = resultado.localZipPath;
    dadosInformativo.tipo = resultado.tipo;
    dadosInformativo.baixadoEm = resultado.baixadoEm;

    document.getElementById('informativoBaixado').classList.remove('d-none');
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
    } else {
      await api.acoes.create(acaoData);
    }

    // Recarrega dados ANTES de fechar o modal
    await carregarDados();

    // Fecha modal
    esconderModalAcao();

    // Mostra toast após fechar modal
    const mensagem = acaoEmEdicao ? 'Ação atualizada com sucesso' : 'Ação cadastrada com sucesso';
    mostrarToast(mensagem, 'success');

  } catch (error) {
    mostrarToast('Erro ao salvar ação: ' + error.message, 'error');
  }
}

// Gerenciar Dias
async function abrirModalDias() {
  mostrarModalDias();
  await renderizarDias();
}

async function renderizarDias() {
  const list = document.getElementById('diasList');
  list.innerHTML = '';

  dias.forEach(dia => {
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';

    const nome = document.createElement('span');
    nome.textContent = dia.nome;

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'btn btn-sm btn-outline-danger';
    btnExcluir.innerHTML = '<i class="bi bi-trash"></i> Excluir';
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
    progressContainer.classList.remove('d-none');
  } else {
    progressContainer.classList.add('d-none');
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
