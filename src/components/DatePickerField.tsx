import { useState } from 'react';
import { Keyboard, Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dateFromISO, dateToISO, monthCells } from '../utils/calendar';
import { formatarData } from '../utils/formatters';
import { colors, common, radius, spacing } from './theme';

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export default function DatePickerField({ label, value, onChangeText, minDate }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  minDate: string;
}): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(() => dateFromISO(value) ?? dateFromISO(minDate) ?? new Date());
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const currentMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const canGoBack = currentMonth > minDate.slice(0, 7);

  const open = () => {
    Keyboard.dismiss();
    const selected = dateFromISO(value);
    const minimum = dateFromISO(minDate) ?? new Date();
    const target = selected && value >= minDate ? selected : minimum;
    setMonth(new Date(target.getFullYear(), target.getMonth(), 1, 12));
    setVisible(true);
  };

  const moveMonth = (difference: number) => {
    setMonth(new Date(year, monthIndex + difference, 1, 12));
  };

  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open}
      style={({ pressed }) => [common.input, common.row, { marginBottom: 12 }, pressed && { backgroundColor: colors.greenSoft }]}>
      <Text style={{ color: value ? colors.ink : colors.muted, fontSize: 16 }}>
        {value ? formatarData(value) : 'Selecionar no calendário'}
      </Text>
      <Ionicons name="calendar-outline" size={21} color={colors.greenDark} />
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.48)' }}>
        <Pressable accessibilityLabel="Fechar calendário" onPress={() => setVisible(false)}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{ width: '100%', maxWidth: 420, backgroundColor: colors.white, padding: spacing.base, borderRadius: radius.feature }}>
          <Text style={[common.heading, { marginBottom: 16 }]}>{label}</Text>
          <View style={[common.row, { marginBottom: 14 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={!canGoBack}
              onPress={() => moveMonth(-1)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', opacity: canGoBack ? 1 : 0.3 }}>
              <Ionicons name="chevron-back" size={24} color={colors.greenDark} />
            </Pressable>
            <Text style={[common.heading, { textTransform: 'capitalize', fontSize: 16 }]}>{monthFormatter.format(month)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={24} color={colors.greenDark} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {weekdays.map(day => <Text key={day} style={[common.muted, { width: '14.2857%', textAlign: 'center', fontWeight: '700' }]}>{day}</Text>)}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {monthCells(year, monthIndex).map((day, index) => {
              if (day === null) return <View key={`blank-${index}`} style={{ width: '14.2857%', height: 46 }} />;
              const iso = dateToISO(new Date(year, monthIndex, day, 12));
              const disabled = iso < minDate;
              const selected = iso === value;
              return <Pressable key={iso} accessibilityRole="button" accessibilityLabel={`Selecionar ${formatarData(iso)}`}
                accessibilityState={{ disabled, selected }} disabled={disabled}
                onPress={() => { onChangeText(iso); setVisible(false); }}
                style={{ width: '14.2857%', height: 46, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: selected ? colors.green : 'transparent', borderRadius: radius.pill, opacity: disabled ? 0.3 : 1 }}>
                <Text style={{ color: selected ? colors.white : colors.ink, fontWeight: selected ? '700' : '400' }}>{day}</Text>
              </Pressable>;
            })}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ color: colors.greenDark, fontWeight: '700' }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
