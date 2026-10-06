import MockAdapter from 'axios-mock-adapter';
import { client } from '../src/api/client';
import { buscarCodigoBarras, criarCategoria, criarCodigoBarras, criarProduto, listarCategorias, listarProdutos } from '../src/api/produtos';
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

test('cria categoria, produto e código nas rotas existentes da API', async () => {
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

test('busca o código exato mesmo após resultados parciais e outra página', async () => {
  const produto = { id: 9, nome: 'Suco', categoria: 3, categoria_nome: 'Bebidas', preco_venda: 12.5,
    skus: [{ id: 10, produto: 9, codigo_barras: '7891234567890' }] };
  api.onGet('produto-skus/', { params: { search: '7891234567890' } }).reply(200, {
    count: 2, next: 'produto-skus/?page=2&search=7891234567890',
    results: [{ id: 11, produto: 7, codigo_barras: '0007891234567890' }],
  });
  api.onGet('produto-skus/?page=2&search=7891234567890').reply(200, {
    count: 2, next: null, results: produto.skus,
  });
  api.onGet('produtos/9/').reply(200, produto);

  expect(await buscarCodigoBarras(' 7891234567890 ')).toEqual(produto);
});

test('aceita UPC-A lido como EAN-13 com zero inicial', async () => {
  const produto = { id: 9, nome: 'Suco', categoria: 3, categoria_nome: 'Bebidas', preco_venda: 12.5,
    skus: [{ id: 10, produto: 9, codigo_barras: '123456789012' }] };
  api.onGet('produto-skus/', { params: { search: '0123456789012' } }).reply(200, []);
  api.onGet('produto-skus/', { params: { search: '123456789012' } }).reply(200, produto.skus);
  api.onGet('produtos/9/').reply(200, produto);

  expect(await buscarCodigoBarras('0123456789012')).toEqual(produto);
});

test('retorna vazio para código não cadastrado', async () => {
  api.onGet('produto-skus/', { params: { search: 'desconhecido' } }).reply(200, []);
  expect(await buscarCodigoBarras('desconhecido')).toBeNull();
});

test('confirma o código gravado quando a resposta do POST falha', async () => {
  api.onPost('produto-skus/').reply(500);
  api.onGet('produtos/9/').reply(200, { id: 9, nome: 'Suco', categoria: 3, categoria_nome: 'Bebidas', preco_venda: 12.5,
    skus: [{ id: 10, produto: 9, codigo_barras: '7891234567890' }] });
  const sku = await criarCodigoBarras(9, '7891234567890');
  expect(sku.codigo_barras).toBe('7891234567890');
});

test('carrega páginas de produtos conforme solicitadas', async () => {
  api.onGet('produtos/', { params: { search: 'suco' } }).reply(200, {
    count: 2, next: 'produtos/?page=2&search=suco', results: [{ id: 1, nome: 'Suco A', skus: [] }],
  });
  api.onGet('produtos/?page=2&search=suco').reply(200, {
    count: 2, next: null, results: [{ id: 2, nome: 'Suco B', skus: [] }],
  });

  const primeira = await listarProdutos('suco');
  const segunda = await listarProdutos('suco', primeira.next!);
  expect(primeira.items.map(item => item.id)).toEqual([1]);
  expect(segunda.items.map(item => item.id)).toEqual([2]);
  expect(segunda.next).toBeNull();
});

test('reúne todas as páginas de categorias para o cadastro', async () => {
  api.onGet('categorias/').reply(200, {
    count: 2, next: 'categorias/?page=2', results: [{ id: 1, nome: 'Bebidas' }],
  });
  api.onGet('categorias/?page=2').reply(200, {
    count: 2, next: null, results: [{ id: 2, nome: 'Frios' }],
  });

  expect((await listarCategorias()).map(item => item.nome)).toEqual(['Bebidas', 'Frios']);
});
