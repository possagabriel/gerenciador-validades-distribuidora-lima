import { StyleSheet } from 'react-native';

export const colors = { green: '#156053', background: '#F4F7F5', ink: '#18312D', muted: '#667B75', border: '#D8E3DE', white: '#FFFFFF' };

export const common = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  heading: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { color: colors.ink, fontSize: 15, marginTop: 5 },
  muted: { color: colors.muted, fontSize: 13, marginTop: 4 },
  button: { backgroundColor: colors.green, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 13, backgroundColor: colors.white, color: colors.ink, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
});
