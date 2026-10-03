jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
  AppOwnership: { Expo: 'expo' }
}));

jest.mock('expo-notifications', () => {
  throw new Error('expo-notifications não pode ser carregado no Expo Go');
});

import { agendarAlertasCriticos, cancelarAlertasCriticos } from '../src/utils/notifications';

test('abre no Expo Go sem carregar expo-notifications', async () => {
  await expect(agendarAlertasCriticos([])).resolves.toBeUndefined();
  await expect(cancelarAlertasCriticos()).resolves.toBeUndefined();
});
