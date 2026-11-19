import React, { act } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { client } from '../../src/api/client';
import { getTokens } from '../../src/utils/storage';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('../../src/utils/storage');
jest.mock('../../src/hooks/useAuth', () => ({ useAuth: () => mockSessao }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavegacao,
  useRoute: () => ({ params: mockParametros }),
  useIsFocused: () => true,
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
}));
jest.mock('expo-camera', () => ({
  CameraView: props => require('react').createElement(require('react-native').View, props),
  useCameraPermissions: jest.fn(),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({
    uri: 'file:///cache/lotes.csv', create: jest.fn(), write: jest.fn(),
  })),
  Paths: { cache: 'file:///cache' },
}));

export const api = new MockAdapter(client, { onNoMatch: 'throwException' });
const mockNavegacao = {
  navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), popToTop: jest.fn(),
};
const mockSessao = { signIn: jest.fn(), signOut: jest.fn() };
export { mockNavegacao as navegacao, mockSessao as sessao };
export const categoria = { id: 1, nome: 'Bebidas', dias_atencao: 30, dias_critico: 7 };
export const produto = {
  id: 1, nome: 'Suco', categoria: 1, categoria_nome: 'Bebidas', preco_venda: '12.50',
  skus: [{ id: 1, produto: 1, codigo_barras: '7891234567895' }],
};
export const lote = {
  id: 1, produto: 1, produto_nome: 'Suco', nome_lote: 'SUCO-01', quantidade: 20,
  custo_unitario_compra: 8.75, nivel_vencimento: 2, esgotado: false,
  dias_vencido: null, tempo_vencimento: null, dias_critico: 7,
  data_cadastro: '2026-11-17T12:00:00Z', data_validade: '2026-11-20T12:00:00Z',
};
export const relatorio = {
  periodo: { data_inicio: '2026-11-01', data_fim: '2026-11-18' },
  prejuizo_total: 35, quantidade_lotes_considerados: 1,
  lotes_considerados: [{ ...lote, id: 2, produto_nome: 'Iogurte', quantidade: 10 }],
  quantidade_lotes_sem_custo_cadastrado: 0, lotes_sem_custo_cadastrado: [],
};
export let app;
export let consultas;
let mockParametros = {};
const actAnterior = globalThis.IS_REACT_ACT_ENVIRONMENT;
jest.setTimeout(20_000);

export function configurarPerfil(cargo = 'GERENTE') {
  api.onGet('usuarios/me/').reply(200, {
    id: 1, username: 'teste', tipo_funcionario: cargo, is_active: true,
  });
}

export function pagina(items, count = items.length) {
  return { count, next: null, previous: null, results: items };
}

export function texto(no) {
  return no.children.map(filho => typeof filho === 'string' ? filho : texto(filho)).join('');
}

function visivel(no) {
  for (let atual = no; atual; atual = atual.parent) {
    if (atual.props.accessibilityElementsHidden
      || atual.props.importantForAccessibility === 'no-hide-descendants'
      || StyleSheet.flatten(atual.props.style)?.display === 'none') return false;
  }
  return true;
}

export function temTexto(valor) {
  return app.root.findAll(no => no.type === 'Text' && visivel(no)).some(no =>
    typeof valor === 'string' ? texto(no) === valor : valor.test(texto(no)));
}

export async function aguardar(condicao) {
  for (let tentativa = 0; tentativa < 40 && !condicao(); tentativa += 1) {
    await act(async () => { await jest.advanceTimersByTimeAsync(25); });
  }
  expect(condicao()).toBeTruthy();
}

export async function aguardarTexto(valor) {
  await aguardar(() => temTexto(valor));
}

export async function montar(Componente, params = {}, props = {}) {
  mockParametros = params;
  consultas = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await act(async () => {
    app = create(<QueryClientProvider client={consultas}><Componente {...props} /></QueryClientProvider>);
  });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
}

export async function tocar(rotulo) {
  const botoes = app.root.findAll(no => typeof no.props.onPress === 'function'
    && visivel(no) && (no.props.accessibilityLabel === rotulo || texto(no) === rotulo));
  expect(botoes.length).toBeGreaterThan(0);
  expect(botoes[0].props.disabled).not.toBe(true);
  await act(async () => { await botoes[0].props.onPress(); });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
}

export async function preencher(rotulo, valor) {
  const input = app.root.findAll(no => no.type === 'TextInput'
    && no.props.accessibilityLabel === rotulo)[0];
  expect(input).toBeDefined();
  await act(async () => { input.props.onChangeText(valor); });
}

export async function data(rotulo, iso) {
  const [ano, mes, dia] = iso.split('-');
  await tocar(rotulo);
  await tocar(`Selecionar ${dia}/${mes}/${ano}`);
}

export async function confirmarExclusao() {
  const botoes = Alert.alert.mock.calls.at(-1)[2];
  expect(botoes.find(botao => botao.text === 'Cancelar')).toBeDefined();
  await act(async () => { botoes.find(botao => botao.text === 'Excluir').onPress(); });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-18T12:00:00Z'));
  jest.clearAllMocks();
  api.reset();
  mockParametros = {};
  getTokens.mockResolvedValue(null);
  mockSessao.signIn.mockResolvedValue();
  mockSessao.signOut.mockResolvedValue();
  require('expo-camera').useCameraPermissions.mockReturnValue([
    { granted: true, canAskAgain: true }, jest.fn(),
  ]);
  require('expo-sharing').isAvailableAsync.mockResolvedValue(true);
  require('expo-sharing').shareAsync.mockResolvedValue();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  configurarPerfil();
  api.onGet('categorias/').reply(200, pagina([categoria]));
  api.onGet('produtos/').reply(200, pagina([produto]));
  api.onGet('produtos/1/').reply(200, produto);
  api.onGet('lotes/1/').reply(200, lote);
  api.onGet('lotes/1/movimentos/').reply(200, []);
});
afterEach(async () => {
  await act(async () => { app?.unmount(); });
  consultas?.clear();
  app = undefined;
  consultas = undefined;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
afterAll(() => {
  api.restore();
  globalThis.IS_REACT_ACT_ENVIRONMENT = actAnterior;
});
