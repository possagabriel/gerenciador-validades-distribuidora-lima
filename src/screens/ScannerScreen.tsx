import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProdutoPorCodigo } from '../hooks/useProdutos';
import { podeEditarEstoque, usePerfil } from '../hooks/usePerfil';
import type { ProductsStackParams } from '../navigation/types';
import ActionButton from '../components/ActionButton';
import CodeCamera from '../components/CodeCamera';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common } from '../components/theme';

export default function ScannerScreen(): React.JSX.Element {
  const [codigo, setCodigo] = useState<string | null>(null);
  const query = useProdutoPorCodigo(codigo);
  const perfil = usePerfil();
  const focused = useIsFocused();
  const navigation = useNavigation<NativeStackNavigationProp<ProductsStackParams>>();

  useEffect(() => {
    if (query.data) navigation.replace('ProdutoDetalhe', { id: query.data.id });
  }, [query.data, navigation]);

  const scanAgain = () => setCodigo(null);
  return <View style={[common.page, { paddingBottom: 20 }]}>
    <ScreenHeading title="Ler QR ou código" subtitle="Centralize o código na câmera para encontrar um produto." />
    {!codigo ? focused ? <CodeCamera style={{ flex: 1 }} onCode={setCodigo} /> : null : <View style={{ flex: 1 }}>
      <Text style={[common.muted, { marginBottom: 12 }]}>Código lido: {codigo}</Text>
      {query.isLoading ? <LoadingState label="Buscando produto…" /> : query.isError ?
        <ErrorState onRetry={() => void query.refetch()} /> : !query.data ?
          <EmptyState icon="search-outline" title="Produto não encontrado" description="Esse QR ou código ainda não está associado a um produto."
            actionLabel={podeEditarEstoque(perfil.data?.tipo_funcionario) ? 'Cadastrar produto com este código' : undefined}
            onAction={podeEditarEstoque(perfil.data?.tipo_funcionario) ? () => navigation.navigate('AdicionarProduto', { codigoInicial: codigo }) : undefined} /> : null}
    </View>}
    <Text style={[common.muted, { textAlign: 'center', marginTop: 14, marginBottom: 10 }]}>
      {codigo ? 'Você pode tentar outro código.' : 'A leitura acontece automaticamente.'}
    </Text>
    {codigo ? <ActionButton label="Ler outro código" variant="secondary" onPress={scanAgain} /> : null}
  </View>;
}
