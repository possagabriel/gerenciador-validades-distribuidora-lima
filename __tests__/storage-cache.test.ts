import * as SecureStore from 'expo-secure-store';
import { clearTokens, getTokens, replaceTokensIfCurrent, setTokens } from '../src/utils/storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

test('reutiliza a sessão em memória e a atualiza após entrar ou sair', async () => {
  const read = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
  const write = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;
  const remove = SecureStore.deleteItemAsync as jest.MockedFunction<typeof SecureStore.deleteItemAsync>;
  read.mockResolvedValue(JSON.stringify({ access: 'antigo', refresh: 'refresh-antigo' }));
  write.mockResolvedValue();
  remove.mockResolvedValue();

  const initial = await Promise.all([getTokens(), getTokens()]);
  expect(initial).toEqual([
    { access: 'antigo', refresh: 'refresh-antigo' },
    { access: 'antigo', refresh: 'refresh-antigo' }
  ]);
  expect(read).toHaveBeenCalledTimes(1);

  await setTokens({ access: 'novo', refresh: 'refresh-novo' });
  expect(await getTokens()).toEqual({ access: 'novo', refresh: 'refresh-novo' });
  expect(read).toHaveBeenCalledTimes(1);

  expect(await replaceTokensIfCurrent('refresh-antigo', null)).toBe(false);
  expect(await getTokens()).toEqual({ access: 'novo', refresh: 'refresh-novo' });
  expect(await replaceTokensIfCurrent('refresh-novo', { access: 'renovado', refresh: 'refresh-renovado' })).toBe(true);
  expect(await getTokens()).toEqual({ access: 'renovado', refresh: 'refresh-renovado' });

  await clearTokens();
  expect(await getTokens()).toBeNull();
  expect(read).toHaveBeenCalledTimes(1);
});
