import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { atualizarCategoria, criarCategoria, excluirCategoria, listarCategorias } from '../api/produtos';
import { mensagemErro } from '../api/errors';
import { podeGerenciar, usePerfil } from '../hooks/usePerfil';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import type { Categoria } from '../types/categoria';
import ActionButton from '../components/ActionButton';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, spacing } from '../components/theme';

export default function CategoriasScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });
  const perfil = usePerfil();
  const autorizado = podeGerenciar(perfil.data?.tipo_funcionario);
  const [editando, setEditando] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [atencao, setAtencao] = useState('30');
  const [critico, setCritico] = useState('7');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const selecionar = (categoria?: Categoria) => {
    setEditando(categoria?.id ?? null);
    setNome(categoria?.nome ?? '');
    setAtencao(String(categoria?.dias_atencao ?? 30));
    setCritico(String(categoria?.dias_critico ?? 7));
    setErros({});
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const salvar = async () => {
    const valores = { nome: nome.trim(), dias_atencao: Number(atencao), dias_critico: Number(critico) };
    const novosErros: Record<string, string> = {};
    if (!valores.nome) novosErros.nome = 'Informe o nome.';
    if (!Number.isInteger(valores.dias_atencao) || valores.dias_atencao <= 0) novosErros.atencao = 'Informe dias de atenção maiores que zero.';
    if (!Number.isInteger(valores.dias_critico) || valores.dias_critico < 0 || valores.dias_critico >= valores.dias_atencao) novosErros.critico = 'O prazo crítico deve ser menor que o de atenção.';
    if (Object.keys(novosErros).length) { setErros(novosErros); scrollRef.current?.scrollTo({ y: 0, animated: true }); return; }
    setSalvando(true); setErros({});
    try {
      if (editando) await atualizarCategoria(editando, valores);
      else await criarCategoria(valores.nome, valores.dias_atencao, valores.dias_critico);
      await queryClient.invalidateQueries({ queryKey: ['categorias'] });
      void queryClient.invalidateQueries({ queryKey: ['lotes'] });
      void queryClient.invalidateQueries({ queryKey: ['prioridade'] });
      void queryClient.invalidateQueries({ queryKey: ['alertas'] });
      selecionar();
    } catch (error) { setErros({ geral: mensagemErro(error, 'Não foi possível salvar a categoria.') }); }
    finally { setSalvando(false); }
  };

  const excluir = (categoria: Categoria) => Alert.alert('Excluir categoria?', `Excluir ${categoria.nome}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => { void (async () => {
      try { await excluirCategoria(categoria.id); await queryClient.invalidateQueries({ queryKey: ['categorias'] }); if (editando === categoria.id) selecionar(); }
      catch (error) { setErros({ geral: mensagemErro(error, 'Não foi possível excluir a categoria.') }); }
    })(); } }
  ]);

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={common.page} contentContainerStyle={common.content} keyboardShouldPersistTaps="handled">
      <ScreenHeading title="Categorias" subtitle="Defina os prazos de atenção e crítico." />
      {autorizado ? <View style={common.card}>
        <Text style={[common.heading, { marginBottom: spacing.md }]}>{editando ? 'Editar categoria' : 'Nova categoria'}</Text>
        <Text style={common.muted}>Nome *</Text>
        <TextInput accessibilityLabel="Nome da categoria" value={nome} onChangeText={setNome} onFocus={onInputFocus} maxLength={100} style={common.input} />
        {erros.nome ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.nome}</Text> : null}
        <Text style={[common.muted, { marginTop: spacing.md }]}>Dias para atenção *</Text>
        <TextInput accessibilityLabel="Dias para atenção" value={atencao} onChangeText={setAtencao} onFocus={onInputFocus} keyboardType="number-pad" style={common.input} />
        {erros.atencao ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.atencao}</Text> : null}
        <Text style={[common.muted, { marginTop: spacing.md }]}>Dias para crítico *</Text>
        <TextInput accessibilityLabel="Dias para crítico" value={critico} onChangeText={setCritico} onFocus={onInputFocus} keyboardType="number-pad" style={common.input} />
        {erros.critico ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{erros.critico}</Text> : null}
        <View style={{ marginTop: spacing.md }}><ActionButton label={editando ? 'Salvar alterações' : 'Criar categoria'} onPress={() => void salvar()} loading={salvando} /></View>
        {editando ? <Pressable accessibilityRole="button" onPress={() => selecionar()} style={{ paddingVertical: 14 }}><Text style={{ color: colors.greenDark }}>Cancelar edição</Text></Pressable> : null}
      </View> : null}
      {erros.geral ? <Text accessibilityRole="alert" style={{ color: colors.danger, marginBottom: spacing.md }}>{erros.geral}</Text> : null}
      {categorias.isError ? <ErrorState message="Não foi possível carregar as categorias." onRetry={() => void categorias.refetch()} /> :
        (categorias.data ?? []).map(categoria => <View key={categoria.id} style={common.card}>
          <Text style={common.heading}>{categoria.nome}</Text>
          <Text style={common.muted}>Atenção: {categoria.dias_atencao} dias · Crítico: {categoria.dias_critico} dias</Text>
          {autorizado ? <View style={[common.row, { marginTop: 12 }]}>
            <Pressable accessibilityRole="button" onPress={() => selecionar(categoria)} style={{ padding: 10 }}><Text style={{ color: colors.greenDark }}>Editar</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => excluir(categoria)} style={{ padding: 10 }}><Text style={{ color: colors.danger }}>Excluir</Text></Pressable>
          </View> : null}
        </View>)}
    </ScrollView>
  </KeyboardAvoidingView>;
}
