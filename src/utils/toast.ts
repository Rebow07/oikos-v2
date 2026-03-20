/**
 * toast.ts — Helper global de Toast
 * ─────────────────────────────────────────────────────────────────────────────
 * Instale: npx expo install react-native-toast-message
 *
 * Uso em qualquer lugar do app (sem hook, sem contexto):
 *   import { toast } from '../utils/toast';
 *   toast.erro('Não foi possível salvar.');
 *   toast.ok('Receita salva!');
 *   toast.aviso('Saldo insuficiente.');
 *   toast.info('Sincronizando...');
 */

import Toast from 'react-native-toast-message';

export const toast = {
  /** Erro — fundo vermelho */
  erro: (mensagem: string, titulo = 'Erro') =>
    Toast.show({ type: 'error', text1: titulo, text2: mensagem, visibilityTime: 4000, position: 'top' }),

  /** Sucesso — fundo verde */
  ok: (mensagem: string, titulo = 'Pronto') =>
    Toast.show({ type: 'success', text1: titulo, text2: mensagem, visibilityTime: 3000, position: 'top' }),

  /** Aviso — fundo laranja */
  aviso: (mensagem: string, titulo = 'Atenção') =>
    Toast.show({ type: 'error', text1: titulo, text2: mensagem, visibilityTime: 3500, position: 'top' }),

  /** Info — fundo azul */
  info: (mensagem: string, titulo = 'Info') =>
    Toast.show({ type: 'info', text1: titulo, text2: mensagem, visibilityTime: 2500, position: 'top' }),

  /** Fecha qualquer toast visível */
  fechar: () => Toast.hide(),
};
