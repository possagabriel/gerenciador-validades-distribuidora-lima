import MockAdapter from 'axios-mock-adapter';
import { client } from '../src/api/client';
import { criarCategoria, criarCodigoBarras, criarProduto } from '../src/api/produtos';
import { lerPreco } from '../src/utils/formatters';
import { getTokens } from '../src/utils/storage';

jest.mock('../src/utils/storage');
const getTokensMock = getTokens as jest.MockedFunction<typeof getTokens>;
const api = new MockAdapter(client);

beforeEach(() => {
  api.reset();
  getTokensMock.mockResolvedValue(null);
});

test('interpreta preço em reais sem perder centavos', () => {
  expect(lerPreco('R$ 1.234,56')).toBe(1234.56);
  expect(lerPreco('19.90')).toBe(19.9);
  expect(lerPreco('abc')).toBeNull();
});

test('cria categoria, produto e código nas rotas reais da API', async () => {
  api.onPost('categorias/').reply(config => {
    expect(JSON.parse(config.data)).toEqual({ nome: 'Bebidas' });
    return [201, { id: 3, nome: 'Bebidas', dias_atencao: 30, dias_critico: 7 }];
  });
  api.onPost('produtos/').reply(config => {
    expect(JSON.parse(config.data)).toEqual({ nome: 'Suco', categoria: 3, preco_venda: 12.5, lotes_iniciais: [
      { data_validade: '2027-04-30', quantidade: 20, custo_unitario_compra: 6.25 },
      { data_validade: '2027-06-30', quantidade: 15, custo_unitario_compra: 6 },
    ] });
    return [201, { id: 9, nome: 'Suco', categoria: 3, categoria_nome: 'Bebidas', preco_venda: 12.5, skus: [] }];
  });
  api.onPost('produto-skus/').reply(config => {
    expect(JSON.parse(config.data)).toEqual({ produto: 9, codigo_barras: '7891234567890' });
    return [201, { id: 10, produto: 9, codigo_barras: '7891234567890' }];
  });

  const categoria = await criarCategoria('Bebidas');
  const produto = await criarProduto({ nome: 'Suco', categoria: categoria.id, preco_venda: 12.5, lotes_iniciais: [
    { data_validade: '2027-04-30', quantidade: 20, custo_unitario_compra: 6.25 },
    { data_validade: '2027-06-30', quantidade: 15, custo_unitario_compra: 6 },
  ] });
  const sku = await criarCodigoBarras(produto.id, '7891234567890');
  expect(produto.id).toBe(9);
  expect(sku.codigo_barras).toBe('7891234567890');
});
