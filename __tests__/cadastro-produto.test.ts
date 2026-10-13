import MockAdapter from 'axios-mock-adapter';
import { client } from '../src/api/client';
import { atualizarProduto, buscarCodigoBarras, criarCategoria, criarCodigoBarras, criarProduto, excluirProduto } from '../src/api/produtos';
import { erroDataParcial, erroDataValidade, lerDataBrasileira, lerPreco, mascararData } from '../src/utils/formatters';
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
  expect(lerPreco('1.000.000.000,00')).toBeNull();
});

test('formata e valida a data de validade brasileira', () => {
  expect(mascararData('31122027')).toBe('31/12/2027');
  expect(lerDataBrasileira('31/12/2027')).toBe('2027-12-31T12:00:00.000Z');
  expect(lerDataBrasileira('31/02/2027')).toBeNull();
});

test('bloqueia dia e mês impossíveis durante a digitação', () => {
  expect(erroDataParcial('32/01/2027')).toBe('O dia deve estar entre 01 e 31.');
  expect(erroDataParcial('10/13/2027')).toBe('O mês deve estar entre 01 e 12.');
  expect(erroDataParcial('10/00/2027')).toBe('O mês deve estar entre 01 e 12.');
  expect(erroDataParcial('10/2')).toBe('O mês deve estar entre 01 e 12.');
  expect(mascararData('10132027', '10/1')).toBe('10/1');
});

test('não aceita datas anteriores a hoje nem dias inexistentes', () => {
  const hoje = new Date('2026-10-09T12:00:00Z');
  expect(lerDataBrasileira('08/10/2026', hoje)).toBeNull();
  expect(lerDataBrasileira('09/10/2026', hoje)).toBe('2026-10-09T12:00:00.000Z');
  expect(lerDataBrasileira('31/02/2027', hoje)).toBeNull();
  expect(erroDataValidade('08/10/2026', hoje)).toBe('Informe uma data real, de hoje em diante.');
});

test('cria produto, lote e código numa requisição', async () => {
  api.onPost('categorias/').reply(config => {
    expect(JSON.parse(config.data)).toEqual({ nome: 'Bebidas', dias_atencao: 30, dias_critico: 7 });
    return [201, { id: 3, nome: 'Bebidas', dias_atencao: 30, dias_critico: 7 }];
  });
  api.onPost('produtos/').reply(config => {
    expect(JSON.parse(config.data)).toEqual({
      nome: 'Suco', categoria: 3, preco_venda: 12.5,
      lote_inicial: {
        quantidade: 20,
        custo_unitario_compra: 8.75,
        data_validade: '2027-12-31T12:00:00.000Z'
      },
      codigo_barras: '7891234567890'
    });
    return [201, { id: 9, nome: 'Suco', categoria: 3, categoria_nome: 'Bebidas', preco_venda: 12.5,
      estoque_total: 20, proxima_validade: '2027-12-31T12:00:00.000Z',
      skus: [{ id: 10, produto: 9, codigo_barras: '7891234567890' }] }];
  });

  const categoria = await criarCategoria('Bebidas');
  const produto = await criarProduto({
    nome: 'Suco', categoria: categoria.id, preco_venda: 12.5,
    lote_inicial: {
      quantidade: 20,
      custo_unitario_compra: 8.75,
      data_validade: '2027-12-31T12:00:00.000Z'
    },
    codigo_barras: '7891234567890'
  });
  expect(produto.id).toBe(9);
  expect(produto.skus[0]?.codigo_barras).toBe('7891234567890');
  expect(api.history.post).toHaveLength(2);
});

test('busca código exato e abre seu produto', async () => {
  api.onGet('produto-skus/').reply(config => {
    expect(config.params).toEqual({ codigo_barras: '7891234567890' });
    return [200, [{ id: 10, produto: 9, codigo_barras: '7891234567890' }]];
  });
  api.onGet('produtos/9/').reply(200, { id: 9, nome: 'Suco', skus: [] });
  expect((await buscarCodigoBarras('7891234567890'))?.id).toBe(9);
});

test('edita e exclui produto pelas rotas da API', async () => {
  const alteracao = { nome: 'Suco integral', categoria: 4, preco_venda: 15.9 };
  api.onPatch('produtos/9/').reply(config => {
    expect(JSON.parse(config.data)).toEqual(alteracao);
    return [200, { id: 9, ...alteracao, categoria_nome: 'Mercearia', skus: [] }];
  });
  api.onDelete('produtos/9/').reply(204);

  const atualizado = await atualizarProduto(9, alteracao);
  expect(atualizado.nome).toBe('Suco integral');
  expect(atualizado.categoria_nome).toBe('Mercearia');
  await expect(excluirProduto(9)).resolves.toBeUndefined();
  expect(api.history.patch).toHaveLength(1);
  expect(api.history.delete).toHaveLength(1);
});
