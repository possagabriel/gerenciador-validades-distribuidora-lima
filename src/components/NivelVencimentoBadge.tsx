import { Text, View } from 'react-native';
import type { NivelVencimento } from '../types/lote';
import { colors, radius, type } from './theme';

const variants: Record<NivelVencimento, { label: string; background: string; foreground: string }> = {
  0: { label: 'Em dia', background: colors.greenSoft, foreground: colors.greenDark },
  1: { label: 'Atenção', background: colors.amberSoft, foreground: colors.amber },
  2: { label: 'Crítico', background: colors.dangerSoft, foreground: colors.danger },
  3: { label: 'Vencido', background: colors.purpleSoft, foreground: colors.purple }
};

export default function NivelVencimentoBadge({ nivel }: { nivel: NivelVencimento }): React.JSX.Element {
  const variant = variants[nivel];
  return <View style={{ backgroundColor: variant.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill }}>
    <Text style={{ color: variant.foreground, fontWeight: '700', fontSize: type.caption }}>{variant.label}</Text>
  </View>;
}
