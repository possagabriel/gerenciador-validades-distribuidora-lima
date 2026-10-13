import { useQuery } from '@tanstack/react-query';
import { detalharLote, paginaLotes } from '../api/lotes';
import type { NivelVencimento } from '../types/lote';

export function useLotes(nivel?: NivelVencimento, page = 1, produtoId?: number, esgotado?: boolean) {
  return useQuery({ queryKey: ['lotes', nivel ?? 'todos', page, produtoId ?? 'todos', esgotado ?? 'todos'], queryFn: () => paginaLotes(nivel, page, produtoId, esgotado) });
}

export function useLote(id: number) {
  return useQuery({ queryKey: ['lote', id], queryFn: () => detalharLote(id) });
}
