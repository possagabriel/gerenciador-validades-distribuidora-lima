import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Lote } from '../types/lote';
import { validadeDoLote } from './formatters';

const KIND = 'lima-validade-critica';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false })
});

export function dataAlerta(lote: Lote, now = new Date()): Date | null {
  const validade = validadeDoLote(lote);
  if (!validade || validade <= now) return null;
  // O lote já está crítico: avisar em breve, mantendo a notificação antes da validade.
  const trigger = new Date(now.getTime() + 60_000);
  return trigger < validade ? trigger : null;
}

export async function agendarAlertasCriticos(lotes: Lote[]): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('validade', {
      name: 'Validades críticas', importance: Notifications.AndroidImportance.HIGH
    });
  }
  const status = await Notifications.getPermissionsAsync();
  const permission = status.granted ? status : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  // Reconciliar apenas alertas deste app evita duplicatas após reabrir ou refazer a consulta.
  await cancelarAlertasCriticos();
  for (const lote of lotes.filter(item => item.nivel_vencimento === 2 && !item.esgotado).slice(0, 50)) {
    const date = dataAlerta(lote);
    if (!date) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Lote com validade crítica',
        body: `${lote.produto_nome} • ${lote.nome_lote} está próximo do vencimento.`,
        data: { kind: KIND, loteId: lote.id }
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === 'android' ? 'validade' : undefined }
    });
  }
}

export async function cancelarAlertasCriticos(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const item of scheduled) {
    if (item.content.data?.kind === KIND) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  }
}
