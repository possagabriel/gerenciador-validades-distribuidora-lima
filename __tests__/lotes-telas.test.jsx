import {
  api, app, consultas, lote, montar, tocar, preencher, data,
  aguardarTexto, temTexto, navegacao, configurarPerfil, confirmarExclusao,
} from './support/telas';
import LoteFormularioScreen from '../src/screens/LoteFormularioScreen';
import LoteDetalheScreen from '../src/screens/LoteDetalheScreen';

test('valida produto, quantidade, custo e validade no cadastro de lote', async () => {
  await montar(LoteFormularioScreen);
  await tocar('Salvar lote');
  expect(temTexto('Selecione um produto.')).toBe(true);
  expect(temTexto('Informe entre 1 e 999999999 unidades.')).toBe(true);
  expect(temTexto('Informe um custo válido.')).toBe(true);
  expect(temTexto('Selecione uma validade de hoje em diante.')).toBe(true);
  expect(api.history.post).toHaveLength(0);
});

test('busca e seleciona produto e cria lote com data e valores normalizados', async () => {
  api.onPost('lotes/').reply(201, lote);
  await montar(LoteFormularioScreen);
  await preencher('Buscar produto para o lote', 'Suco');
  await aguardarTexto('Suco');
  await tocar('Suco');
  await data('Data de validade', '2026-11-20');
  await preencher('Quantidade inicial', '20 unidades');
  await preencher('Custo por unidade', '8,75');
  await tocar('Salvar lote');
  expect(JSON.parse(api.history.post[0].data)).toEqual({
    produto: 1, quantidade: 20, custo_unitario_compra: 8.75, data_validade: '2026-11-20T12:00:00.000Z',
  });
  expect(navegacao.goBack).toHaveBeenCalledTimes(1);
});

test('mantém os dados do lote depois de um erro de cadastro', async () => {
  api.onPost('lotes/').reply(400, { detail: 'Validade recusada.' });
  await montar(LoteFormularioScreen, { produtoId: 1 });
  await data('Data de validade', '2026-11-20');
  await preencher('Quantidade inicial', '10');
  await preencher('Custo por unidade', '3,50');
  await tocar('Salvar lote');
  expect(temTexto('Validade recusada.')).toBe(true);
  expect(navegacao.goBack).not.toHaveBeenCalled();
});

test('edita somente o custo preservando a validade de um lote vencido', async () => {
  api.onGet('lotes/1/').reply(200, { ...lote, data_validade: '2026-11-10T12:00:00Z' });
  api.onPatch('lotes/1/').reply(200, { ...lote, custo_unitario_compra: 9 });
  await montar(LoteFormularioScreen, { id: 1 });
  await aguardarTexto('Editar lote');
  await preencher('Custo por unidade', '9,00');
  await tocar('Salvar lote');
  expect(JSON.parse(api.history.patch[0].data)).toEqual({ custo_unitario_compra: 9 });
  expect(consultas.getQueryData(['lote', 1]).custo_unitario_compra).toBe(9);
  expect(navegacao.goBack).toHaveBeenCalled();
});

test('envia a nova validade ao editar o lote', async () => {
  api.onPatch('lotes/1/').reply(200, lote);
  await montar(LoteFormularioScreen, { id: 1 });
  await aguardarTexto('Editar lote');
  await data('Data de validade', '2026-11-21');
  await tocar('Salvar lote');
  expect(JSON.parse(api.history.patch[0].data)).toEqual({
    custo_unitario_compra: 8.75, data_validade: '2026-11-21T12:00:00.000Z',
  });
});

test('recarrega o formulário de edição após uma falha inicial', async () => {
  api.onGet('lotes/1/').reply(503);
  await montar(LoteFormularioScreen, { id: 1 });
  api.onGet('lotes/1/').reply(200, lote);
  await tocar('Tentar novamente');
  await aguardarTexto('Editar lote');
});

