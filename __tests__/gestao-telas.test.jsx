import {
  api, app, consultas, produto, categoria, lote, relatorio, montar, tocar, preencher, data,
  aguardar, aguardarTexto, temTexto, configurarPerfil, confirmarExclusao,
} from './support/telas';
import { act } from 'react';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import CategoriasScreen from '../src/screens/CategoriasScreen';
import LixeiraScreen from '../src/screens/LixeiraScreen';
import RelatoriosScreen from '../src/screens/RelatoriosScreen';

test('valida nome e prazos da categoria antes de criar', async () => {
  await montar(CategoriasScreen);
  await preencher('Dias para atenção', '0');
  await preencher('Dias para crítico', '7');
  await tocar('Criar categoria');
  expect(temTexto('Informe o nome.')).toBe(true);
  expect(temTexto('Informe dias de atenção maiores que zero.')).toBe(true);
  expect(temTexto('O prazo crítico deve ser menor que o de atenção.')).toBe(true);
  expect(api.history.post).toHaveLength(0);
});

test('cria categoria com prazos e limpa o formulário após confirmação', async () => {
  api.onPost('categorias/').reply(201, { ...categoria, nome: 'Laticínios' });
  await montar(CategoriasScreen);
  await preencher('Nome da categoria', ' Laticínios ');
  await preencher('Dias para atenção', '20');
  await preencher('Dias para crítico', '5');
  await tocar('Criar categoria');
  expect(JSON.parse(api.history.post[0].data)).toEqual({ nome: 'Laticínios', dias_atencao: 20, dias_critico: 5 });
  await aguardar(() => app.root.findAllByType('TextInput').find(no => no.props.accessibilityLabel === 'Nome da categoria').props.value === '');
});

test('edita categoria existente e permite cancelar uma edição seguinte', async () => {
  api.onPatch('categorias/1/').reply(200, { ...categoria, dias_critico: 4 });
  await montar(CategoriasScreen);
  await tocar('Editar');
  expect(temTexto('Editar categoria')).toBe(true);
  await preencher('Dias para crítico', '4');
  await tocar('Salvar alterações');
  expect(JSON.parse(api.history.patch[0].data)).toEqual({ nome: 'Bebidas', dias_atencao: 30, dias_critico: 4 });
  await aguardarTexto('Nova categoria');
  await tocar('Editar');
  await tocar('Cancelar edição');
  expect(temTexto('Nova categoria')).toBe(true);
});

test('exibe o erro do servidor ao salvar categoria', async () => {
  api.onPost('categorias/').reply(400, { detail: 'Já existe essa categoria.' });
  await montar(CategoriasScreen);
  await preencher('Nome da categoria', 'Bebidas');
  await tocar('Criar categoria');
  expect(temTexto('Já existe essa categoria.')).toBe(true);
});

test.each([204, 400])('exclusão de categoria depende da confirmação e trata HTTP %i', async status => {
  api.onDelete('categorias/1/').reply(status, { detail: 'Categoria vinculada a produtos.' });
  await montar(CategoriasScreen);
  await tocar('Editar');
  await tocar('Excluir');
  expect(api.history.delete).toHaveLength(0);
  await confirmarExclusao();
  expect(api.history.delete).toHaveLength(1);
  if (status === 204) await aguardarTexto('Nova categoria');
  else expect(temTexto('Categoria vinculada a produtos.')).toBe(true);
});

test('Caixa consulta prazos sem controles de gestão', async () => {
  configurarPerfil('CAIXA');
  await montar(CategoriasScreen);
  await aguardarTexto('Bebidas');
  expect(temTexto('Criar categoria')).toBe(false);
  expect(temTexto('Excluir')).toBe(false);
});

test('refaz a consulta de categorias após erro inicial', async () => {
  api.onGet('categorias/').reply(503);
  await montar(CategoriasScreen);
  api.onGet('categorias/').reply(200, [categoria]);
  await tocar('Tentar novamente');
  await aguardarTexto('Bebidas');
});

function lixeira(categorias = [], produtos = [], lotes = []) {
  api.onGet('categorias/lixeira/').reply(200, categorias);
  api.onGet('produtos/lixeira/').reply(200, produtos);
  api.onGet('lotes/lixeira/').reply(200, lotes);
}

test('exibe a lixeira vazia e permite atualizar', async () => {
  lixeira();
  await montar(LixeiraScreen);
  await aguardarTexto('Lixeira vazia');
  await tocar('Atualizar');
  expect(api.history.get.filter(req => req.url === 'lotes/lixeira/').length).toBeGreaterThan(1);
});

