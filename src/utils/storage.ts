import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

const KEY = 'lima.jwt.session';
let cachedTokens: Tokens | null | undefined;
let pendingRead: Promise<Tokens | null> | null = null;
let storageQueue: Promise<void> = Promise.resolve();

export interface Tokens { access: string; refresh: string }
interface JwtPayload { exp?: number }

function inOrder<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function getTokens(): Promise<Tokens | null> {
  if (cachedTokens !== undefined) return Promise.resolve(cachedTokens);
  if (pendingRead) return pendingRead;
  pendingRead = inOrder(async () => {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) { cachedTokens = null; return null; }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && 'access' in parsed && 'refresh' in parsed &&
          typeof parsed.access === 'string' && typeof parsed.refresh === 'string') {
        cachedTokens = parsed as Tokens;
        return cachedTokens;
      }
    } catch { /* Sessão inválida é tratada como ausente. */ }
    await SecureStore.deleteItemAsync(KEY);
    cachedTokens = null;
    return null;
  }).finally(() => { pendingRead = null; });
  return pendingRead;
}

export async function setTokens(tokens: Tokens): Promise<void> {
  await inOrder(async () => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    cachedTokens = tokens;
  });
}

export async function clearTokens(): Promise<void> {
  await inOrder(async () => {
    await SecureStore.deleteItemAsync(KEY);
    cachedTokens = null;
  });
}

export function tokenExpired(token: string, skewSeconds = 0): boolean {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch { return true; }
}
