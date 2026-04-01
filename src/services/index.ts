// Barrel export — src/services/index.ts
export { supabase } from './supabase';
export { getCache, setCache, clearCache, clearAllCache } from './cache.service';
export {
  buscarTransacoes, criarTransacao, criarTransacoesBatch,
  atualizarTransacao, excluirTransacao, excluirParcelas,
  marcarPago, marcarPagoBatch, adiantarParcelas,
} from './transacoes.service';
export { buscarCartoes, criarCartao, atualizarCartao, excluirCartao, buscarGastosCartao } from './cartoes.service';
export { buscarReceitas, criarReceita, atualizarReceita, excluirReceita, calcularTotalReceitas } from './receitas.service';
export { buscarRecorrentes, criarRecorrente, atualizarRecorrente, excluirRecorrente, gerarRecorrentes, gerarRecorrentesAgora, gerarRecorrentesMes } from './recorrentes.service';
export { buscarReservas, criarReserva, registrarMovimento, atualizarReserva, excluirReserva, buscarMovimentos } from './reservas.service';
export { buscarListas, criarLista, excluirLista, buscarItens, criarItem, atualizarItem, excluirItem } from './compras.service';
export { buscarNotas, criarNota, atualizarNota, excluirNota } from './notas.service';
export { buscarMetas, salvarMeta, excluirMeta } from './metas.service';
export { buscarContas, criarConta, atualizarConta, excluirConta } from './contas.service';
export { registrarNotificacoes, agendarLembrete, agendarLembreteCompromisso, cancelarNotificacao, cancelarTodasNotificacoes } from './notificacoes.service';
