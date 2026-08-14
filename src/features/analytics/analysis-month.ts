import { isValidMonth } from '../../preferences/browser-preferences';

export function analysisMonthBounds(month: string) {
  if (!isValidMonth(month)) throw new Error('Invalid analysis month');
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}
