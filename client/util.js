
export function isCardExpired(exp_month, exp_year) {
  const date = new Date;
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return exp_year < year || (exp_year == year && exp_month < month);
}
