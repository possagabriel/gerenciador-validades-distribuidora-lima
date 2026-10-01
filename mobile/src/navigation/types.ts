export type AuthStackParams = { Login: undefined };
export type ProductsStackParams = {
  ProdutosLista: undefined;
  ProdutoDetalhe: { id: number };
  SkuLotes: { produtoId: number; codigo: string };
  LoteDetalhe: { id: number };
  Scanner: undefined;
  Dashboard: undefined;
};
export type LotesStackParams = { LotesLista: undefined; LoteDetalhe: { id: number } };
export type TabsParams = { Produtos: undefined; Lotes: undefined; Relatorios: undefined; Descontos: undefined };
