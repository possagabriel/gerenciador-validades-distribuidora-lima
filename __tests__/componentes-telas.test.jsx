import {
  api, app, montar, tocar, preencher, aguardar, aguardarTexto, temTexto,
  navegacao, sessao, configurarPerfil, produto, pagina,
} from './support/telas';
import { act } from 'react';
import { Keyboard, Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import LoginScreen from '../src/screens/LoginScreen';
import MoreScreen from '../src/screens/MoreScreen';
import ScannerScreen from '../src/screens/ScannerScreen';
import CodeCamera from '../src/components/CodeCamera';
import CodeScannerModal from '../src/components/CodeScannerModal';
import DatePickerField from '../src/components/DatePickerField';
import Pagination from '../src/components/Pagination';
import { useKeyboardScroll } from '../src/hooks/useKeyboardScroll';

async function lerCodigo(codigo) {
  const camera = app.root.findAll(no => no.type === 'View' && typeof no.props.onBarcodeScanned === 'function')[0];
  expect(camera).toBeDefined();
  await act(async () => { camera.props.onBarcodeScanned({ data: codigo }); });
  await act(async () => { await jest.advanceTimersByTimeAsync(50); });
}

test('valida login, alterna visibilidade da senha e envia credenciais', async () => {
  await montar(LoginScreen);
  await tocar('Entrar');
  expect(temTexto('Informe usuário e senha.')).toBe(true);
  expect(sessao.signIn).not.toHaveBeenCalled();
  await preencher('Usuário', ' operador ');
  await preencher('Senha', 'senha-de-teste');
  await tocar('Mostrar senha');
  expect(app.root.findAllByType('TextInput').find(no => no.props.accessibilityLabel === 'Senha').props.secureTextEntry).toBe(false);
  await tocar('Ocultar senha');
  await tocar('Entrar');
  expect(sessao.signIn).toHaveBeenCalledWith('operador', 'senha-de-teste');
});

test.each([
  [401, 'Usuário ou senha incorretos.'],
  [503, 'O servidor não conseguiu concluir. Tente novamente em instantes.'],
])('mostra mensagem de login para erro HTTP %i', async (status, mensagem) => {
  sessao.signIn.mockRejectedValue({ isAxiosError: true, response: { status } });
  await montar(LoginScreen);
  await preencher('Usuário', 'operador');
  await preencher('Senha', 'errada');
  await tocar('Entrar');
  expect(temTexto(mensagem)).toBe(true);
});

test('abre opções gerenciais e encerra a sessão', async () => {
  await montar(MoreScreen);
  await aguardarTexto('Relatórios');
  for (const rota of ['Relatorios', 'Categorias', 'Lixeira']) {
    await tocar(rota === 'Relatorios' ? 'Relatórios' : rota);
    expect(navegacao.navigate).toHaveBeenLastCalledWith(rota);
  }
  await tocar('Sair da conta');
  expect(sessao.signOut).toHaveBeenCalledTimes(1);
});

test('limita as opções da conta ao perfil Caixa', async () => {
  configurarPerfil('CAIXA');
  await montar(MoreScreen);
  expect(temTexto('Relatórios')).toBe(false);
  expect(temTexto('Lixeira')).toBe(false);
  await tocar('Sair da conta');
  expect(sessao.signOut).toHaveBeenCalledTimes(1);
});

test('aguarda a leitura da permissão da câmera', async () => {
  useCameraPermissions.mockReturnValue([null, jest.fn()]);
  await montar(CodeCamera, {}, { onCode: jest.fn() });
  expect(temTexto('Verificando câmera…')).toBe(true);
});

test.each([true, false])('solicita acesso à câmera com canAskAgain=%s', async podePedir => {
  const pedir = jest.fn().mockResolvedValue({ granted: true });
  const ajustes = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  useCameraPermissions.mockReturnValue([{ granted: false, canAskAgain: podePedir }, pedir]);
  await montar(CodeCamera, {}, { onCode: jest.fn() });
  await tocar(podePedir ? 'Permitir câmera' : 'Abrir configurações');
  expect(podePedir ? pedir : ajustes).toHaveBeenCalledTimes(1);
});

test('ignora código vazio, bloqueia leituras duplicadas e controla lanterna', async () => {
  const receber = jest.fn();
  await montar(CodeCamera, {}, { onCode: receber });
  await tocar('Ligar lanterna');
  expect(app.root.findAll(no => no.type === 'View' && no.props.enableTorch === true)).toHaveLength(1);
  await tocar('Desligar lanterna');
  await lerCodigo(' ');
  expect(receber).not.toHaveBeenCalled();
  await lerCodigo(' 7891234567895 ');
  await lerCodigo('OUTRO');
  expect(receber).toHaveBeenCalledTimes(1);
  expect(receber).toHaveBeenCalledWith('7891234567895');
});

test('rejeita códigos longos e permite tentar outro código', async () => {
  const receber = jest.fn();
  await montar(CodeCamera, {}, { onCode: receber });
  await lerCodigo('A'.repeat(51));
  expect(temTexto('Este QR contém mais de 50 caracteres. Use um código curto do produto.')).toBe(true);
  expect(receber).not.toHaveBeenCalled();
  await tocar('Tentar outro código');
  await lerCodigo('CURTO');
  expect(receber).toHaveBeenCalledWith('CURTO');
});

test('fecha o modal depois de repassar o código lido', async () => {
  const fechar = jest.fn();
  const receber = jest.fn();
  await montar(CodeScannerModal, {}, { visible: true, onClose: fechar, onCode: receber });
  await lerCodigo('7891234567895');
  expect(receber).toHaveBeenCalledWith('7891234567895');
  expect(fechar).toHaveBeenCalledTimes(1);
  await tocar('Fechar câmera');
  expect(fechar).toHaveBeenCalledTimes(2);
});

test('encontra produto pelo código lido e abre seu detalhe', async () => {
  api.onGet('produto-skus/').reply(200, pagina([{ id: 1, produto: 1, codigo_barras: '7891234567895' }]));
  await montar(ScannerScreen);
  await lerCodigo('7891234567895');
  await aguardar(() => navegacao.replace.mock.calls.length > 0);
  expect(navegacao.replace).toHaveBeenCalledWith('ProdutoDetalhe', { id: produto.id });
  expect(api.history.get).toContainEqual(expect.objectContaining({ url: 'produto-skus/', params: { codigo_barras: '7891234567895' } }));
});

test('oferece cadastro quando o código não está associado e permite nova leitura', async () => {
  api.onGet('produto-skus/').reply(200, pagina([]));
  await montar(ScannerScreen);
  await lerCodigo('DESCONHECIDO');
  await aguardarTexto('Produto não encontrado');
  await tocar('Cadastrar produto com este código');
  expect(navegacao.navigate).toHaveBeenCalledWith('AdicionarProduto', { codigoInicial: 'DESCONHECIDO' });
  await tocar('Ler outro código');
  expect(temTexto('A leitura acontece automaticamente.')).toBe(true);
});

test('permite refazer busca de código após erro da API', async () => {
  api.onGet('produto-skus/').reply(503);
  await montar(ScannerScreen);
  await lerCodigo('TESTE');
  await aguardarTexto('Tentar novamente');
  api.onGet('produto-skus/').reply(200, []);
  await tocar('Tentar novamente');
  await aguardarTexto('Produto não encontrado');
});

test('calendário respeita a data mínima, navega entre meses e retorna a data escolhida', async () => {
  const escolher = jest.fn();
  await montar(DatePickerField, {}, { label: 'Validade', minDate: '2026-11-18', value: '', onChangeText: escolher });
  await tocar('Validade');
  const anterior = app.root.findAll(no => no.props.accessibilityLabel === 'Mês anterior' && typeof no.props.onPress === 'function')[0];
  expect(anterior.props.disabled).toBe(true);
  const ontem = app.root.findAll(no => no.props.accessibilityLabel === 'Selecionar 17/11/2026' && typeof no.props.onPress === 'function')[0];
  expect(ontem.props.disabled).toBe(true);
  await tocar('Próximo mês');
  expect(temTexto('dezembro de 2026')).toBe(true);
  await tocar('Mês anterior');
  await tocar('Selecionar 20/11/2026');
  expect(escolher).toHaveBeenCalledWith('2026-11-20');
});

test('cancelar o calendário preserva a seleção existente', async () => {
  const escolher = jest.fn();
  await montar(DatePickerField, {}, { label: 'Validade', minDate: '2026-11-18', value: '2026-12-25', onChangeText: escolher });
  await tocar('Validade');
  expect(temTexto('dezembro de 2026')).toBe(true);
  await tocar('Cancelar');
  expect(escolher).not.toHaveBeenCalled();
});

test('paginação avança e retorna com os limites corretos', async () => {
  const trocar = jest.fn();
  await montar(Pagination, {}, { page: 2, total: 60, pageSize: 20, onChange: trocar });
  expect(temTexto('2 de 3')).toBe(true);
  await tocar('Próxima');
  expect(trocar).toHaveBeenLastCalledWith(3);
  await tocar('Anterior');
  expect(trocar).toHaveBeenLastCalledWith(1);
});

test('revela o último campo focado e cancela a assinatura do teclado ao desmontar', async () => {
  let teclado;
  let callback;
  const remover = jest.fn();
  const rolar = jest.fn();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((evento, fn) => {
    expect(evento).toBe('keyboardDidShow');
    callback = fn;
    return { remove: remover };
  });
  function Sonda() {
    teclado = useKeyboardScroll();
    return null;
  }
  await montar(Sonda);
  teclado.scrollRef.current = { scrollResponderScrollNativeHandleToKeyboard: rolar };
  await act(async () => {
    teclado.onInputFocus({ target: 42 });
    teclado.onInputFocus({ target: 43 });
    await jest.advanceTimersByTimeAsync(120);
  });
  expect(rolar).toHaveBeenCalledTimes(1);
  expect(rolar).toHaveBeenCalledWith(43, 24, true);
  await act(async () => { callback(); });
  expect(rolar).toHaveBeenCalledTimes(2);
  await act(async () => { teclado.onInputFocus({ target: 44 }); app.unmount(); });
  expect(remover).toHaveBeenCalledTimes(1);
  await act(async () => { await jest.advanceTimersByTimeAsync(120); });
  expect(rolar).toHaveBeenCalledTimes(2);
});
