export type NivelVencimento = 0 | 1 | 2 | 3;

export interface Lote {
  id: number;
  produto: number;
  produto_nome: string;
  dias_critico?: number;
  nome_lote: string;
  quantidade: number;
  custo_unitario_compra: number | string | null;
  nivel_vencimento: NivelVencimento | null;
  esgotado: boolean;
  dias_vencido: number | null;
  data_cadastro: string;
  data_validade: string | null;
  tempo_vencimento: number | null;
}