test.each([
  ['ENTRADA', 'Entrada', 3, 23],
  ['SAIDA', 'Saída', 3, 17],
  ['AJUSTE', 'Correção', 0, 0],
])('registra %s e mostra o novo saldo e o histórico', async (tipo, botao, quantidade, saldo) => {
  let movimentos = [];
  api.onGet('lotes/1/movimentos/').reply(() => [200, movimentos]);
  api.onPost('lotes/1/movimentos/').reply(config => {
    const dados = JSON.parse(config.data);
    movimentos = [{ id: 1, usuario_nome: 'Operador', tipo, quantidade, quantidade_antes: 20,
      quantidade_depois: saldo, motivo: dados.motivo }];
    return [201, { lote: { ...lote, quantidade: saldo, esgotado: saldo === 0 } }];
  });
  await montar(LoteDetalheScreen, { id: 1 });
  await aguardarTexto('Movimentar estoque');
  await tocar(botao);
  await preencher(tipo === 'AJUSTE' ? 'Novo saldo' : 'Quantidade movimentada', String(quantidade));
  await preencher('Motivo da movimentação', ' Conferência do estoque ');
  await tocar('Registrar movimentação');
  await aguardarTexto(`${saldo} unidades`);
  expect(JSON.parse(api.history.post[0].data)).toEqual({ tipo, quantidade, motivo: 'Conferência do estoque' });
  await aguardarTexto(`${tipo} · 20 → ${saldo}`);
});

test('valida quantidade e motivo, trata saída recusada e mantém saldo anterior', async () => {
  api.onPost('lotes/1/movimentos/').reply(400, { detail: 'Saldo insuficiente.' });
  await montar(LoteDetalheScreen, { id: 1 });
  await aguardarTexto('Movimentar estoque');
  await tocar('Registrar movimentação');
  expect(temTexto('Informe uma quantidade válida.')).toBe(true);
  await preencher('Quantidade movimentada', '21');
  await preencher('Motivo da movimentação', 'ab');
  await tocar('Registrar movimentação');
  expect(temTexto('Informe o motivo com pelo menos 3 caracteres.')).toBe(true);
  await preencher('Motivo da movimentação', 'Venda');
  await tocar('Registrar movimentação');
  expect(temTexto('Saldo insuficiente.')).toBe(true);
  expect(temTexto('20 unidades')).toBe(true);
});

test('marca o lote como esgotado com ajuste para saldo zero', async () => {
  api.onPost('lotes/1/movimentos/').reply(201, { lote: { ...lote, quantidade: 0, esgotado: true } });
  await montar(LoteDetalheScreen, { id: 1 });
  await aguardarTexto('Movimentar estoque');
  await tocar('Marcar como esgotado');
  expect(JSON.parse(api.history.post[0].data)).toEqual({
    tipo: 'AJUSTE', quantidade: 0, motivo: 'Lote esgotado após conferência',
  });
  await aguardarTexto('Esgotado');
  expect(temTexto('Marcar como esgotado')).toBe(false);
});

test('Caixa pode registrar saída e não recebe ações de ajuste ou exclusão', async () => {
  configurarPerfil('CAIXA');
  api.onGet('lotes/1/movimentos/').reply(503);
  await montar(LoteDetalheScreen, { id: 1 });
  await aguardarTexto('Saída');
  expect(temTexto('Entrada')).toBe(false);
  expect(temTexto('Correção')).toBe(false);
  expect(temTexto('Editar validade e custo')).toBe(false);
  expect(temTexto('Excluir lote')).toBe(false);
  expect(temTexto('Não foi possível carregar o histórico.')).toBe(true);
});

test('abre a edição do lote pelo detalhe', async () => {
  await montar(LoteDetalheScreen, { id: 1 });
  await aguardarTexto('Editar validade e custo');
  await tocar('Editar validade e custo');
  expect(navegacao.navigate).toHaveBeenCalledWith('LoteFormulario', { id: 1 });
});

test.each([204, 500])('exclui lote somente depois de confirmar e trata HTTP %i', async status => {
  api.onDelete('lotes/1/').reply(status);
  await montar(LoteDetalheScreen, { id: 1 });
  await aguardarTexto('Excluir lote');
  await tocar('Excluir lote');
  expect(api.history.delete).toHaveLength(0);
  await confirmarExclusao();
  expect(api.history.delete).toHaveLength(1);
  if (status === 204) expect(navegacao.goBack).toHaveBeenCalled();
  else {
    expect(navegacao.goBack).not.toHaveBeenCalled();
    expect(temTexto('O servidor não conseguiu concluir. Tente novamente em instantes.')).toBe(true);
  }
});
