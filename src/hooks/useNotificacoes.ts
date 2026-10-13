import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Constants, { AppOwnership } from 'expo-constants';
import { obterAlertas } from '../api/lotes';
import { agendarAlertasCriticos } from '../utils/notifications';

export function useNotificacoes(): void {
  const query = useQuery({ queryKey: ['alertas'], queryFn: obterAlertas, staleTime: 5 * 60_000,
    enabled: Constants.appOwnership !== AppOwnership.Expo });
  useEffect(() => {
    if (query.data) void agendarAlertasCriticos(query.data).catch(() => undefined);
  }, [query.data]);
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', state => {
      if (previousState !== 'active' && state === 'active' && Date.now() - query.dataUpdatedAt > 90_000) {
        void query.refetch();
      }
      previousState = state;
    });
    return () => subscription.remove();
  }, [query.refetch, query.dataUpdatedAt]);
}
