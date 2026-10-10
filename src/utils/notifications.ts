import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';
import type { Lote } from '../types/lote';
import { validadeDoLote } from './formatters';

const KIND = 'lima-validade-critica';

let notificationsModule: Promise<typeof import('expo-notifications')> | null = null;

function getNotifications(): Promise<typeof import('expo-notifications')> | null {
  // O import do módulo de push lança uma exceção no Expo Go para Android.
  if (Constants.appOwnership === AppOwnership.Expo) return null;
  notificationsModule ??= import('expo-notifications').then(notifications => {
    notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false })
    });
    return notifications;
  });
  return notificationsModule;
}

export function dataAlerta(lote: Lote, now = new Date()): Date | null {
  const validade = validadeDoLote(lote);
  if (!validade || validade <= now) return null;
  const inicioCritico = new Date(validade.getTime() - (lote.dias_critico ?? 7) * 86_400_000);
  if (inicioCritico > now) return inicioCritico;
  const imediato = new Date(now.getTime() + 60_000);
  return imediato < validade ? imediato : null;
}

export async function agendarAlertasCriticos(lotes: Lote[]): Promise<void> {
  const notifications = await getNotifications();
  if (!notifications) return;
  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('validade', {
      name: 'Validades críticas', importance: notifications.AndroidImportance.HIGH
    });
  }
  const status = await notifications.getPermissionsAsync();
  const permission = status.granted ? status : await notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  // Reconciliar apenas alertas deste app evita duplicatas após reabrir ou refazer a consulta.
  await cancelarAlertasCriticos();
  for (const lote of lotes.filter(item => !item.esgotado).slice(0, 50)) {
    const date = dataAlerta(lote);
    if (!date) continue;
    await notifications.scheduleNotificationAsync({
      content: {
        title: 'Lote com validade crítica',
        body: `${lote.produto_nome} • ${lote.nome_lote} está próximo do vencimento.`,
        data: { kind: KIND, loteId: lote.id }
      },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === 'android' ? 'validade' : undefined }
    });
  }
}

export async function cancelarAlertasCriticos(): Promise<void> {
  const notifications = await getNotifications();
  if (!notifications) return;
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.content.data?.kind === KIND) await notifications.cancelScheduledNotificationAsync(item.identifier);
  }
}
