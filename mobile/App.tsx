import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/lib/auth';
import RootNavigator from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
