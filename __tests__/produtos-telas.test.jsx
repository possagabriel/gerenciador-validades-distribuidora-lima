import {
  api, app, consultas, produto, categoria, montar, tocar, preencher, data,
  aguardar, aguardarTexto, temTexto, navegacao, configurarPerfil, confirmarExclusao, pagina,
} from './support/telas';
import AdicionarProdutoScreen from '../src/screens/AdicionarProdutoScreen';
import EditarProdutoScreen from '../src/screens/EditarProdutoScreen';
import ProdutoDetalheScreen from '../src/screens/ProdutoDetalheScreen';
import ProdutosListScreen from '../src/screens/ProdutosListScreen';

async function produtoValido(codigo = '7891234567895') {
  await preencher('Nome do produto', ' Suco ');
  await tocar('Bebidas');
  await preencher('Preço de venda', '12,50');
  await data('Data de validade', '2026-11-20');
  await preencher('Quantidade do lote', '20');
  await preencher('Custo por unidade', '8,75');
  await preencher('QR ou código de barras', codigo);
}

test.each(['7891234567895', ''])('cadastra produto e lote inicial com código %j', async codigo => {
  api.onPost('produtos/').reply(201, produto);
  await montar(AdicionarProdutoScreen);
  await produtoValido(codigo);
  await tocar('Salvar produto');

  expect(JSON.parse(api.history.post[0].data)).toEqual({
    nome: 'Suco', categoria: 1, preco_venda: 12.5,
    lote_inicial: { quantidade: 20, custo_unitario_compra: 8.75, data_validade: '2026-11-20T12:00:00.000Z' },
    ...(codigo ? { codigo_barras: codigo } : {}),
  });
  expect(consultas.getQueryData(['produto', 1])).toEqual(produto);
  expect(navegacao.replace).toHaveBeenCalledWith('ProdutoDetalhe', { id: 1 });
});

test('valida os campos do novo produto antes de enviar à API', async () => {
  await montar(AdicionarProdutoScreen);
  await tocar('Salvar produto');
  expect(temTexto('Informe o nome do produto.')).toBe(true);
  await preencher('Nome do produto', 'Suco');
  await tocar('Salvar produto');
  expect(temTexto('Selecione ou crie uma categoria.')).toBe(true);
  await tocar('Bebidas');
  await tocar('Salvar produto');
  expect(temTexto('Informe um preço válido, como 19,90.')).toBe(true);
  await preencher('Preço de venda', '12,50');
  await tocar('Salvar produto');
  expect(temTexto('Selecione uma validade de hoje em diante.')).toBe(true);
  await data('Data de validade', '2026-11-20');
  await tocar('Salvar produto');
  expect(temTexto('Informe uma quantidade maior que zero.')).toBe(true);
  await preencher('Quantidade do lote', '0');
  await tocar('Salvar produto');
  expect(temTexto('Informe uma quantidade maior que zero.')).toBe(true);
  await preencher('Quantidade do lote', '20 unidades');
  await tocar('Salvar produto');
  expect(temTexto('Informe um custo por unidade válido, como 12,50.')).toBe(true);
  await preencher('Custo por unidade', '8,75');
  await preencher('QR ou código de barras', 'A'.repeat(51));
  await tocar('Salvar produto');
  expect(temTexto('O código deve ter até 50 caracteres.')).toBe(true);
  expect(api.history.post).toHaveLength(0);
});

test('mantém o formulário preenchido quando o servidor recusa o cadastro', async () => {
  api.onPost('produtos/').reply(400, { nome: ['Já existe um produto com esse nome.'] });
  await montar(AdicionarProdutoScreen, { codigoInicial: '7891234567895' });
  await produtoValido();
  await tocar('Salvar produto');
  expect(temTexto(/Já existe um produto/)).toBe(true);
  expect(navegacao.replace).not.toHaveBeenCalled();
  expect(app.root.findAllByType('TextInput').find(no => no.props.accessibilityLabel === 'Nome do produto').props.value).toBe(' Suco ');
});

