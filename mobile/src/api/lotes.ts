import { client } from './client';
import { normalizeList, type ListResponse } from './pagination';
import type { Lote, NivelVencimento } from '../types/lote';

export async function listarLotes(nivel?: NivelVencimento): Promise<Lote[]> {
  const { data } = await client.get<ListResponse<Lote>>('lotes/', { params: nivel === undefined ? undefined : { nivel_vencimento: nivel } });
  return normalizeList(data).items;
}

export async function detalharLote(id: number): Promise<Lote> {
  const { data } = await client.get<Lote>(`lotes/${id}/`);
  return data;
}
