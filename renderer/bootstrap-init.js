// Inicialização de modais Bootstrap
let modalAcao, modalDias;

document.addEventListener('DOMContentLoaded', () => {
  // Inicializa os modais Bootstrap
  modalAcao = new bootstrap.Modal(document.getElementById('modalAcao'));
  modalDias = new bootstrap.Modal(document.getElementById('modalDias'));
});

// Funções helper para mostrar/esconder modais
function mostrarModalAcao() {
  modalAcao.show();
}

function esconderModalAcao() {
  modalAcao.hide();
}

function mostrarModalDias() {
  modalDias.show();
}

function esconderModalDias() {
  modalDias.hide();
}
