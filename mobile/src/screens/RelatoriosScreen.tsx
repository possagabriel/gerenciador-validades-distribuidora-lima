import { ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { obterRelatorio } from '../api/relatorios';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';
import { formatarData, formatarMoeda } from '../utils/formatters';

export default function RelatoriosScreen(): React.JSX.Element {
  const query = useQuery({ queryKey: ['relatorio'], queryFn: obterRelatorio });
  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => { void queryClient.invalidateQueries({ queryKey: ['relatorio'], refetchType: 'active' }); }, [queryClient]));
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const data = query.data;
  return <ScrollView style={common.page}>
    <Text style={common.title}>Relatório de prejuízo</Text>
    <Text style={common.muted}>{formatarData(data.periodo.data_inicio)} a {formatarData(data.periodo.data_fim)}</Text>
    <View style={common.card}><Text style={common.heading}>Prejuízo total</Text><Text style={common.title}>{formatarMoeda(data.prejuizo_total)}</Text>
      <Text style={common.body}>{data.quantidade_lotes_considerados} lote(s) considerados</Text>
      <Text style={common.muted}>{data.quantidade_lotes_sem_custo_cadastrado} lote(s) sem custo cadastrado</Text></View>
    {data.lotes_considerados.map(lote => <View key={lote.id} style={common.card}>
      <Text style={common.heading}>{lote.produto_nome}</Text><Text style={common.body}>{lote.nome_lote}</Text>
      <Text style={common.muted}>{lote.quantidade} unidade(s) · validade {formatarData(lote.data_validade)}</Text>
    </View>)}
  </ScrollView>;
}
