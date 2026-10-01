import { ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { obterDescontos } from '../api/relatorios';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function DescontosScreen(): React.JSX.Element {
  const query = useQuery({ queryKey: ['descontos'], queryFn: obterDescontos });
  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => { void queryClient.invalidateQueries({ queryKey: ['descontos'], refetchType: 'active' }); }, [queryClient]));
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  return <ScrollView style={common.page}>
    <Text style={common.title}>Sugestões de desconto</Text>
    <Text style={[common.muted, { marginBottom: 12 }]}>{query.data.quantidade} sugestão(ões) para lotes disponíveis.</Text>
    {query.data.sugestoes.map(item => <View key={item.lote_id} style={common.card}>
      <Text style={common.heading}>{item.produto}</Text><Text style={common.muted}>{item.categoria} · {item.nome_lote}</Text>
      <Text style={common.body}>Desconto: {item.percentual_desconto}%</Text>
      <Text style={common.body}>De {formatarMoeda(item.preco_venda)} por {formatarMoeda(item.preco_sugerido)}</Text>
      {item.abaixo_do_custo && <Text style={{ color: '#A32320', marginTop: 6 }}>Preço abaixo do custo</Text>}
    </View>)}
    {!query.data.quantidade && <Text style={common.muted}>Nenhuma sugestão disponível.</Text>}
  </ScrollView>;
}
