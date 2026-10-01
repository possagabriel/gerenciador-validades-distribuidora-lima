import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

const KEY = 'lima.jwt.session';

export interface Tokens { access: string; refresh: string }
interface JwtPayload { exp?: number }

export async function getTokens(): Promise<Tokens | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'access' in parsed && 'refresh' in parsed &&
        typeof parsed.access === 'string' && typeof parsed.refresh === 'string') return parsed as Tokens;
  } catch { /* Sessão inválida é tratada como ausente. */ }
  await clearTokens();
  return null;
}

export async function setTokens(tokens: Tokens): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export function tokenExpired(token: string, skewSeconds = 0): boolean {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch { return true; }
}