test.each([
  ['categoria', 'categorias', categoria],
  ['produto', 'produtos', produto],
  ['lote', 'lotes', lote],
])('restaura %s e remove o registro da lixeira após a confirmação da API', async (tipo, recurso, registro) => {
  let itens = [registro];
  lixeira();
  api.onGet(`${recurso}/lixeira/`).reply(() => [200, itens]);
  api.onPost(`${recurso}/1/restaurar/`).reply(() => { itens = []; return [200, registro]; });
  await montar(LixeiraScreen);
  await aguardarTexto('1 registro excluído para restaurar');
  await tocar(`Restaurar ${tipo}`);
  await aguardarTexto('Lixeira vazia');
  expect(api.history.post.map(req => req.url)).toEqual([`${recurso}/1/restaurar/`]);
});

test('conserva o registro excluído quando a restauração é recusada', async () => {
  lixeira([categoria], [produto], [lote]);
  api.onPost('produtos/1/restaurar/').reply(400, { detail: 'Restaure primeiro a categoria.' });
  await montar(LixeiraScreen);
  await aguardarTexto('3 registros excluídos para restaurar');
  await tocar('Restaurar produto');
  expect(temTexto('Restaure primeiro a categoria.')).toBe(true);
  expect(temTexto('Suco')).toBe(true);
});

test('repete consultas da lixeira após uma falha inicial', async () => {
  lixeira();
  api.onGet('lotes/lixeira/').reply(503);
  await montar(LixeiraScreen);
  await aguardarTexto('Não foi possível carregar a lixeira.');
  api.onGet('lotes/lixeira/').reply(200, []);
  await tocar('Tentar novamente');
  await aguardarTexto('Lixeira vazia');
});

test('mantém dados anteriores da lixeira quando uma atualização falha', async () => {
  lixeira([categoria]);
  await montar(LixeiraScreen);
  await aguardarTexto('Bebidas');
  api.onGet('categorias/lixeira/').reply(503);
  await act(async () => { await consultas.invalidateQueries({ queryKey: ['lixeira'] }); });
  await aguardarTexto('Dados não atualizados');
  expect(temTexto('Bebidas')).toBe(true);
});

test('consulta prejuízo e envia filtros de datas, categoria e produto', async () => {
  api.onGet('lotes/relatorio-prejuizo/').reply(200, relatorio);
  await montar(RelatoriosScreen);
  await aguardarTexto('Prejuízo total');
  expect(temTexto(/R\$\s*35,00/)).toBe(true);
  expect(temTexto('Iogurte')).toBe(true);
  await data('Data inicial', '2000-01-10');
  await data('Data final', '2000-01-20');
  await tocar('Bebidas');
  await tocar('Suco');
  await aguardar(() => api.history.get.some(req => req.url === 'lotes/relatorio-prejuizo/'
    && req.params.data_inicio === '2000-01-10' && req.params.data_fim === '2000-01-20'
    && req.params.categoria === 1 && req.params.produto === 1));
  await tocar('Todas');
  await tocar('Todos');
  await preencher('Buscar produto no relatório', 'Suco');
  await aguardar(() => api.history.get.some(req => req.url === 'produtos/' && req.params.search === 'Suco'));
});

test('exporta o CSV e aciona o compartilhamento com o tipo correto', async () => {
  const csv = 'produto;quantidade\nSuco;20\n';
  api.onGet('lotes/relatorio-prejuizo/').reply(200, relatorio);
  api.onGet('lotes/exportar-csv/').reply(200, csv);
  await montar(RelatoriosScreen);
  await aguardarTexto('Prejuízo total');
  await tocar('Exportar lotes em CSV');
  expect(File).toHaveBeenCalledWith('file:///cache', expect.stringMatching(/^lotes-\d+\.csv$/));
  const arquivo = File.mock.results.at(-1).value;
  expect(arquivo.create).toHaveBeenCalledTimes(1);
  expect(arquivo.write).toHaveBeenCalledWith(csv);
  expect(Sharing.shareAsync).toHaveBeenCalledWith(arquivo.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar lotes em CSV' });
});

test('informa quando o aparelho não oferece compartilhamento', async () => {
  Sharing.isAvailableAsync.mockResolvedValue(false);
  api.onGet('lotes/relatorio-prejuizo/').reply(200, relatorio);
  await montar(RelatoriosScreen);
  await aguardarTexto('Prejuízo total');
  await tocar('Exportar lotes em CSV');
  expect(temTexto('Não foi possível exportar o CSV neste aparelho.')).toBe(true);
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test('mostra relatório sem lotes e recupera consulta após falha inicial', async () => {
  api.onGet('lotes/relatorio-prejuizo/').replyOnce(503);
  api.onGet('lotes/relatorio-prejuizo/').reply(200, { ...relatorio, lotes_considerados: [], quantidade_lotes_considerados: 0, prejuizo_total: 0 });
  await montar(RelatoriosScreen);
  await tocar('Tentar novamente');
  await aguardarTexto('Sem lotes no período');
});
