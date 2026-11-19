import React, { act } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { create } from 'react-test-renderer';
import { client } from '../src/api/client';
import AppTabs from '../src/navigation/AppTabs';
import LotesListScreen from '../src/screens/LotesListScreen';
import { getTokens } from '../src/utils/storage';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/hooks/useNotificacoes', () => ({ useNotificacoes: jest.fn() }));
jest.mock('../src/utils/storage');

enableScreens(false);
// A primeira montagem carrega o navegador instrumentado em uma execução sem cache.
jest.setTimeout(20_000);

const api = new MockAdapter(client, { onNoMatch: 'throwException' });
const loteCritico = {
  id: 1, produto: 1, produto_nome: 'Suco', nome_lote: 'SUCO-01',
  quantidade: 20, custo_unitario_compra: 8.75, nivel_vencimento: 2,
  esgotado: false, dias_vencido: null, tempo_vencimento: null,
  data_cadastro: '2026-11-17T12:00:00Z', data_validade: '2026-11-19T12:00:00Z',
};
const loteVencido = {
  ...loteCritico, id: 2, produto: 2, produto_nome: 'Iogurte', nome_lote: 'IOGURTE-02',
  quantidade: 10, custo_unitario_compra: 3.5, nivel_vencimento: 3, dias_vencido: 6,
  data_validade: '2026-11-11T12:00:00Z',
};
const lotes = [loteCritico, loteVencido];
const relatorio = {
  periodo: { data_inicio: '2026-10-18', data_fim: '2026-11-17' },
  prejuizo_total: 35, quantidade_lotes_considerados: 1,
  lotes_considerados: [loteVencido], quantidade_lotes_sem_custo_cadastrado: 0,
  lotes_sem_custo_cadastrado: [],
};

let app;
let queryClient;
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

function textoDo(no) {
  return no.children.map(filho => typeof filho === 'string' ? filho : textoDo(filho)).join('');
}

function visivel(no) {
  for (let atual = no; atual; atual = atual.parent) {
    const { accessibilityElementsHidden, importantForAccessibility, style } = atual.props;
    if (accessibilityElementsHidden || importantForAccessibility === 'no-hide-descendants'
      || StyleSheet.flatten(style)?.display === 'none') return false;
  }
  return true;
}

function textoPresente(procurado, tela = app.root) {
  return tela.findAll(no => no.type === 'Text' && visivel(no)).some(no => {
    const texto = textoDo(no);
    return typeof procurado === 'string' ? texto === procurado : procurado.test(texto);
  });
}

async function aguardarTexto(procurado) {
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    if (textoPresente(procurado)) return;
    await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  }
  expect(textoPresente(procurado)).toBe(true);
}

async function pressionar(rotulo) {
  const botoes = app.root.findAll(no => typeof no.props.onPress === 'function'
    && visivel(no) && (no.props.accessibilityLabel === rotulo || textoDo(no) === rotulo));
  expect(botoes.length).toBeGreaterThan(0);
  await act(async () => { botoes[0].props.onPress(); });
}

function responderPrioridade() {
  api.onGet('lotes/prioridade/').reply(200, { count: lotes.length, results: lotes });
}

function responderLista() {
  api.onGet('lotes/', { params: { page: 1 } }).reply(200, {
    count: lotes.length, next: null, previous: null, results: lotes,
  });
}

async function abrirApp(cargo = 'CAIXA') {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  api.onGet('usuarios/me/').reply(200, {
    id: 1, username: 'operador-teste', first_name: '', last_name: '', cpf: '',
    tipo_funcionario: cargo, is_active: true,
  });
  await act(async () => {
    app = create(
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <AppTabs />
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  });
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });

beforeEach(() => {
  jest.useFakeTimers();
  api.reset();
  getTokens.mockResolvedValue(null);
  api.onGet('lotes/relatorio-prejuizo/').reply(200, relatorio);
});

