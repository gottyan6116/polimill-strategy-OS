import { presentation } from "../../config/presentation";
export const number = (value: number | null, digits: number = presentation.precision.number): string =>
  value === null || !Number.isFinite(value) ? "—" : (Number(value.toFixed(digits))===0?0:value).toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const money = (value: number | null) => number(value, presentation.precision.money);
export const percent = (value: number | null) => value === null ? "—" : `${number(value,presentation.precision.percent)}%`;
export const count = (value: number | null) => value === null ? "—" : value.toLocaleString("ja-JP", { maximumFractionDigits: 6 });
export const times = (value: number | null) => value === null ? "—" : `${number(value,presentation.precision.times)}回`;
/** Backward-compatible name; reporting money now always uses integer million JPY. */
export const preciseMoney = money;
