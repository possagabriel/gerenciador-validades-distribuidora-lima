import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { obterRelatorio } from '../api/relatorios';
import { useLotes } from '../hooks/useLotes';
import { useAuth } from '../hooks/useAuth';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { common } from '../components/theme';
import { formatarMoeda } from '../utils/formatters';

export default function DashboardScreen(): React.JSX.Element {
  const { signOut } = useAuth();
  const criticos = useLotes(2);
  const relatorio = useQuery({ queryKey: ['relatorio'], queryFn: obterRelatorio });
  if (criticos.isLoading || relatorio.isLoading) return <LoadingState />;
  if (criticos.isError || relatorio.isError) return <ErrorState onRetry={() => { void criticos.refetch(); void relatorio.refetch(); }} />;
  return <ScrollView style={common.page}>
    <Text style={common.title}>Resumo do estoque</Text>
    <View style={common.card}><Text style={common.heading}>Lotes críticos</Text><Text style={common.title}>{criticos.data?.length ?? 0}</Text></View>
    <View style={common.card}><Text style={common.heading}>Prejuízo no período</Text>
      <Text style={common.title}>{formatarMoeda(relatorio.data?.prejuizo_total ?? null)}</Text>
      <Text style={common.muted}>Padrão da API: últimos 30 dias.</Text></View>
    <Pressable onPress={() => void signOut()} style={common.button}><Text style={common.buttonText}>Sair</Text></Pressable>
  </ScrollView>;
}
