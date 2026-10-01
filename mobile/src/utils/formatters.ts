import type { Lote } from '../types/lote';

export function validadeDoLote(lote: Lote): Date | null {
  if (lote.data_validade) {
    const date = new Date(lote.data_validade);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (lote.tempo_vencimento !== null) {
    const date = new Date(lote.data_cadastro);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() + lote.tempo_vencimento);
    return date;
  }
  return null;
}

export function diasRestantes(lote: Lote, now = new Date()): number | null {
  const data = validadeDoLote(lote);
  if (!data) return null;
  return Math.ceil((data.getTime() - now.getTime()) / 86_400_000);
}

export function formatarData(value: string | Date | null): string {
  if (!value) return 'Não informada';
  const date = typeof value === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value) : value;
  return Number.isNaN(date.getTime()) ? 'Não informada' : new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatarMoeda(value: number | string | null): string {
  const number = Number(value);
  return value === null || !Number.isFinite(number)
    ? 'Não informado'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
}
