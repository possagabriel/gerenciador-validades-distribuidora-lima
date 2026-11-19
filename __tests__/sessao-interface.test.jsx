import React, { act } from 'react';
import { AppState, Text } from 'react-native';
import { create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { emitSessionChange, publicClient } from '../src/api/client';
import { getTokens, setTokens, clearTokens, tokenExpired } from '../src/utils/storage';
import RootNavigator from '../src/navigation/RootNavigator';
import App from '../src/App';

jest.mock('../src/utils/storage');
jest.mock('../src/utils/notifications', () => ({ cancelarAlertasCriticos: jest.fn().mockResolvedValue() }));
jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/navigation/AppTabs', () => () =>
  require('react').createElement(require('react-native').Text, {}, 'Área autenticada'));
jest.mock('../src/navigation/AuthStack', () => () =>
  require('react').createElement(require('react-native').Text, {}, 'Área de login'));

const api = new MockAdapter(publicClient, { onNoMatch: 'throwException' });
let tokens;
let auth;
let app;
let consultas;
let estadoApp;
let removerEstado;
const actAnterior = globalThis.IS_REACT_ACT_ENVIRONMENT;

function Sonda() {
  auth = useAuth();
  return <Text>{auth.loading ? 'Carregando' : auth.authenticated ? 'Autenticado' : 'Desconectado'}</Text>;
}

async function montar(elemento) {
  consultas = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await act(async () => {
    app = create(<QueryClientProvider client={consultas}><AuthProvider>{elemento ?? <Sonda />}</AuthProvider></QueryClientProvider>);
  });
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  api.reset();
  tokens = { access: 'access-valido', refresh: 'refresh-valido' };
  getTokens.mockImplementation(async () => tokens);
  setTokens.mockImplementation(async proximo => { tokens = proximo; });
  clearTokens.mockImplementation(async () => { tokens = null; });
  tokenExpired.mockReturnValue(false);
  removerEstado = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((evento, callback) => {
    estadoApp = callback;
    return { remove: removerEstado };
  });
});
afterEach(async () => {
  await act(async () => { app?.unmount(); });
  consultas?.clear();
  app = undefined;
  auth = undefined;
  jest.restoreAllMocks();
  jest.useRealTimers();
});
afterAll(() => { api.restore(); globalThis.IS_REACT_ACT_ENVIRONMENT = actAnterior; });

test('restaura uma sessão válida ao montar o provedor', async () => {
  await montar();
  expect(auth).toMatchObject({ authenticated: true, loading: false });
});

test('ausência de sessão limpa as consultas e termina a restauração', async () => {
  tokens = null;
  await montar();
  expect(auth).toMatchObject({ authenticated: false, loading: false });
});

test('erro de leitura de credenciais encerra o estado de carregamento', async () => {
  getTokens.mockRejectedValue(new Error('Armazenamento indisponível'));
  await montar();
  expect(auth).toMatchObject({ authenticated: false, loading: false });
});

test('login salva as credenciais, atualiza a sessão e limpa dados da conta anterior', async () => {
  tokens = null;
  api.onPost('token/').reply(200, { access: 'nova-sessao', refresh: 'novo-refresh' });
  await montar();
  consultas.setQueryData(['dado-da-outra-conta'], 'restrito');
  await act(async () => { await auth.signIn('operador', 'senha'); });
  expect(JSON.parse(api.history.post[0].data)).toEqual({ username: 'operador', password: 'senha' });
  expect(setTokens).toHaveBeenCalledWith({ access: 'nova-sessao', refresh: 'novo-refresh' });
  expect(consultas.getQueryData(['dado-da-outra-conta'])).toBeUndefined();
  expect(auth.authenticated).toBe(true);
});

test('logout apaga credenciais e dados consultados', async () => {
  await montar();
  consultas.setQueryData(['privado'], 'estoque');
  await act(async () => { await auth.signOut(); });
  expect(clearTokens).toHaveBeenCalledTimes(1);
  expect(consultas.getQueryData(['privado'])).toBeUndefined();
  expect(auth.authenticated).toBe(false);
});

test('retorno ao primeiro plano e evento de sessão revalidam autenticação', async () => {
  await montar();
  tokens = null;
  await act(async () => { estadoApp('background'); });
  expect(auth.authenticated).toBe(true);
  await act(async () => { estadoApp('active'); });
  expect(auth.authenticated).toBe(false);
  tokens = { access: 'access', refresh: 'refresh' };
  await act(async () => { emitSessionChange(); });
  expect(auth.authenticated).toBe(true);
});

test('uma restauração antiga não substitui a sessão mais recente', async () => {
  let concluir;
  getTokens.mockImplementationOnce(() => new Promise(resolve => { concluir = resolve; }));
  await montar();
  expect(auth.loading).toBe(true);
  tokens = null;
  await act(async () => { emitSessionChange(); });
  expect(auth.authenticated).toBe(false);
  await act(async () => { concluir({ access: 'antigo', refresh: 'antigo' }); });
  expect(auth.authenticated).toBe(false);
});

test('remove assinatura e intervalo de sessão ao desmontar', async () => {
  await montar();
  await act(async () => { app.unmount(); });
  expect(removerEstado).toHaveBeenCalledTimes(1);
  const leituras = getTokens.mock.calls.length;
  await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
  expect(getTokens).toHaveBeenCalledTimes(leituras);
  app = undefined;
});

test('navegador raiz apresenta login e cancela alertas quando a sessão termina', async () => {
  tokens = null;
  await montar(<RootNavigator />);
  expect(JSON.stringify(app.toJSON())).toContain('Área de login');
  expect(require('../src/utils/notifications').cancelarAlertasCriticos).toHaveBeenCalled();
});

test('entrada principal do aplicativo restaura a sessão e abre área autenticada', async () => {
  await act(async () => { app = create(<App />); });
  expect(JSON.stringify(app.toJSON())).toContain('Área autenticada');
});
