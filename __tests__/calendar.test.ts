import { dateFromISO, dateToISO, monthCells } from '../src/utils/calendar';

test('converte apenas datas reais sem deslocar o dia', () => {
  expect(dateToISO(dateFromISO('2028-02-29')!)).toBe('2028-02-29');
  expect(dateFromISO('2027-02-29')).toBeNull();
  expect(dateFromISO('2028-13-01')).toBeNull();
});

test('monta o mês começando na segunda-feira', () => {
  const cells = monthCells(2026, 9);
  expect(cells.slice(0, 3)).toEqual([null, null, null]);
  expect(cells[3]).toBe(1);
  expect(cells.at(-1)).toBe(31);
});
