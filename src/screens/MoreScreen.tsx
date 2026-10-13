import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { podeGerenciar, usePerfil } from '../hooks/usePerfil';
import type { MoreStackParams } from '../navigation/types';
import ScreenHeading from '../components/ScreenHeading';
import { colors, common, radius, spacing } from '../components/theme';

function MenuRow({ icon, title, description, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={({ pressed }) => [common.card, { flexDirection: 'row', alignItems: 'center', minHeight: 72, gap: spacing.md, backgroundColor: pressed ? colors.greenSoft : colors.white }]}>
    <View style={{ width: 44, height: 44, borderRadius: radius.input, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color={colors.greenDark} />
    </View>
    <View style={{ flex: 1 }}><Text style={common.heading}>{title}</Text><Text style={common.muted}>{description}</Text></View>
    <Ionicons name="chevron-forward" size={19} color={colors.muted} />
  </Pressable>;
}

export default function MoreScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParams>>();
  const { signOut } = useAuth();
  const perfil = usePerfil();
  const gerencia = podeGerenciar(perfil.data?.tipo_funcionario);
  return <ScrollView style={common.page} contentContainerStyle={common.content}>
    <ScreenHeading title="Mais" subtitle="Relatórios e opções da conta." />
    <Text style={[common.eyebrow, { marginBottom: spacing.md }]}>Análises</Text>
    {gerencia ? <>
      <MenuRow icon="stats-chart-outline" title="Relatórios" description="Prejuízo e lotes considerados" onPress={() => navigation.navigate('Relatorios')} />
      <MenuRow icon="pricetag-outline" title="Descontos" description="Sugestões para lotes em estoque" onPress={() => navigation.navigate('Descontos')} />
      <MenuRow icon="albums-outline" title="Categorias" description="Nomes e prazos de vencimento" onPress={() => navigation.navigate('Categorias')} />
      <MenuRow icon="trash-outline" title="Lixeira" description="Restaurar produtos, lotes e categorias" onPress={() => navigation.navigate('Lixeira')} />
    </> : null}
    <Text style={[common.eyebrow, { marginTop: spacing.md, marginBottom: spacing.md }]}>Conta</Text>
    <MenuRow icon="log-out-outline" title="Sair da conta" description="Encerrar esta sessão" onPress={() => void signOut()} />
  </ScrollView>;
}
