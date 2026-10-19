export const number = (value: number | null, digits = 1) =>
  value === null
    ? "—"
    : value.toLocaleString("ja-JP", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
export const money = (value: number) => number(value, 1);
export const percent = (value: number | null) =>
  value === null ? "—" : `${number(value)}%`;
export const times = (value: number | null) =>
  value === null ? "—" : `${number(value, 2)}回`;
export const preciseMoney=(value:number)=>value.toLocaleString('ja-JP',{maximumFractionDigits:6});
