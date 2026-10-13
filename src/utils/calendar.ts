export function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  const date = new Date(year, month - 1, day, 12);
  return dateToISO(date) === value ? date : null;
}

export function monthCells(year: number, month: number): (number | null)[] {
  const offset = (new Date(year, month, 1, 12).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0, 12).getDate();
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
}
