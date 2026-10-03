import { normalizeList, pageItems, validPage } from '../src/api/pagination';
import { diasRestantes, formatarData } from '../src/utils/formatters';
import { dataAlerta } from '../src/utils/notifications';
import type { Lote } from '../src/types/lote';

const lote: Lote = {
  id: 1, produto: 2, produto_nome: 'Leite', nome_lote: 'L-1', quantidade: 3,
  custo_unitario_compra: 4, nivel_vencimento: 2, esgotado: false,
  dias_vencido: null, data_cadastro: '2026-10-01T12:00:00Z',
  data_validade: '2026-10-04T12:00:00Z', tempo_vencimento: null
};

describe('contratos de leitura', () => {
  test('aceita lista simples do DRF atual', () => {
    expect(normalizeList([lote])).toEqual({ items: [lote], next: null, count: 1 });
    expect(pageItems([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
  });

  test('aceita resposta paginada futura', () => {
    expect(normalizeList({ count: 20, next: 'http://api/?page=2', results: [lote] }))
      .toEqual({ items: [lote], next: 'http://api/?page=2', count: 20 });
  });

  test('volta para página válida quando a lista diminui', () => {
    expect(validPage(3, 1, 20)).toBe(1);
    expect(validPage(3, 41, 20)).toBe(3);
  });

  test('calcula dias pela data de validade real', () => {
    expect(diasRestantes(lote, new Date('2026-10-01T12:00:00Z'))).toBe(3);
  });

  test('conta dias de calendário em UTC como a API', () => {
    expect(diasRestantes(lote, new Date('2026-10-04T00:01:00Z'))).toBe(0);
    expect(diasRestantes(lote, new Date('2026-10-05T00:01:00Z'))).toBe(-1);
    expect(formatarData('2026-10-04T00:00:00Z')).toBe('04/10/2026');
    expect(formatarData('2026-10-04')).toBe('04/10/2026');
  });

  test('usa cadastro mais tempo de vencimento como alternativa', () => {
    expect(diasRestantes({ ...lote, data_validade: null, tempo_vencimento: 4 }, new Date('2026-10-01T12:00:00Z'))).toBe(4);
  });

  test('alerta crítico ocorre em horário futuro e antes de vencer', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    const trigger = dataAlerta(lote, now);
    expect(trigger?.getTime()).toBeGreaterThan(now.getTime());
    expect(trigger?.getTime()).toBeLessThan(new Date(lote.data_validade!).getTime());
  });
});