test('cria uma categoria dentro do cadastro e seleciona a nova categoria', async () => {
  api.onPost('categorias/').reply(201, { ...categoria, id: 2, nome: 'Mercearia' });
  await montar(AdicionarProdutoScreen);
  await tocar('Nova categoria');
  await tocar('Salvar categoria');
  expect(temTexto('Informe o nome da categoria.')).toBe(true);
  await preencher('Nome da nova categoria', ' Mercearia ');
  await tocar('Salvar categoria');
  expect(JSON.parse(api.history.post[0].data)).toEqual({ nome: 'Mercearia', dias_atencao: 30, dias_critico: 7 });
  expect(consultas.getQueryData(['categorias'])).toHaveLength(2);
  expect(temTexto('Mercearia')).toBe(true);
});

test('exibe a falha de criação de categoria e permite cancelar', async () => {
  api.onPost('categorias/').reply(400, { detail: 'Categoria duplicada.' });
  await montar(AdicionarProdutoScreen);
  await tocar('Nova categoria');
  await preencher('Nome da nova categoria', 'Bebidas');
  await tocar('Salvar categoria');
  expect(temTexto('Categoria duplicada.')).toBe(true);
  await tocar('Cancelar');
  expect(temTexto('Salvar categoria')).toBe(false);
});

test('recupera a lista de categorias após uma falha', async () => {
  api.onGet('categorias/').reply(503);
  await montar(AdicionarProdutoScreen);
  await aguardarTexto('Não foi possível carregar as categorias.');
  api.onGet('categorias/').reply(200, pagina([categoria]));
  await tocar('Tentar novamente');
  await aguardarTexto('Bebidas');
});

test('altera o nome, a categoria e o preço preservando o produto no cache', async () => {
  api.onPatch('produtos/1/').reply(200, { ...produto, nome: 'Suco integral', preco_venda: '15.90' });
  await montar(EditarProdutoScreen, { id: 1 });
  await aguardarTexto('Editar produto');
  await preencher('Nome do produto', ' Suco integral ');
  await tocar('Bebidas');
  await preencher('Preço de venda', '15,90');
  await tocar('Salvar alterações');
  expect(JSON.parse(api.history.patch[0].data)).toEqual({ nome: 'Suco integral', categoria: 1, preco_venda: 15.9 });
  expect(consultas.getQueryData(['produto', 1]).nome).toBe('Suco integral');
  expect(navegacao.goBack).toHaveBeenCalledTimes(1);
});

test('valida nome e preço durante a edição e apresenta falha do servidor', async () => {
  api.onPatch('produtos/1/').reply(503);
  await montar(EditarProdutoScreen, { id: 1 });
  await aguardarTexto('Editar produto');
  await preencher('Nome do produto', ' ');
  await tocar('Salvar alterações');
  expect(temTexto('Informe o nome do produto.')).toBe(true);
  await preencher('Nome do produto', 'Suco');
  await preencher('Preço de venda', 'inválido');
  await tocar('Salvar alterações');
  expect(temTexto('Informe um preço válido, como 19,90.')).toBe(true);
  await preencher('Preço de venda', '12,50');
  await tocar('Salvar alterações');
  expect(temTexto('O servidor não conseguiu concluir. Tente novamente em instantes.')).toBe(true);
  expect(navegacao.goBack).not.toHaveBeenCalled();
});

test('impede salvar uma categoria que deixou de existir', async () => {
  api.onGet('categorias/').reply(200, pagina([]));
  await montar(EditarProdutoScreen, { id: 1 });
  await aguardarTexto('Editar produto');
  await tocar('Salvar alterações');
  expect(temTexto('Selecione uma categoria.')).toBe(true);
  expect(api.history.patch).toHaveLength(0);
});

