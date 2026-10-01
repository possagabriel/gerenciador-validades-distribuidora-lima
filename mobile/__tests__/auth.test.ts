import MockAdapter from 'axios-mock-adapter';
import { client, publicClient, renewSession, subscribeSession } from '../src/api/client';
import { clearTokens, getTokens, setTokens, tokenExpired, type Tokens } from '../src/utils/storage';

jest.mock('../src/utils/storage');
const getTokensMock = getTokens as jest.MockedFunction<typeof getTokens>;
const setTokensMock = setTokens as jest.MockedFunction<typeof setTokens>;
const clearTokensMock = clearTokens as jest.MockedFunction<typeof clearTokens>;
const expiredMock = tokenExpired as jest.MockedFunction<typeof tokenExpired>;

const api = new MockAdapter(client);
const publicApi = new MockAdapter(publicClient);
let tokens: Tokens | null;

beforeEach(() => {
  api.reset(); publicApi.reset();
  tokens = { access: 'old-access', refresh: 'old-refresh' };
  getTokensMock.mockImplementation(async () => tokens);
  setTokensMock.mockImplementation(async next => { tokens = next; });
  clearTokensMock.mockImplementation(async () => { tokens = null; });
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
  expect(clearTokensMock).toHaveBeenCalled();
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});
