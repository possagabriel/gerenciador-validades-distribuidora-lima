import axios from 'axios';
import { mensagemErro } from '../src/api/errors';

test('traduz nomes de campos e junta mensagens da API', () => {
  const error = new axios.AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400, statusText: 'Bad Request', headers: {}, config: { headers: {} as never },
    data: { preco_venda: ['Informe um valor válido.', 'Use até duas casas decimais.'] }
  });
  expect(mensagemErro(error)).toBe('Preço de venda: Informe um valor válido. Use até duas casas decimais.');
});

test('não mostra HTML de erro do servidor no formulário', () => {
  const error = new axios.AxiosError('Server Error', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 500, statusText: 'Server Error', headers: {}, config: { headers: {} as never },
    data: '<html>Erro interno</html>'
  });
  expect(mensagemErro(error)).toBe('O servidor não conseguiu concluir. Tente novamente em instantes.');
});
