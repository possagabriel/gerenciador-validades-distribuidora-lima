import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { getTokens, replaceTokensIfCurrent, tokenExpired, type Tokens } from '../utils/storage';

const configuredUrl = Constants.expoConfig?.extra?.apiBaseUrl;
export const baseURL = typeof configuredUrl === 'string' ? `${configuredUrl.replace(/\/+$/, '')}/api/` : '/api/';
export const publicClient = axios.create({ baseURL, timeout: 15000 });
export const client = axios.create({ baseURL, timeout: 15000 });

type SessionListener = () => void;
const listeners = new Set<SessionListener>();
export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function emitSessionChange(): void { listeners.forEach(listener => listener()); }

let refreshPromise: Promise<Tokens> | null = null;

class SessionExpiredError extends Error {}
class SessionChangedError extends Error {}

function invalidRefresh(error: unknown): boolean {
  return error instanceof SessionExpiredError ||
    (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0));
}

export async function renewSession(): Promise<Tokens> {
  if (refreshPromise) return refreshPromise;
  let expectedRefresh: string | null = null;
  refreshPromise = (async () => {
    const stored = await getTokens();
    if (!stored) throw new SessionExpiredError('Sessão expirada');
    expectedRefresh = stored.refresh;
    if (tokenExpired(stored.refresh)) throw new SessionExpiredError('Sessão expirada');
    const { data } = await publicClient.post<{ access: string; refresh?: string }>('token/refresh/', { refresh: stored.refresh });
    if (typeof data?.access !== 'string' || !data.access) throw new Error('Resposta de sessão inválida');
    // A API gira o refresh token; as duas credenciais são persistidas juntas.
    const next = { access: data.access, refresh: data.refresh ?? stored.refresh };
    if (!await replaceTokensIfCurrent(stored.refresh, next)) throw new SessionChangedError('Sessão alterada');
    emitSessionChange();
    return next;
  })().catch(async error => {
    if (expectedRefresh && invalidRefresh(error) && await replaceTokensIfCurrent(expectedRefresh, null)) {
      emitSessionChange();
    }
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

interface RetriableConfig extends InternalAxiosRequestConfig { _retry?: boolean }

client.interceptors.request.use(async config => {
  const tokens = await getTokens();
  if (tokens?.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  else delete config.headers.Authorization;
  return config;
});

client.interceptors.response.use(response => response, async (error: AxiosError) => {
  const original = error.config as RetriableConfig | undefined;
  if (error.response?.status !== 401 || !original || original._retry) throw error;
  original._retry = true;
  try {
    const tokens = await renewSession();
    original.headers.Authorization = `Bearer ${tokens.access}`;
    return client(original);
  } catch (refreshError) { throw refreshError; }
});
