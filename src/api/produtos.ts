import { client } from './client';
import { normalizeList, type ListResponse } from './pagination';
import type { Produto } from '../types/produto';
import type { Categoria } from '../types/categoria';

export interface NovoProduto { nome: string; categoria: number; preco_venda: number }

export async function listarProdutos(search = ''): Promise<Produto[]> {
  const { data } = await client.get<ListResponse<Produto>>('produtos/', { params: search ? { search } : undefined });
  return normalizeList(data).items;
}

export async function detalharProduto(id: number): Promise<Produto> {
  const { data } = await client.get<Produto>(`produtos/${id}/`);
  return data;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await client.get<ListResponse<Categoria>>('categorias/');
  return normalizeList(data).items;
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  const { data } = await client.post<Categoria>('categorias/', { nome });
  return data;
}

export async function criarProduto(produto: NovoProduto): Promise<Produto> {
  const { data } = await client.post<Produto>('produtos/', produto);
  return data;
}

export async function criarCodigoBarras(produto: number, codigo_barras: string): Promise<void> {
  await client.post('produto-skus/', { produto, codigo_barras });
}

export async function buscarCodigoBarras(codigo: string): Promise<Produto | null> {
  const results = await listarProdutos(codigo);
  return results.find(produto => produto.skus.some(sku => sku.codigo_barras === codigo)) ?? null;
}
