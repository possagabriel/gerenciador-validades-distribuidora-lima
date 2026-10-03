import axios from 'axios';

const fieldLabels: Record<string, string> = {
  nome: 'Nome', categoria: 'Categoria', preco_venda: 'Preço de venda',
  codigo_barras: 'Código de barras', produto: 'Produto', quantidade: 'Quantidade',
  data_validade: 'Validade', custo_unitario_compra: 'Custo por unidade'
};

function messageFromData(data: unknown): string | null {
  if (typeof data === 'string') {
    const message = data.trim();
    return message && !message.startsWith('<') ? message : null;
  }
  if (Array.isArray(data)) {
    const messages = data.map(messageFromData).filter((value): value is string => Boolean(value));
    return messages.length ? messages.join(' ') : null;
  }
  if (data && typeof data === 'object') {
    for (const [field, value] of Object.entries(data)) {
      const message = messageFromData(value);
      if (!message) continue;
      if (field === 'detail' || field === 'non_field_errors') return message;
      return `${fieldLabels[field] ?? field}: ${message}`;
    }
  }
  return null;
}

export function mensagemErro(error: unknown, fallback = 'Não foi possível concluir. Tente novamente.'): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'Sem conexão com a API. Confira a rede e tente novamente.';
  if (error.response.status >= 500) return 'O servidor não conseguiu concluir. Tente novamente em instantes.';
  return messageFromData(error.response.data) ?? fallback;
}
