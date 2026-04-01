// src/utils/index.ts — Rebow Finance v2

/**
 * Formata um número como moeda brasileira (R$)
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata uma data ISO para exibição dd/MM/yyyy
 */
export function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata data curta: dd/MM
 */
export function formatarDataCurta(dataISO: string): string {
  const [, mes, dia] = dataISO.split('T')[0].split('-');
  return `${dia}/${mes}`;
}

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
export function dataHoje(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Converte mês (1-12) e ano em data ISO para início do mês
 */
export function inicioDoMes(mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`;
}

/**
 * Converte mês (1-12) e ano em data ISO para fim do mês
 */
export function fimDoMes(mes: number, ano: number): string {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;
}

import { AVATAR_COLORS } from '../constants';

/**
 * Gera cor de avatar baseada no índice do membro
 */
export function corAvatar(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/**
 * Gera iniciais a partir de um nome (máximo 2 letras)
 */
export function iniciais(nome: string): string {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Gera UUID v4 simples (para parcela_grupo_id etc)
 */
export function gerarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Debounce genérico
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Trunca texto com reticências
 */
export function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max - 1) + '…';
}

/**
 * Formata valor abreviado para gráficos: 1200 → "1,2k" / 1500000 → "1,5M"
 */
export function formatarMoedaAbrev(valor: number): string {
  if (valor === 0) return '—';
  if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (valor >= 1_000) return `${(valor / 1_000).toFixed(1).replace('.', ',')}k`;
  return `${valor.toFixed(0)}`;
}

