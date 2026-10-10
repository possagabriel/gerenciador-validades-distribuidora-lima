import { client } from './client';
import { normalizeList, type ListResponse, type NormalizedPage } from './pagination';
import type { Produto } from '../types/produto';
import type { Categoria } from '../types/categoria';
import type { SKU } from '../types/sku';

export interface NovoProduto {
  nome: string;
  categoria: number;
  preco_venda: number;
  lote_inicial: {
    quantidade: number;
    custo_unitario_compra: number;
    data_validade: string;
  };
  codigo_barras?: string;
}

export type AlteracaoProduto = Pick<Produto, 'nome' | 'categoria'> & { preco_venda: number };

export async function paginaProdutos(search = '', page = 1): Promise<NormalizedPage<Produto>> {
  const { data } = await client.get<ListResponse<Produto>>('produtos/', { params: { ...(search ? { search } : {}), page } });
  return normalizeList(data);
}

export async function listarProdutos(search = ''): Promise<Produto[]> {
  return (await paginaProdutos(search)).items;
}

export async function detalharProduto(id: number): Promise<Produto> {
  const { data } = await client.get<Produto>(`produtos/${id}/`);
  return data;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await client.get<ListResponse<Categoria>>('categorias/');
  return normalizeList(data).items;
}

export async function criarCategoria(nome: string, dias_atencao = 30, dias_critico = 7): Promise<Categoria> {
  const { data } = await client.post<Categoria>('categorias/', { nome, dias_atencao, dias_critico });
  return data;
}

export async function atualizarCategoria(id: number, values: Pick<Categoria, 'nome' | 'dias_atencao' | 'dias_critico'>): Promise<Categoria> {
  return (await client.patch<Categoria>(`categorias/${id}/`, values)).data;
}

export async function excluirCategoria(id: number): Promise<void> {
  await client.delete(`categorias/${id}/`);
}

export async function listarCategoriasExcluidas(): Promise<Categoria[]> {
  return (await client.get<Categoria[]>('categorias/lixeira/')).data;
}

export async function restaurarCategoria(id: number): Promise<Categoria> {
  return (await client.post<Categoria>(`categorias/${id}/restaurar/`)).data;
}

export async function criarProduto(produto: NovoProduto): Promise<Produto> {
  const { data } = await client.post<Produto>('produtos/', produto);
  return data;
}

export async function atualizarProduto(id: number, alteracao: AlteracaoProduto): Promise<Produto> {
  const { data } = await client.patch<Produto>(`produtos/${id}/`, alteracao);
  return data;
}

export async function excluirProduto(id: number): Promise<void> {
  await client.delete(`produtos/${id}/`);
}

export async function listarProdutosExcluidos(): Promise<Produto[]> {
  return (await client.get<Produto[]>('produtos/lixeira/')).data;
}

export async function restaurarProduto(id: number): Promise<Produto> {
  return (await client.post<Produto>(`produtos/${id}/restaurar/`)).data;
}

export async function criarCodigoBarras(produto: number, codigo_barras: string): Promise<SKU> {
  const { data } = await client.post<SKU>('produto-skus/', { produto, codigo_barras });
  return data;
}

export async function buscarCodigoBarras(codigo: string): Promise<Produto | null> {
  const { data } = await client.get<ListResponse<SKU>>('produto-skus/', { params: { codigo_barras: codigo.trim() } });
  const sku = normalizeList(data).items[0];
  return sku ? detalharProduto(sku.produto) : null;
}
