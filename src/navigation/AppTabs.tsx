import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificacoes } from '../hooks/useNotificacoes';
import ProdutosListScreen from '../screens/ProdutosListScreen';
import ProdutoDetalheScreen from '../screens/ProdutoDetalheScreen';
import LotesListScreen from '../screens/LotesListScreen';
import LoteDetalheScreen from '../screens/LoteDetalheScreen';
import LoteFormularioScreen from '../screens/LoteFormularioScreen';
import CategoriasScreen from '../screens/CategoriasScreen';
import LixeiraScreen from '../screens/LixeiraScreen';
import ScannerScreen from '../screens/ScannerScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import DescontosScreen from '../screens/DescontosScreen';
import AdicionarProdutoScreen from '../screens/AdicionarProdutoScreen';
import EditarProdutoScreen from '../screens/EditarProdutoScreen';
import MoreScreen from '../screens/MoreScreen';
import type { LotesStackParams, MoreStackParams, ProductsStackParams, TabsParams } from './types';
import { colors, type } from '../components/theme';

const Tabs = createBottomTabNavigator<TabsParams>();
const Products = createNativeStackNavigator<ProductsStackParams>();
const Lots = createNativeStackNavigator<LotesStackParams>();
const More = createNativeStackNavigator<MoreStackParams>();

const stackOptions = {
  headerTintColor: colors.greenDark,
  headerStyle: { backgroundColor: colors.white },
  headerTitleStyle: { fontWeight: '700' as const, fontSize: type.section },
  contentStyle: { backgroundColor: colors.background }
};

function HeaderAction({ name, label, onPress }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
    <Ionicons name={name} size={24} color={colors.greenDark} />
  </Pressable>;
}

function ProductsNavigator(): React.JSX.Element {
  return <Products.Navigator screenOptions={stackOptions}>
    <Products.Screen name="ProdutosLista" component={ProdutosListScreen} options={({ navigation }) => ({ title: 'Distribuidora Lima', headerRight: () => <HeaderAction name="barcode-outline" label="Ler código de barras" onPress={() => navigation.navigate('Scanner')} /> })} />
    <Products.Screen name="AdicionarProduto" component={AdicionarProdutoScreen} options={{ title: 'Novo produto' }} />
    <Products.Screen name="ProdutoDetalhe" component={ProdutoDetalheScreen} options={{ title: 'Produto' }} />
    <Products.Screen name="EditarProduto" component={EditarProdutoScreen} options={{ title: 'Editar produto' }} />
    <Products.Screen name="SkuLotes" component={LotesListScreen} options={{ title: 'Lotes do produto' }} />
    <Products.Screen name="LoteDetalhe" component={LoteDetalheScreen} options={{ title: 'Lote' }} />
    <Products.Screen name="LoteFormulario" component={LoteFormularioScreen} options={{ title: 'Salvar lote' }} />
    <Products.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Ler código' }} />
  </Products.Navigator>;
}

function LotesNavigator(): React.JSX.Element {
  return <Lots.Navigator screenOptions={stackOptions}>
    <Lots.Screen name="LotesLista" component={LotesListScreen} options={{ title: 'Distribuidora Lima' }} />
    <Lots.Screen name="LoteDetalhe" component={LoteDetalheScreen} options={{ title: 'Lote' }} />
    <Lots.Screen name="LoteFormulario" component={LoteFormularioScreen} options={{ title: 'Salvar lote' }} />
  </Lots.Navigator>;
}

function MoreNavigator(): React.JSX.Element {
  return <More.Navigator screenOptions={stackOptions}>
    <More.Screen name="MaisMenu" component={MoreScreen} options={{ title: 'Distribuidora Lima' }} />
    <More.Screen name="Relatorios" component={RelatoriosScreen} options={{ title: 'Relatórios' }} />
    <More.Screen name="Descontos" component={DescontosScreen} options={{ title: 'Descontos' }} />
    <More.Screen name="Categorias" component={CategoriasScreen} options={{ title: 'Categorias' }} />
    <More.Screen name="Lixeira" component={LixeiraScreen} options={{ title: 'Lixeira' }} />
  </More.Navigator>;
}

export default function AppTabs(): React.JSX.Element {
  useNotificacoes();
  const insets = useSafeAreaInsets();
  return <Tabs.Navigator screenOptions={{
    headerShown: false, tabBarActiveTintColor: colors.greenDark, tabBarInactiveTintColor: colors.muted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: { height: 66 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(6, insets.bottom), borderTopColor: colors.border, backgroundColor: colors.white },
    tabBarLabelStyle: { fontSize: type.caption, fontWeight: '700' }, tabBarItemStyle: { minHeight: 48 },
    tabBarIconStyle: { marginBottom: 1 }
  }}>
    <Tabs.Screen name="Inicio" component={DashboardScreen} options={{ title: 'Distribuidora Lima', headerShown: true, headerStyle: { backgroundColor: colors.white }, headerTitleStyle: { color: colors.greenDark, fontSize: type.section, fontWeight: '700' }, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} /> }} />
    <Tabs.Screen name="Produtos" component={ProductsNavigator} options={{ tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'cube' : 'cube-outline'} size={23} color={color} /> }} />
    <Tabs.Screen name="Lotes" component={LotesNavigator} options={{ tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={23} color={color} /> }} />
    <Tabs.Screen name="Mais" component={MoreNavigator} options={{ tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'menu' : 'menu-outline'} size={23} color={color} /> }} />
  </Tabs.Navigator>;
}
