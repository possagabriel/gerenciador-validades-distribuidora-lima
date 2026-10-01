import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { common, colors } from '../components/theme';

export default function LoginScreen(): React.JSX.Element {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!username.trim() || !password) { setError('Informe usuário e senha.'); return; }
    setSubmitting(true); setError('');
    try { await signIn(username.trim(), password); }
    catch { setError('Não foi possível entrar. Confira as credenciais e a conexão.'); }
    finally { setSubmitting(false); }
  };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[common.page, { justifyContent: 'center' }]}>
    <View style={common.card}>
      <Text style={common.title}>Distribuidora Lima</Text>
      <Text style={[common.body, { marginBottom: 20 }]}>Gerenciador de Validades</Text>
      <TextInput accessibilityLabel="Usuário" placeholder="Usuário" autoCapitalize="none" value={username} onChangeText={setUsername} style={common.input} />
      <TextInput accessibilityLabel="Senha" placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} style={common.input} />
      {error ? <Text style={{ color: '#A32320' }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void submit()} style={[common.button, submitting && { opacity: 0.6 }]}>
        <Text style={common.buttonText}>{submitting ? 'Entrando…' : 'Entrar'}</Text>
      </Pressable>
    </View>
    <Text style={{ textAlign: 'center', color: colors.muted }}>Consulta de estoque e validade</Text>
  </KeyboardAvoidingView>;
}
