// PontoFit — acesso de administrador.
// Administrador = usuário com app_metadata.role = 'admin' (definido só pelo
// banco/servidor; o usuário não consegue alterar app_metadata). A checagem usa
// auth.getUser com a chave secreta, que lê o cadastro atual (não o token antigo).
'use strict';

const { usuarioDaRequisicao } = require('./pix');

function ehAdmin(usuario) {
  return !!(usuario && usuario.app_metadata && usuario.app_metadata.role === 'admin');
}

/** → usuário administrador ou null (sem sessão ou sem permissão). */
async function exigirAdmin(req) {
  const usuario = await usuarioDaRequisicao(req);
  return ehAdmin(usuario) ? usuario : null;
}

module.exports = { ehAdmin, exigirAdmin };
