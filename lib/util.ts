import MONTH_NAMES from '../data/month_names';


export function formatUnixDate(unix?: number): string {
  const date = new Date(unix*1000);
  if (isNaN(date.valueOf())) {
    return '';
  } else {
    const month = MONTH_NAMES[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }
}


export function isCardExpired(exp_month: number, exp_year: number): boolean {
  const date = new Date;
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return exp_year < year || (exp_year == year && exp_month < month);
}
