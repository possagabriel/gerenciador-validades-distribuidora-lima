import { client } from './client';
import type { RelatorioPrejuizo, SugestoesDesconto } from '../types/relatorio';

export async function obterRelatorio(): Promise<RelatorioPrejuizo> {
  const { data } = await client.get<RelatorioPrejuizo>('lotes/relatorio-prejuizo/');
  return data;
}

export interface FiltrosRelatorio {
  data_inicio?: string;
  data_fim?: string;
  categoria?: number;
  produto?: number;
  esgotado?: boolean;
}

export async function obterRelatorioFiltrado(filtros: FiltrosRelatorio): Promise<RelatorioPrejuizo> {
  return (await client.get<RelatorioPrejuizo>('lotes/relatorio-prejuizo/', { params: filtros })).data;
}

export async function exportarCsvLotes(filtros: FiltrosRelatorio): Promise<string> {
  return (await client.get<string>('lotes/exportar-csv/', { params: filtros, responseType: 'text' })).data;
}

export async function obterDescontos(): Promise<SugestoesDesconto> {
  const { data } = await client.get<SugestoesDesconto>('lotes/sugestoes-desconto/');
  return data;
}
