import React, { act } from 'react';
import { AppState } from 'react-native';
import { create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { client } from '../src/api/client';
import { useNotificacoes } from '../src/hooks/useNotificacoes';
import { agendarAlertasCriticos } from '../src/utils/notifications';
import { getTokens } from '../src/utils/storage';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'standalone' },
  AppOwnership: { Expo: 'expo' },
}));
jest.mock('../src/utils/storage');
jest.mock('../src/utils/notifications', () => ({ agendarAlertasCriticos: jest.fn() }));

const api = new MockAdapter(client, { onNoMatch: 'throwException' });
const lote = { id: 1, produto_nome: 'Suco', nome_lote: 'SUCO-01', nivel_vencimento: 2 };
let app;
let consultas;
let mudarEstado;
let remover;
const ambienteAnterior = globalThis.IS_REACT_ACT_ENVIRONMENT;

function Sonda() {
  useNotificacoes();
  return null;
}

async function montar() {
  consultas = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await act(async () => {
    app = create(<QueryClientProvider client={consultas}><Sonda /></QueryClientProvider>);
  });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-19T12:00:00Z'));
  jest.clearAllMocks();
  api.reset();
  getTokens.mockResolvedValue(null);
  agendarAlertasCriticos.mockResolvedValue();
  remover = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((evento, callback) => {
    mudarEstado = callback;
    return { remove: remover };
  });
  api.onGet('lotes/alertas/').reply(200, [lote]);
});
afterEach(async () => {
  await act(async () => { app?.unmount(); });
  consultas?.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
});
afterAll(() => { api.restore(); globalThis.IS_REACT_ACT_ENVIRONMENT = ambienteAnterior; });

test('consulta a API e encaminha os lotes recebidos para o agendamento', async () => {
  await montar();
  expect(api.history.get.map(req => req.url)).toContain('lotes/alertas/');
  expect(agendarAlertasCriticos).toHaveBeenCalledWith([lote]);
});

test('atualiza alertas antigos ao retornar para o primeiro plano', async () => {
  await montar();
  const antes = api.history.get.length;
  jest.setSystemTime(new Date('2026-11-19T12:02:00Z'));
  await act(async () => { mudarEstado('background'); mudarEstado('active'); });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  expect(api.history.get.length).toBe(antes + 1);
});

test('não atualiza dados recentes e remove o observador ao desmontar', async () => {
  await montar();
  const antes = api.history.get.length;
  await act(async () => { mudarEstado('background'); mudarEstado('active'); });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
  expect(api.history.get.length).toBe(antes);
  await act(async () => { app.unmount(); });
  expect(remover).toHaveBeenCalled();
  app = undefined;
});

test('trata uma falha no agendamento sem interromper a consulta', async () => {
  agendarAlertasCriticos.mockRejectedValue(new Error('Permissão indisponível'));
  await montar();
  expect(consultas.getQueryData(['alertas'])).toEqual([lote]);
  expect(agendarAlertasCriticos).toHaveBeenCalledWith([lote]);
});
