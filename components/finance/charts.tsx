import type { FinanceMetrics } from "@/lib/finance";
import { niceAxis, axisDigits } from "@/lib/presentation";
import { presentation } from "@/config/presentation";
import { money, number } from "./format";
type Series = { name:string; color:string; values:(number|null)[]; type?:"bar"|"line" };
export function SeriesChart({labels,series,label,unit}:{labels:string[];series:Series[];label:string;unit:string}) {
 const a=niceAxis(series.flatMap(s=>s.values)), w=760,h=250,left=64,right=150,top=22,bottom=38;
 const y=(v:number)=>top+(a.max-v)/(a.max-a.min)*(h-top-bottom), group=(w-left-right)/Math.max(1,labels.length),x=(i:number)=>left+group*(i+.5);
 const bars=series.filter(s=>s.type==="bar"), bw=Math.min(34,group*.65/Math.max(1,bars.length));
 const ends=series.map(s=>{let i=s.values.length-1;while(i>=0&&s.values[i]===null)i--;return {s,i,value:s.values[i]};}).filter(e=>e.i>=0&&e.value!==null).sort((a,b)=>y(a.value!)-y(b.value!));
 const labelY=new Map<string,number>(); let prev=top-18;
 ends.forEach((e,i)=>{const next=Math.max(prev+18,Math.min(h-bottom-(ends.length-1-i)*18,y(e.value!)));labelY.set(e.s.name,next);prev=next;});
 return <><div className="finance-chart-unit">{unit}</div><svg className="finance-series" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
 {a.ticks.map(v=><g key={v}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} stroke={v===0?presentation.chart.axis:presentation.chart.grid}/><text x={left-10} y={y(v)+4} textAnchor="end" fontSize={presentation.typography.chart} fill={presentation.chart.text}>{number(v,axisDigits(a.step))}</text></g>)}
 {series.map(s=><g key={s.name}>{s.type==="bar"?s.values.map((v,i)=>v===null?null:<rect key={i} x={x(i)+(bars.indexOf(s)-(bars.length-1)/2)*bw-bw*.43} y={Math.min(y(v),y(0))} width={bw*.86} height={Math.abs(y(v)-y(0))} fill={s.color}><title>{s.name} {labels[i]}: {number(v,unit==="百万円"?0:1)}{unit}</title></rect>):s.values.map((v,i)=>v!==null&&i>0&&s.values[i-1]!==null?<line key={i} x1={x(i-1)} x2={x(i)} y1={y(s.values[i-1]!)} y2={y(v)} stroke={s.color} strokeWidth={2.5}/>:null)}</g>)}
 {ends.map(({s,i,value})=><g key={s.name}><line x1={x(i)+5} x2={w-right+10} y1={y(value!)} y2={labelY.get(s.name)} stroke={s.color} strokeWidth={.8}/><text x={w-right+14} y={labelY.get(s.name)!+4} fontSize={presentation.typography.chart} fill={s.color}>{s.name}</text></g>)}
 {labels.map((l,i)=><text key={`${l}-${i}`} x={x(i)} y={h-12} textAnchor="middle" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{l}</text>)}
 </svg></>;
}
export function CashBridge({metrics:m}:{metrics:FinanceMetrics}) {
 const entries=[{label:"期首現預金",value:m.openingCash,total:true},{label:"営業CF",value:m.operatingCf},{label:"投資CF",value:m.investingCf},{label:"財務CF",value:m.financingCf},{label:"期末現預金",value:m.closingCash,total:true}];
 let balance=0;const steps=entries.map(e=>{const start=e.total?0:balance,end=e.total?e.value:balance+e.value;balance=end;return {...e,start,end};});
 const a=niceAxis(steps.flatMap(s=>[s.start,s.end]),{padding:.15}),y=(v:number)=>25+(a.max-v)/(a.max-a.min)*180,x=(i:number)=>65+i*130;
 return <svg viewBox="0 0 740 255" className="cash-bridge" role="img" aria-label={`現預金の増減（百万円）。${entries.map(e=>`${e.label}${money(e.value)}`).join("、")}`}>
 {a.ticks.map(v=><g key={v}><line x1={55} x2={720} y1={y(v)} y2={y(v)} stroke={v===0?presentation.chart.axis:presentation.chart.grid}/><text x={48} y={y(v)+4} textAnchor="end" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{number(v,axisDigits(a.step))}</text></g>)}
 {steps.map((s,i)=><g key={s.label}><rect x={x(i)} y={Math.min(y(s.start),y(s.end))} width={95} height={Math.max(1,Math.abs(y(s.end)-y(s.start)))} fill={s.total?presentation.chart.total:s.value>=0?presentation.chart.positive:presentation.chart.negative}/><text x={x(i)+47.5} y={Math.max(15,Math.min(y(s.start),y(s.end))-8)} textAnchor="middle" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{!s.total&&s.value>0?"+":""}{money(s.value)}</text><text x={x(i)+47.5} y={239} textAnchor="middle" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{s.label}</text>{i<steps.length-1&&<line x1={x(i)+95} x2={x(i+1)} y1={y(s.end)} y2={y(s.end)} stroke={presentation.chart.axis} strokeDasharray="4 3"/>}</g>)}
 </svg>;
}
