import type { Kpi, Workspace } from "@/lib/model";
import { getKpiConfig } from "@/config/management";
import { presentation } from "@/config/presentation";
import { niceAxis, axisDigits } from "@/lib/presentation";
import { number } from "./finance/format";
export default function TrendChart({ kpi, history,values:observations }: { kpi: Kpi; history: Workspace["history"];values?:NonNullable<Workspace['management']>['values'] }) {
  const actual = history.filter(h => h.kpi_id === kpi.id).sort((a,b) => a.month.localeCompare(b.month));
  const plan = getKpiConfig(kpi,observations).monthlyPlan;
  const months = [...new Set([...actual.map(p => p.month), ...Object.keys(plan)])].sort();
  const actualMap = new Map(actual.map(p => [p.month,p.value]));
  const axis = niceAxis([...actual.map(p => p.value), ...Object.values(plan)]);
  const width=640, height=230, left=64, right=530, top=18, bottom=190;
  const x=(i:number)=>left+i*(right-left)/Math.max(1,months.length-1);
  const y=(v:number)=>bottom-(v-axis.min)/(axis.max-axis.min)*(bottom-top);
  const path=(values:(number|null)[])=>values.map((v,i)=>v===null?"":`${i===0||values[i-1]===null?"M":"L"}${x(i)},${y(v)}`).join(" ");
  const values=months.map(m=>actualMap.get(m)??null), plans=months.map(m=>plan[m]??null);
  const label=(series:(number|null)[],name:string,color:string)=>{const i=series.map(v=>v!==null).lastIndexOf(true);return i<0?null:<text x={x(i)+8} y={y(series[i]!)+4} fill={color} fontSize={presentation.typography.chart}>{name}</text>;};
  return <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${kpi.name}の月次実績と対象月計画。単位：${kpi.unit}。年目標は表示していません。`}>
    {axis.ticks.map(t=><g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke={t===0?presentation.chart.axis:presentation.chart.grid}/><text x={left-9} y={y(t)+4} textAnchor="end" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{number(t,axisDigits(axis.step))}</text></g>)}
    <path d={path(values)} fill="none" stroke={presentation.chart.actual} strokeWidth="2"/>
    <path d={path(plans)} fill="none" stroke={presentation.chart.budget} strokeWidth="1.5" strokeDasharray="5 4"/>
    {label(values,"実績",presentation.chart.actual)}{label(plans,"対象月計画",presentation.chart.budget)}
    {months.map((m,i)=><text key={m} x={x(i)} y={bottom+20} textAnchor="middle" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{m.slice(2)}</text>)}
    {!actual.length&&<text x="300" y="85" textAnchor="middle" fill={presentation.chart.text}>月次実績は未設定です</text>}
    {!plans.some(v=>v!==null)&&<text x="300" y="110" textAnchor="middle" fill={presentation.chart.text}>対象月計画は未設定です</text>}
  </svg>;
}
