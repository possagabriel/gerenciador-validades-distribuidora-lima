import axios from 'axios';

export function mensagemErro(error: unknown, fallback = 'Não foi possível concluir. Tente novamente.'): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'Sem conexão com a API. Confira a rede e tente novamente.';
  const data: unknown = error.response.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const entries = Object.entries(data);
    const first = entries.find(([, value]) => Boolean(value));
    if (first) {
      const [field, value] = first;
      const message = Array.isArray(value) ? value.join(' ') : String(value);
      return field === 'detail' || field === 'non_field_errors' ? message : `${field}: ${message}`;
    }
  }
  return fallback;
}
