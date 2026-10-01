import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, Text } from 'react-native';
import { useNotificacoes } from '../hooks/useNotificacoes';
import ProdutosListScreen from '../screens/ProdutosListScreen';
import ProdutoDetalheScreen from '../screens/ProdutoDetalheScreen';
import LotesListScreen from '../screens/LotesListScreen';
import LoteDetalheScreen from '../screens/LoteDetalheScreen';
import ScannerScreen from '../screens/ScannerScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import DescontosScreen from '../screens/DescontosScreen';
import type { LotesStackParams, ProductsStackParams, TabsParams } from './types';

const Tabs = createBottomTabNavigator<TabsParams>();
const Products = createNativeStackNavigator<ProductsStackParams>();
const Lots = createNativeStackNavigator<LotesStackParams>();

function ProductsNavigator(): React.JSX.Element {
  return <Products.Navigator screenOptions={{ headerTintColor: '#156053' }}>
    <Products.Screen name="ProdutosLista" component={ProdutosListScreen} options={({ navigation }) => ({ title: 'Produtos', headerRight: () => <Pressable onPress={() => navigation.navigate('Dashboard')}><Text style={{ color: '#156053' }}>Resumo</Text></Pressable> })} />
    <Products.Screen name="ProdutoDetalhe" component={ProdutoDetalheScreen} options={{ title: 'Produto' }} />
    <Products.Screen name="SkuLotes" component={LotesListScreen} options={{ title: 'Lotes do produto' }} />
    <Products.Screen name="LoteDetalhe" component={LoteDetalheScreen} options={{ title: 'Lote' }} />
    <Products.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Ler código de barras' }} />
    <Products.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Resumo' }} />
  </Products.Navigator>;
}

function LotesNavigator(): React.JSX.Element {
  return <Lots.Navigator screenOptions={{ headerTintColor: '#156053' }}>
    <Lots.Screen name="LotesLista" component={LotesListScreen} options={{ title: 'Lotes' }} />
    <Lots.Screen name="LoteDetalhe" component={LoteDetalheScreen} options={{ title: 'Lote' }} />
  </Lots.Navigator>;
}

export default function AppTabs(): React.JSX.Element {
  useNotificacoes();
  return <Tabs.Navigator screenOptions={{ tabBarActiveTintColor: '#156053', headerShown: false }}>
    <Tabs.Screen name="Produtos" component={ProductsNavigator} options={{ tabBarIcon: () => <Text>📦</Text> }} />
    <Tabs.Screen name="Lotes" component={LotesNavigator} options={{ tabBarIcon: () => <Text>📅</Text> }} />
    <Tabs.Screen name="Relatorios" component={RelatoriosScreen} options={{ title: 'Relatórios', headerShown: true, tabBarIcon: () => <Text>📊</Text> }} />
    <Tabs.Screen name="Descontos" component={DescontosScreen} options={{ headerShown: true, tabBarIcon: () => <Text>🏷️</Text> }} />
  </Tabs.Navigator>;
}
