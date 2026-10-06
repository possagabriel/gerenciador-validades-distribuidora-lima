import { client } from './client';
import { normalizeList, type ListPage, type ListResponse } from './pagination';
import type { Produto } from '../types/produto';
import type { Categoria } from '../types/categoria';
import type { SKU } from '../types/sku';

export interface LoteInicial { data_validade: string; quantidade: number; custo_unitario_compra: number }
export interface NovoProduto { nome: string; categoria: number; preco_venda: number; lotes_iniciais: LoteInicial[] }

export async function listarProdutos(search = '', url = 'produtos/'): Promise<ListPage<Produto>> {
  const { data } = await client.get<ListResponse<Produto>>(url, {
    params: url === 'produtos/' && search ? { search } : undefined,
  });
  return normalizeList<Produto>(data);
}

export async function detalharProduto(id: number, timeout?: number): Promise<Produto> {
  const { data } = await client.get<Produto>(`produtos/${id}/`, timeout === undefined ? undefined : { timeout });
  return data;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const categorias: Categoria[] = [];
  const visitadas = new Set<string>();
  let url: string | null = 'categorias/';
  while (url && !visitadas.has(url)) {
    visitadas.add(url);
    const data: ListResponse<Categoria> = (await client.get<ListResponse<Categoria>>(url)).data;
    const pagina: ListPage<Categoria> = normalizeList<Categoria>(data);
    categorias.push(...pagina.items);
    url = pagina.next;
  }
  return categorias;
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  const { data } = await client.post<Categoria>('categorias/', { nome });
  return data;
}

export async function criarProduto(produto: NovoProduto): Promise<Produto> {
  const { data } = await client.post<Produto>('produtos/', produto);
  return data;
}

export async function criarCodigoBarras(produto: number, codigo_barras: string): Promise<SKU> {
  try {
    const { data } = await client.post<SKU>('produto-skus/', { produto, codigo_barras });
    return data;
  } catch (error) {
    // Confirma se uma resposta perdida ocorreu após a gravação no servidor.
    try {
      const atualizado = await detalharProduto(produto);
      const existente = atualizado.skus.find(sku => sku.codigo_barras === codigo_barras);
      if (existente) return existente;
    } catch { /* Mantém o erro original se a consulta falhar. */ }
    throw error;
  }
}

export async function buscarCodigoBarras(codigo: string): Promise<Produto | null> {
  const scanTimeout = 5000;
  const valor = codigo.trim();
  if (!valor) return null;
  const candidatos = [valor];
  if (/^[0-9]{12}$/.test(valor)) candidatos.push(`0${valor}`);
  else if (/^0[0-9]{12}$/.test(valor)) candidatos.push(valor.slice(1));

  for (const candidato of candidatos) {
    let url: string | null = 'produto-skus/';
    let params: { search: string } | undefined = { search: candidato };
    const visitadas = new Set<string>();
    while (url) {
      if (visitadas.has(url)) break;
      visitadas.add(url);
      const data: ListResponse<SKU> = (await client.get<ListResponse<SKU>>(url, { params, timeout: scanTimeout })).data;
      const pagina: ListPage<SKU> = normalizeList<SKU>(data);
      const sku = pagina.items.find(item => item.codigo_barras === candidato);
      if (sku) return detalharProduto(sku.produto, scanTimeout);
      url = pagina.next;
      params = undefined;
    }
  }
  return null;
}
