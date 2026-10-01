import { client } from './client';
import type { RelatorioPrejuizo, SugestoesDesconto } from '../types/relatorio';

export async function obterRelatorio(): Promise<RelatorioPrejuizo> {
  const { data } = await client.get<RelatorioPrejuizo>('lotes/relatorio-prejuizo/');
  return data;
}

export async function obterDescontos(): Promise<SugestoesDesconto> {
  const { data } = await client.get<SugestoesDesconto>('lotes/sugestoes-desconto/');
  return data;
}
