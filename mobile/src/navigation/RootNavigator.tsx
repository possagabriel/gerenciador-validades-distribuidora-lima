import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import { useAuth } from '../hooks/useAuth';
import LoadingState from '../components/LoadingState';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cancelarAlertasCriticos } from '../utils/notifications';

export default function RootNavigator(): React.JSX.Element {
  const { authenticated, loading } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!loading && !authenticated) {
      queryClient.clear();
      void cancelarAlertasCriticos().catch(() => undefined);
    }
  }, [authenticated, loading, queryClient]);
  if (loading) return <LoadingState label="Restaurando sessão…" />;
  return <NavigationContainer>{authenticated ? <AppTabs /> : <AuthStack />}</NavigationContainer>;
}
