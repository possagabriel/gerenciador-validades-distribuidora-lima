import { Text, View } from 'react-native';
import type { NivelVencimento } from '../types/lote';

const variants: Record<NivelVencimento, { label: string; background: string; foreground: string }> = {
  0: { label: 'OK', background: '#E4F3EC', foreground: '#236B44' },
  1: { label: 'Atenção', background: '#FFF0BC', foreground: '#775700' },
  2: { label: 'Crítico', background: '#FFD9D7', foreground: '#A32320' },
  3: { label: 'Vencido', background: '#E9DCEB', foreground: '#683279' }
};

export default function NivelVencimentoBadge({ nivel }: { nivel: NivelVencimento }): React.JSX.Element {
  const variant = variants[nivel];
  return <View style={{ backgroundColor: variant.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
    <Text style={{ color: variant.foreground, fontWeight: '700' }}>{variant.label}</Text>
  </View>;
}
