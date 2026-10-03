import MockAdapter from 'axios-mock-adapter';
import { client, publicClient, renewSession, subscribeSession } from '../src/api/client';
import { restoreSession } from '../src/api/auth';
import { clearTokens, getTokens, replaceTokensIfCurrent, setTokens, tokenExpired, type Tokens } from '../src/utils/storage';

jest.mock('../src/utils/storage');
const getTokensMock = getTokens as jest.MockedFunction<typeof getTokens>;
const setTokensMock = setTokens as jest.MockedFunction<typeof setTokens>;
const clearTokensMock = clearTokens as jest.MockedFunction<typeof clearTokens>;
const replaceTokensMock = replaceTokensIfCurrent as jest.MockedFunction<typeof replaceTokensIfCurrent>;
const expiredMock = tokenExpired as jest.MockedFunction<typeof tokenExpired>;

const api = new MockAdapter(client);
const publicApi = new MockAdapter(publicClient);
let tokens: Tokens | null;

beforeEach(() => {
  jest.clearAllMocks();
  api.reset(); publicApi.reset();
  tokens = { access: 'old-access', refresh: 'old-refresh' };
  getTokensMock.mockImplementation(async () => tokens);
  setTokensMock.mockImplementation(async next => { tokens = next; });
  clearTokensMock.mockImplementation(async () => { tokens = null; });
  replaceTokensMock.mockImplementation(async (expected, next) => {
    if (tokens?.refresh !== expected) return false;
    tokens = next;
    return true;
  });
  expiredMock.mockReturnValue(false);
});

test('401 renova, salva refresh rotacionado e repete GET com novo Bearer', async () => {
  let attempts = 0;
  api.onGet('produtos/').reply(config => {
    attempts += 1;
    return attempts === 1 ? [401, {}] : [200, { auth: config.headers?.Authorization }];
  });
  publicApi.onPost('token/refresh/').reply(200, { access: 'new-access', refresh: 'new-refresh' });
  const response = await client.get<{ auth: string }>('produtos/');
  expect(response.data.auth).toBe('Bearer new-access');
  expect(tokens).toEqual({ access: 'new-access', refresh: 'new-refresh' });
  expect(attempts).toBe(2);
});

test('refresh vencido limpa sessão e emite evento', async () => {
  expiredMock.mockReturnValue(true);
  const listener = jest.fn();
  const unsubscribe = subscribeSession(listener);
  await expect(renewSession()).rejects.toThrow('Sessão expirada');
  expect(tokens).toBeNull();
  expect(replaceTokensMock).toHaveBeenCalledWith('old-refresh', null);
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});

test('falha de rede na renovação mantém a sessão para nova tentativa', async () => {
  expiredMock.mockImplementation(token => token === 'old-access');
  publicApi.onPost('token/refresh/').networkError();
  expect(await restoreSession()).toBe(true);
  expect(tokens).toEqual({ access: 'old-access', refresh: 'old-refresh' });
  expect(replaceTokensMock).not.toHaveBeenCalled();
});

test('erro temporário do servidor não apaga as credenciais', async () => {
  publicApi.onPost('token/refresh/').reply(503);
  await expect(renewSession()).rejects.toMatchObject({ response: { status: 503 } });
  expect(tokens).toEqual({ access: 'old-access', refresh: 'old-refresh' });
  expect(replaceTokensMock).not.toHaveBeenCalled();
});

test('refresh recusado pela API encerra somente a sessão atual', async () => {
  publicApi.onPost('token/refresh/').reply(401, { detail: 'Token inválido' });
  await expect(renewSession()).rejects.toMatchObject({ response: { status: 401 } });
  expect(tokens).toBeNull();
});

test('renovação pendente não restaura sessão após logout', async () => {
  let requestStarted!: () => void;
  let finishRequest!: (value: [number, object]) => void;
  const started = new Promise<void>(resolve => { requestStarted = resolve; });
  const response = new Promise<[number, object]>(resolve => { finishRequest = resolve; });
  publicApi.onPost('token/refresh/').reply(() => { requestStarted(); return response; });

  const pending = renewSession();
  await started;
  tokens = null;
  finishRequest([200, { access: 'novo', refresh: 'refresh-novo' }]);
  await expect(pending).rejects.toThrow('Sessão alterada');
  expect(tokens).toBeNull();
});
