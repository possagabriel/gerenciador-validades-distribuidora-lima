import { client } from './client';
import { normalizeList, type ListResponse, type NormalizedPage } from './pagination';
import type { Lote, NivelVencimento } from '../types/lote';

export async function paginaLotes(nivel?: NivelVencimento, page = 1, produtoId?: number, esgotado?: boolean): Promise<NormalizedPage<Lote>> {
  const { data } = await client.get<ListResponse<Lote>>('lotes/', { params: { ...(nivel === undefined ? {} : { nivel_vencimento: nivel }), ...(produtoId ? { produto: produtoId } : {}), ...(esgotado === undefined ? {} : { esgotado }), page } });
  return normalizeList(data);
}

export async function listarLotes(nivel?: NivelVencimento): Promise<Lote[]> {
  const { data } = await client.get<ListResponse<Lote>>('lotes/', { params: { ...(nivel === undefined ? {} : { nivel_vencimento: nivel }), page_size: 50 } });
  return normalizeList(data).items;
}

export async function obterPrioridade(): Promise<{ count: number; results: Lote[] }> {
  return (await client.get<{ count: number; results: Lote[] }>('lotes/prioridade/')).data;
}

export async function obterAlertas(): Promise<Lote[]> {
  return (await client.get<Lote[]>('lotes/alertas/')).data;
}

export async function detalharLote(id: number): Promise<Lote> {
  const { data } = await client.get<Lote>(`lotes/${id}/`);
  return data;
}

export interface DadosLote {
  produto: number;
  quantidade: number;
  custo_unitario_compra: number;
  data_validade: string;
}

export async function criarLote(dados: DadosLote): Promise<Lote> {
  return (await client.post<Lote>('lotes/', dados)).data;
}

export async function atualizarLote(id: number, dados: Partial<Pick<DadosLote, 'custo_unitario_compra' | 'data_validade'>>): Promise<Lote> {
  return (await client.patch<Lote>(`lotes/${id}/`, dados)).data;
}

export async function excluirLote(id: number): Promise<void> {
  await client.delete(`lotes/${id}/`);
}

export async function listarLotesExcluidos(): Promise<Lote[]> {
  return (await client.get<Lote[]>('lotes/lixeira/')).data;
}

export async function restaurarLote(id: number): Promise<Lote> {
  return (await client.post<Lote>(`lotes/${id}/restaurar/`)).data;
}

export type TipoMovimento = 'ENTRADA' | 'SAIDA' | 'AJUSTE';
export interface Movimento {
  id: number;
  usuario_nome: string;
  tipo: TipoMovimento;
  quantidade: number;
  quantidade_antes: number;
  quantidade_depois: number;
  motivo: string;
  criado_em: string;
}

export async function listarMovimentos(id: number): Promise<Movimento[]> {
  return (await client.get<Movimento[]>(`lotes/${id}/movimentos/`)).data;
}

export async function registrarMovimento(id: number, dados: { tipo: TipoMovimento; quantidade: number; motivo: string }): Promise<Lote> {
  const { data } = await client.post<{ lote: Lote }>(`lotes/${id}/movimentos/`, dados);
  return data.lote;
}
