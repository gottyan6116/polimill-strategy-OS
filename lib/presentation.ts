export type NiceAxisOptions = { includeZero?: boolean; targetTicks?: number; padding?: number };
/** Stable readable ticks, including zero for signed data even if includeZero is false. */
export function niceAxis(values: (number | null)[], { includeZero = true, targetTicks = 5, padding = 0.08 }: NiceAxisOptions = {}) {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  let lo = finite.length ? Math.min(...finite) : 0, hi = finite.length ? Math.max(...finite) : 0;
  const zero = includeZero || (lo < 0 && hi > 0);
  if (zero) { lo = Math.min(0,lo); hi = Math.max(0,hi); }
  if (lo === hi) { if (lo === 0) hi = 1; else { const spread=Math.abs(lo)*0.1; lo-=spread; hi+=spread; } }
  const pad=(hi-lo)*Math.max(0,padding);
  const minData=lo===0 && zero ? 0 : lo-pad, maxData=hi===0 && zero ? 0 : hi+pad;
  const raw=(maxData-minData)/Math.max(1,Math.min(20,targetTicks)-1);
  const power=10**Math.floor(Math.log10(raw));
  const step=([1,2,2.5,5,10].find(v=>v*power>=raw) ?? 10)*power;
  const clean=(v:number)=>Number(v.toPrecision(14));
  const min=clean(Math.floor(minData/step)*step),max=clean(Math.ceil(maxData/step)*step);
  const ticks=Array.from({length:Math.round((max-min)/step)+1},(_,i)=>clean(min+i*step));
  return {min,max,step:clean(step),ticks};
}
/** Signed bars reserve a negative half only when negative values exist. */
export function profitBar(value: number, values: number[]) {
  const signed=values.some(v=>v<0), width=Math.abs(value)/(Math.max(0,...values.map(Math.abs)) || 1)*(signed?50:100);
  return {width,marginLeft:signed?(value<0?50-width:50):0};
}
export function axisDigits(step:number) { return Math.max(0, -Math.floor(Math.log10(step)) + (Number.isInteger(step / 10**Math.floor(Math.log10(step)))?0:1)); }
