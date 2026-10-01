import type { Lote } from './lote';

export interface RelatorioPrejuizo {
  periodo: { data_inicio: string; data_fim: string };
  prejuizo_total: number | string;
  quantidade_lotes_considerados: number;
  lotes_considerados: Lote[];
  quantidade_lotes_sem_custo_cadastrado: number;
  lotes_sem_custo_cadastrado: Lote[];
}

export interface SugestaoDesconto {
  lote_id: number;
  nome_lote: string;
  quantidade: number;
  produto: string;
  categoria: string;
  preco_venda: number | string;
  custo_unitario_compra: number | string;
  percentual_desconto: number | string;
  preco_sugerido: number | string;
  abaixo_do_custo: boolean;
}

export interface SugestoesDesconto {
  quantidade: number;
  sugestoes: SugestaoDesconto[];
}