test('adiciona código ao produto e abre as rotas de estoque', async () => {
  api.onPost('produto-skus/').reply(201, { id: 2, produto: 1, codigo_barras: 'NOVO-001' });
  await montar(ProdutoDetalheScreen, { id: 1 });
  await aguardarTexto('Suco');
  await tocar('Adicionar');
  await tocar('Salvar código');
  expect(temTexto('Informe o QR ou código de barras.')).toBe(true);
  await preencher('Novo QR ou código de barras', ' NOVO-001 ');
  await tocar('Salvar código');
  expect(JSON.parse(api.history.post[0].data)).toEqual({ produto: 1, codigo_barras: 'NOVO-001' });
  expect(temTexto('NOVO-001')).toBe(true);
  await tocar('Ver lotes deste produto');
  expect(navegacao.navigate).toHaveBeenLastCalledWith('SkuLotes', { produtoId: 1 });
  await tocar('Adicionar lote');
  expect(navegacao.navigate).toHaveBeenLastCalledWith('LoteFormulario', { produtoId: 1 });
  await tocar('Editar produto');
  expect(navegacao.navigate).toHaveBeenLastCalledWith('EditarProduto', { id: 1 });
});

test('informa código duplicado e permite fechar o formulário de código', async () => {
  api.onPost('produto-skus/').reply(400, { detail: 'Código já cadastrado.' });
  await montar(ProdutoDetalheScreen, { id: 1 });
  await aguardarTexto('Suco');
  await tocar('Adicionar');
  await preencher('Novo QR ou código de barras', '7891234567895');
  await tocar('Salvar código');
  expect(temTexto('Código já cadastrado.')).toBe(true);
  await tocar('Cancelar');
  expect(temTexto('Salvar código')).toBe(false);
});

test.each([204, 500])('confirma exclusão de produto com resposta HTTP %i', async status => {
  api.onDelete('produtos/1/').reply(status);
  await montar(ProdutoDetalheScreen, { id: 1 });
  await aguardarTexto('Suco');
  const remover = jest.spyOn(consultas, 'removeQueries');
  await tocar('Excluir produto');
  expect(api.history.delete).toHaveLength(0);
  await confirmarExclusao();
  expect(api.history.delete).toHaveLength(1);
  if (status === 204) {
    expect(navegacao.popToTop).toHaveBeenCalled();
    expect(remover).toHaveBeenCalledWith({ queryKey: ['produto', 1] });
  } else {
    expect(navegacao.popToTop).not.toHaveBeenCalled();
    expect(temTexto('O servidor não conseguiu concluir. Tente novamente em instantes.')).toBe(true);
  }
});

test('permite ao Caixa consultar produto sem botões de edição e exclusão', async () => {
  configurarPerfil('CAIXA');
  api.onGet('produtos/1/').reply(200, { ...produto, skus: [] });
  await montar(ProdutoDetalheScreen, { id: 1 });
  await aguardarTexto('Nenhum código cadastrado');
  expect(temTexto('Editar produto')).toBe(false);
  expect(temTexto('Excluir produto')).toBe(false);
});

test('busca produtos com espera de digitação e abre o detalhe', async () => {
  await montar(ProdutosListScreen);
  await aguardarTexto('Suco');
  await preencher('Buscar produto', ' Suco ');
  await aguardar(() => api.history.get.some(req => req.url === 'produtos/' && req.params.search === 'Suco'));
  await aguardarTexto('Suco');
  await tocar('Abrir Suco');
  expect(navegacao.navigate).toHaveBeenCalledWith('ProdutoDetalhe', { id: 1 });
  await tocar('Adicionar produto');
  expect(navegacao.navigate).toHaveBeenLastCalledWith('AdicionarProduto');
  await tocar('Ler QR ou código de barras');
  expect(navegacao.navigate).toHaveBeenLastCalledWith('Scanner');
});

test('distingue catálogo vazio de busca sem resultados', async () => {
  api.onGet('produtos/').reply(200, pagina([]));
  await montar(ProdutosListScreen);
  await aguardarTexto('Seu catálogo está vazio');
  await preencher('Buscar produto', 'Inexistente');
  expect(temTexto('Nenhum produto encontrado')).toBe(true);
});
