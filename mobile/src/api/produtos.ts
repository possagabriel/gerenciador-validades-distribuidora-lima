import { client } from './client';
import { normalizeList, type ListResponse } from './pagination';
import type { Produto } from '../types/produto';

export async function listarProdutos(search = ''): Promise<Produto[]> {
  const { data } = await client.get<ListResponse<Produto>>('produtos/', { params: search ? { search } : undefined });
  return normalizeList(data).items;
}

export async function detalharProduto(id: number): Promise<Produto> {
  const { data } = await client.get<Produto>(`produtos/${id}/`);
  return data;
}

export async function buscarCodigoBarras(codigo: string): Promise<Produto | null> {
  const results = await listarProdutos(codigo);
  return results.find(produto => produto.skus.some(sku => sku.codigo_barras === codigo)) ?? null;
}
