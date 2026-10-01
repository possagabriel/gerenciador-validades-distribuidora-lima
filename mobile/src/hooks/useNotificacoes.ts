import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listarLotes } from '../api/lotes';
import { agendarAlertasCriticos } from '../utils/notifications';

export function useNotificacoes(): void {
  const query = useQuery({ queryKey: ['lotes', 2], queryFn: () => listarLotes(2), staleTime: 5 * 60_000 });
  useEffect(() => {
    if (query.data) void agendarAlertasCriticos(query.data).catch(() => undefined);
  }, [query.data]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void query.refetch();
    });
    return () => subscription.remove();
  }, [query.refetch]);
}
