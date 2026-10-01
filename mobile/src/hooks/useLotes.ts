import { useQuery } from '@tanstack/react-query';
import { detalharLote, listarLotes } from '../api/lotes';
import type { NivelVencimento } from '../types/lote';

export function useLotes(nivel?: NivelVencimento) {
  return useQuery({ queryKey: ['lotes', nivel ?? 'todos'], queryFn: () => listarLotes(nivel) });
}

export function useLote(id: number) {
  return useQuery({ queryKey: ['lote', id], queryFn: () => detalharLote(id) });
}
