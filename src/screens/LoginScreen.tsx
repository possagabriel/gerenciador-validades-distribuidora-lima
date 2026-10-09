import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardScroll } from '../hooks/useKeyboardScroll';
import { mensagemErro } from '../api/errors';
import ActionButton from '../components/ActionButton';
import { common, colors, radius, spacing } from '../components/theme';

export default function LoginScreen(): React.JSX.Element {
  const { signIn } = useAuth();
  const { scrollRef, onInputFocus } = useKeyboardScroll();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!username.trim() || !password) { setError('Informe usuário e senha.'); return; }
    setSubmitting(true); setError('');
    try { await signIn(username.trim(), password); }
    catch (cause) {
      setError(axios.isAxiosError(cause) && cause.response?.status === 401
        ? 'Usuário ou senha incorretos.'
        : mensagemErro(cause, 'Não foi possível entrar. Tente novamente.'));
    } finally { setSubmitting(false); }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={common.page} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={{ width: 56, height: 56, borderRadius: radius.input, backgroundColor: colors.greenDark,
        justifyContent: 'center', alignItems: 'center', marginBottom: 22 }}>
        <Text style={{ color: colors.white, fontSize: 23, fontWeight: '800' }}>DL</Text>
      </View>
      <Text style={[common.eyebrow, { marginBottom: 7 }]}>DISTRIBUIDORA LIMA</Text>
      <Text style={common.title}>Entre na sua conta</Text>
      <Text style={[common.body, { color: colors.muted, marginTop: 9, marginBottom: 28 }]}>
        Consulte produtos e lotes da distribuidora.
      </Text>
      <View style={[common.card, { padding: spacing.lg }]}>
        <Text style={[common.muted, { marginBottom: 7 }]}>Usuário</Text>
        <TextInput accessibilityLabel="Usuário" placeholder="Seu usuário" autoCapitalize="none" autoComplete="username"
          value={username} onChangeText={setUsername} onFocus={onInputFocus} style={[common.input, { marginBottom: 18 }]} />
        <Text style={[common.muted, { marginBottom: 7 }]}>Senha</Text>
        <View style={{ marginBottom: 20 }}>
          <TextInput accessibilityLabel="Senha" placeholder="Sua senha" secureTextEntry={!showPassword}
            autoComplete="password" value={password} onChangeText={setPassword} onFocus={onInputFocus} style={[common.input, { paddingRight: 78 }]} />
          <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onPress={() => setShowPassword(value => !value)} style={{ position: 'absolute', right: 6, top: 2, minWidth: 70, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.greenDark, fontWeight: '700' }}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        </View>
        {error ? <View style={{ backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.input, marginBottom: spacing.base }}>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>
        </View> : null}
        <ActionButton label="Entrar" onPress={() => void submit()} loading={submitting} />
      </View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
