import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

const MAX_AGE_MS = 90_000;

export function useRefreshOnFocus(scope: string, parameter?: string | number | boolean | (string | number | boolean)[]): void {
  const queryClient = useQueryClient();
  useFocusEffect(useCallback(() => {
    const queryKey = parameter === undefined ? [scope] : [scope, ...(Array.isArray(parameter) ? parameter : [parameter])];
    const state = queryClient.getQueryState(queryKey);
    if (state && (state.isInvalidated || state.status === 'error' ||
      (state.dataUpdatedAt > 0 && Date.now() - state.dataUpdatedAt > MAX_AGE_MS))) {
      void queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'active' });
    }
  }, [queryClient, scope, parameter]));
}
