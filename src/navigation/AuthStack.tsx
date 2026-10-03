import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import type { AuthStackParams } from './types';

const Stack = createNativeStackNavigator<AuthStackParams>();
export default function AuthStack(): React.JSX.Element {
  return <Stack.Navigator screenOptions={{ headerShown: false }}><Stack.Screen name="Login" component={LoginScreen} /></Stack.Navigator>;
}
