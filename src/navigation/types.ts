import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParams = { Login: undefined };
export type ProductsStackParams = {
  ProdutosLista: undefined;
  AdicionarProduto: { codigoInicial?: string } | undefined;
  ProdutoDetalhe: { id: number };
  EditarProduto: { id: number };
  SkuLotes: { produtoId: number; codigo?: string };
  LoteDetalhe: { id: number };
  LoteFormulario: { id?: number; produtoId?: number };
  Scanner: undefined;
};
export type LotesStackParams = { LotesLista: undefined; LoteDetalhe: { id: number }; LoteFormulario: { id?: number; produtoId?: number } };
export type MoreStackParams = { MaisMenu: undefined; Relatorios: undefined; Categorias: undefined; Lixeira: undefined };
export type TabsParams = {
  Inicio: undefined;
  Produtos: NavigatorScreenParams<ProductsStackParams>;
  Lotes: NavigatorScreenParams<LotesStackParams>;
  Descontos: undefined;
  Mais: NavigatorScreenParams<MoreStackParams>;
};
