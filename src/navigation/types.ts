import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParams = { Login: undefined };
export type ProductsStackParams = {
  ProdutosLista: undefined;
  AdicionarProduto: undefined;
  ProdutoDetalhe: { id: number };
  EditarProduto: { id: number };
  SkuLotes: { produtoId: number; codigo?: string };
  LoteDetalhe: { id: number };
  Scanner: undefined;
};
export type LotesStackParams = { LotesLista: undefined; LoteDetalhe: { id: number } };
export type MoreStackParams = { MaisMenu: undefined; Relatorios: undefined; Descontos: undefined };
export type TabsParams = {
  Inicio: undefined;
  Produtos: NavigatorScreenParams<ProductsStackParams>;
  Lotes: NavigatorScreenParams<LotesStackParams>;
  Mais: NavigatorScreenParams<MoreStackParams>;
};
