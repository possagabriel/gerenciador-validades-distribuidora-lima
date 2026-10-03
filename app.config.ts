import type { ExpoConfig } from 'expo/config';

const apiBaseUrl = process.env.API_BASE_URL ?? '';
const localHttp = apiBaseUrl.startsWith('http://');

const config: ExpoConfig = {
  name: 'Gerenciador de Validades — Distribuidora Lima',
  slug: 'gerenciador-validades-lima',
  scheme: 'validadeslima',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.distribuidoralima.validades', supportsTablet: true,
    ...(localHttp ? { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } } : {})
  },
  android: { package: 'com.distribuidoralima.validades', permissions: ['CAMERA', 'POST_NOTIFICATIONS'] },
  plugins: [
    ['expo-camera', { cameraPermission: 'Permitir a leitura de códigos de barras pela câmera.', recordAudioAndroid: false, barcodeScannerEnabled: true }],
    'expo-notifications',
    'expo-secure-store',
    ['expo-build-properties', { android: { usesCleartextTraffic: localHttp } }]
  ],
  extra: { apiBaseUrl }
};

export default config;
