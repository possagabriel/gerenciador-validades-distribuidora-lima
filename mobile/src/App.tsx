import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { AuthProvider } from './hooks/useAuth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 1, refetchOnReconnect: true } }
});

export default function App(): React.JSX.Element {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><AuthProvider>
    <RootNavigator /><StatusBar style="dark" />
  </AuthProvider></QueryClientProvider></SafeAreaProvider>;
}
