import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listarMovimentos, registrarMovimento, type TipoMovimento } from '../api/lotes';
import { mensagemErro } from '../api/errors';
import { usePerfil } from '../hooks/usePerfil';
import type { Lote } from '../types/lote';
import ActionButton from './ActionButton';
import { colors, common, radius, spacing } from './theme';

export default function MovimentacoesLote({ lote }: { lote: Lote }): React.JSX.Element {
  const queryClient = useQueryClient();
  const perfil = usePerfil();
  const historico = useQuery({ queryKey: ['movimentos', lote.id], queryFn: () => listarMovimentos(lote.id) });
  const [tipo, setTipo] = useState<TipoMovimento>('SAIDA');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const podeAjustar = perfil.data?.tipo_funcionario !== 'CAIXA' && Boolean(perfil.data);

  const salvar = async (tipoSelecionado = tipo, unidades = Number(quantidade), justificativa = motivo.trim()) => {
    if (!Number.isInteger(unidades) || unidades < (tipoSelecionado === 'AJUSTE' ? 0 : 1) || unidades > 999999999) { setErro('Informe uma quantidade válida.'); return; }
    if (justificativa.length < 3) { setErro('Informe o motivo com pelo menos 3 caracteres.'); return; }
    setSalvando(true); setErro('');
    try {
      const atualizado = await registrarMovimento(lote.id, { tipo: tipoSelecionado, quantidade: unidades, motivo: justificativa });
      queryClient.setQueryData(['lote', lote.id], atualizado);
      void queryClient.invalidateQueries({ queryKey: ['movimentos', lote.id] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      void queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setQuantidade(''); setMotivo('');
    } catch (error) { setErro(mensagemErro(error, 'Não foi possível registrar a movimentação.')); }
    finally { setSalvando(false); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={common.card}>
      <Text style={[common.heading, { marginBottom: spacing.md }]}>Movimentar estoque</Text>
      <View style={[common.row, { marginBottom: spacing.md, gap: 8 }]}>
        {(podeAjustar ? ['ENTRADA', 'SAIDA', 'AJUSTE'] as const : ['SAIDA'] as const).map(opcao =>
          <Pressable key={opcao} accessibilityRole="button" accessibilityState={{ selected: tipo === opcao }} onPress={() => setTipo(opcao)}
            style={{ padding: 10, borderWidth: 1, borderRadius: radius.pill, borderColor: tipo === opcao ? colors.green : colors.border }}>
            <Text style={{ color: colors.greenDark }}>{opcao === 'ENTRADA' ? 'Entrada' : opcao === 'SAIDA' ? 'Saída' : 'Correção'}</Text>
          </Pressable>)}
      </View>
      <Text style={common.muted}>{tipo === 'AJUSTE' ? 'Novo saldo *' : 'Quantidade *'}</Text>
      <TextInput accessibilityLabel={tipo === 'AJUSTE' ? 'Novo saldo' : 'Quantidade movimentada'} value={quantidade}
        onChangeText={value => setQuantidade(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={9} style={common.input} />
      <Text style={[common.muted, { marginTop: spacing.md }]}>Motivo *</Text>
      <TextInput accessibilityLabel="Motivo da movimentação" value={motivo} onChangeText={setMotivo} maxLength={255} style={common.input} />
      {erro ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 8 }}>{erro}</Text> : null}
      <View style={{ marginTop: spacing.md }}><ActionButton label="Registrar movimentação" onPress={() => void salvar()} loading={salvando} /></View>
      {podeAjustar && !lote.esgotado ? <Pressable accessibilityRole="button" onPress={() => void salvar('AJUSTE', 0, 'Lote esgotado após conferência')}
        style={{ paddingVertical: 14 }}><Text style={{ color: colors.danger }}>Marcar como esgotado</Text></Pressable> : null}
    </View>
    <View style={common.card}>
      <Text style={[common.heading, { marginBottom: spacing.sm }]}>Histórico</Text>
      {historico.isError ? <Text style={{ color: colors.danger }}>Não foi possível carregar o histórico.</Text> : null}
      {(historico.data ?? []).map(item => <View key={item.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={common.body}>{item.tipo} · {item.quantidade_antes} → {item.quantidade_depois}</Text>
        <Text style={common.muted}>{item.motivo} · {item.usuario_nome}</Text>
      </View>)}
      {historico.data?.length === 0 ? <Text style={common.muted}>Nenhuma movimentação registrada.</Text> : null}
    </View>
  </KeyboardAvoidingView>;
}
