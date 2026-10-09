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
  return Number.isFinite(amount) && amount >= 0 && amount <= 999_999_999.99 ? amount : null;
}

export function erroDataParcial(value: string): string | null {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length >= 1 && Number(digits[0]) > 3) return 'O dia deve estar entre 01 e 31.';
  if (digits.length >= 2 && (Number(digits.slice(0, 2)) < 1 || Number(digits.slice(0, 2)) > 31)) {
    return 'O dia deve estar entre 01 e 31.';
  }
  if (digits.length >= 3 && Number(digits[2]) > 1) return 'O mês deve estar entre 01 e 12.';
  if (digits.length >= 4 && (Number(digits.slice(2, 4)) < 1 || Number(digits.slice(2, 4)) > 12)) {
    return 'O mês deve estar entre 01 e 12.';
  }
  return null;
}

export function mascararData(value: string, previous = ''): string {
  if (erroDataParcial(value)) return previous;
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function lerDataBrasileira(value: string, hoje = new Date()): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, diaTexto, mesTexto, anoTexto] = match;
  const dia = Number(diaTexto);
  const mes = Number(mesTexto);
  const ano = Number(anoTexto);
  const data = new Date(Date.UTC(ano, mes - 1, dia, 12));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  const valorDia = ano * 10000 + mes * 100 + dia;
  const diaAtual = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
  if (valorDia < diaAtual) return null;
  return data.toISOString();
}

export function erroDataValidade(value: string, hoje = new Date()): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return 'Informe a validade no formato DD/MM/AAAA.';
  const parcial = erroDataParcial(value);
  if (parcial) return parcial;
  if (!lerDataBrasileira(value, hoje)) return 'Informe uma data real, de hoje em diante.';
  return null;
}