afterEach(async () => {
  await act(async () => { app?.unmount(); });
  queryClient?.clear();
  app = undefined;
  queryClient = undefined;
  jest.useRealTimers();
});

afterAll(() => {
  api.restore();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

test('mostra lotes prioritários e abre a lista pelo botão da tela inicial', async () => {
  responderPrioridade();
  responderLista();
  await abrirApp();

  expect(textoPresente('Visão geral')).toBe(true);
  await aguardarTexto('Suco');
  expect(textoPresente('Iogurte')).toBe(true);
  await pressionar('Ver lotes');
  await aguardarTexto('2 lotes nesta lista');
});

test('consulta o nível crítico e deixa de exibir o lote vencido ao aplicar o filtro', async () => {
  responderPrioridade();
  responderLista();
  api.onGet('lotes/', { params: { nivel_vencimento: 2, page: 1 } }).reply(200, {
    count: 1, next: null, previous: null, results: [loteCritico],
  });
  await abrirApp();

  await pressionar('Ver lotes');
  await aguardarTexto('2 lotes nesta lista');
  expect(textoPresente('Iogurte')).toBe(true);
  await pressionar('Crítico');
  await aguardarTexto('1 lote nesta lista');

  const telaLotes = app.root.findByType(LotesListScreen);
  expect(textoPresente('Suco', telaLotes)).toBe(true);
  expect(textoPresente('Iogurte', telaLotes)).toBe(false);
  expect(api.history.get).toContainEqual(expect.objectContaining({
    url: 'lotes/', params: { nivel_vencimento: 2, page: 1 },
  }));
});

test('mostra o preço original e o sugerido e filtra as sugestões por categoria', async () => {
  api.onGet('lotes/prioridade/').reply(200, { count: 0, results: [] });
  api.onGet('lotes/sugestoes-desconto/').reply(200, {
    quantidade: 2,
    sugestoes: [
      { lote_id: 1, nome_lote: 'SUCO-01', quantidade: 20, produto: 'Suco', categoria: 'Bebidas',
        preco_venda: 12.5, custo_unitario_compra: 8.75, percentual_desconto: 25,
        preco_sugerido: 9.38, abaixo_do_custo: false },
      { lote_id: 3, nome_lote: 'PAO-03', quantidade: 4, produto: 'Pão integral', categoria: 'Padaria',
        preco_venda: 8, custo_unitario_compra: 5, percentual_desconto: 25,
        preco_sugerido: 6, abaixo_do_custo: false },
    ],
  });
  await abrirApp('GERENTE');

  await aguardarTexto('Descontos');
  await pressionar('Descontos');
  await aguardarTexto('Suco');
  expect(textoPresente(/R\$\s*12,50/)).toBe(true);
  expect(textoPresente(/R\$\s*9,38/)).toBe(true);
  expect(textoPresente('Pão integral')).toBe(true);

  await pressionar('Bebidas');
  expect(textoPresente('Suco')).toBe(true);
  expect(textoPresente('Pão integral')).toBe(false);
});

test('não exibe a aba Descontos para o perfil Caixa após consultar o perfil', async () => {
  api.onGet('lotes/prioridade/').reply(200, { count: 0, results: [] });
  await abrirApp();

  await aguardarTexto('Nenhum lote urgente');
  expect(queryClient.getQueryData(['perfil'])).toMatchObject({ tipo_funcionario: 'CAIXA' });
  expect(textoPresente('Descontos')).toBe(false);
});

test('permite repetir a consulta de lotes prioritários após falha da API', async () => {
  api.onGet('lotes/prioridade/').replyOnce(503);
  responderPrioridade();
  await abrirApp();

  await aguardarTexto('Não foi possível carregar os lotes urgentes.');
  await pressionar('Tentar novamente');
  await aguardarTexto('Suco');
  expect(textoPresente('Não foi possível carregar os lotes urgentes.')).toBe(false);
});
