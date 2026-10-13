import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { excluirLote } from '../api/lotes';
import { mensagemErro } from '../api/errors';
import { useLote } from '../hooks/useLotes';
import { podeEditarEstoque, podeGerenciar, usePerfil } from '../hooks/usePerfil';
import type { ProductsStackParams } from '../navigation/types';
import ActionButton from '../components/ActionButton';
import MovimentacoesLote from '../components/MovimentacoesLote';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import NivelVencimentoBadge from '../components/NivelVencimentoBadge';
import ScreenHeading from '../components/ScreenHeading';
import RefreshNotice from '../components/RefreshNotice';
import { colors, common } from '../components/theme';
import { diasRestantes, formatarData, formatarMoeda, validadeDoLote } from '../utils/formatters';

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return <View style={[common.row, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }]}>
    <Text style={[common.muted, { flex: 1 }]}>{label}</Text>
    <Text style={[common.body, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{value}</Text>
  </View>;
}

export default function LoteDetalheScreen(): React.JSX.Element {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();
  const queryClient = useQueryClient();
  const perfil = usePerfil();
  const [erro, setErro] = useState('');
  const id = (route.params as { id: number }).id;
  const query = useLote(id);
  const excluir = () => Alert.alert('Excluir lote?', 'O lote ficará na lixeira e poderá ser restaurado.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => { void (async () => {
      try {
        await excluirLote(id);
        void queryClient.invalidateQueries({ queryKey: ['lotes'] });
        void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
        void queryClient.invalidateQueries({ queryKey: ['alertas'] });
        void queryClient.invalidateQueries({ queryKey: ['produtos'] });
        navigation.goBack();
      } catch (error) { setErro(mensagemErro(error, 'Não foi possível excluir o lote.')); }
    })(); } }
  ]);
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <ErrorState onRetry={() => void query.refetch()} />;
  const lote = query.data;
  const dias = diasRestantes(lote);
  const prazo = dias === null ? 'Prazo não informado' : dias < 0 ? `Vencido há ${-dias} dias` : dias === 0 ? 'Vence hoje' : `${dias} dias restantes`;
  return <ScrollView style={common.page} contentContainerStyle={common.content}>
    <ScreenHeading title={lote.produto_nome} subtitle={lote.nome_lote} />
    {query.isError ? <RefreshNotice onRetry={() => void query.refetch()} /> : null}
    <View style={common.card}>
      <View style={common.row}><Text style={common.muted}>Situação</Text><NivelVencimentoBadge nivel={lote.nivel_vencimento} /></View>
      <Text style={{ color: colors.greenDark, fontSize: 28, fontWeight: '800', marginTop: 16 }}>{formatarData(validadeDoLote(lote))}</Text>
      <Text style={[common.body, { color: colors.muted, marginTop: 4 }]}>{prazo}</Text>
    </View>
    <View style={common.card}>
      <Text style={[common.heading, { marginBottom: 4 }]}>Estoque e custo</Text>
      <DetailRow label="Quantidade disponível" value={`${lote.quantidade} unidades`} />
      <DetailRow label="Custo por unidade" value={formatarMoeda(lote.custo_unitario_compra)} />
      <DetailRow label="Situação do estoque" value={lote.esgotado ? 'Esgotado' : 'Disponível'} />
    </View>
    <View style={common.card}>
      <Text style={[common.heading, { marginBottom: 4 }]}>Registro</Text>
      <DetailRow label="Código do lote" value={lote.nome_lote} />
      <DetailRow label="Data de cadastro" value={formatarData(lote.data_cadastro)} />
    </View>
    {podeEditarEstoque(perfil.data?.tipo_funcionario) ? <ActionButton label="Editar validade e custo" variant="secondary"
      onPress={() => navigation.navigate('LoteFormulario', { id: lote.id })} /> : null}
    {podeGerenciar(perfil.data?.tipo_funcionario) ? <ActionButton label="Excluir lote" variant="danger" onPress={excluir} /> : null}
    {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erro}</Text> : null}
    {perfil.data ? <MovimentacoesLote lote={lote} /> : null}
  </ScrollView>;
}
