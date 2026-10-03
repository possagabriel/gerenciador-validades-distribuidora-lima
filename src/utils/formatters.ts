import type { Lote } from '../types/lote';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function validadeDoLote(lote: Lote): Date | null {
  if (lote.data_validade) {
    const date = new Date(lote.data_validade);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (lote.tempo_vencimento !== null) {
    const date = new Date(lote.data_cadastro);
    if (Number.isNaN(date.getTime())) return null;
    date.setUTCDate(date.getUTCDate() + lote.tempo_vencimento);
    return date;
  }
  return null;
}

export function diasRestantes(lote: Lote, now = new Date()): number | null {
  const data = validadeDoLote(lote);
  if (!data) return null;
  const dia = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return (dia(data) - dia(now)) / 86_400_000;
}

export function formatarData(value: string | Date | null): string {
  if (!value) return 'Não informada';
  const date = typeof value === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value) : value;
  return Number.isNaN(date.getTime()) ? 'Não informada' : dateFormatter.format(date);
}

export function formatarMoeda(value: number | string | null): string {
  const number = Number(value);
  return value === null || !Number.isFinite(number)
    ? 'Não informado'
    : currencyFormatter.format(number);
}

export function lerPreco(value: string): number | null {
  const cleaned = value.replace(/\s|R\$/gi, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
