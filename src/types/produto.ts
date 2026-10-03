import type { SKU } from './sku';

export interface Produto {
  id: number;
  nome: string;
  categoria: number;
  categoria_nome: string;
  preco_venda: number | string;
  skus: SKU[];
}
