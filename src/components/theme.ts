import { StyleSheet } from 'react-native';

export const colors = {
  green: '#176B50', greenDark: '#174333', greenSoft: '#E8F3EC',
  background: '#F6F7F4', ink: '#17251E', muted: '#52635A',
  border: '#DCE4DD', white: '#FFFFFF', danger: '#A32D32',
  dangerSoft: '#FCEAEA', amber: '#795700', amberSoft: '#FFF3D2',
  paleInk: '#BEDFCB', purple: '#63347A', purpleSoft: '#F1E7F4'
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const radius = { input: 10, card: 14, feature: 18, pill: 999 } as const;
export const type = { caption: 12, small: 14, body: 16, section: 18, title: 28, metric: 40 } as const;
export const shadow = { elevation: 1, shadowColor: colors.ink, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } } as const;

export const common = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  content: { paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: spacing.base, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  title: { fontSize: type.title, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, color: colors.ink },
  heading: { fontSize: type.section, lineHeight: 24, fontWeight: '700', color: colors.ink },
  body: { color: colors.ink, fontSize: type.body, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: type.small, lineHeight: 21 },
  eyebrow: { color: colors.greenDark, fontSize: type.caption, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  button: { backgroundColor: colors.green, minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: spacing.base, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: type.body },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, minHeight: 48, paddingHorizontal: spacing.base, paddingVertical: spacing.md, backgroundColor: colors.white, color: colors.ink, fontSize: type.body },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md }
});
