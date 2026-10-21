import { monthLabel, expenseCategories, monthlyTotals, roundMoney, type MonthFields } from "@/lib/operations";
import { niceAxis, axisDigits } from "@/lib/presentation";
import { presentation } from "@/config/presentation";
import { money, number } from "./format";
export type MonthBarsProps = { rows: MonthFields[]; profit?:boolean; budget?:(number|null)[]; closed?:boolean[]; forecast?:(number|null)[]; cumulative?:boolean };
export function MonthBars({rows,profit=false,budget,closed,forecast,cumulative=false}:MonthBarsProps) {
 const raw=rows.map(r=>profit?monthlyTotals([r]).operatingProfit:r.revenue);
 const cumulativeValues=(values:(number|null)[])=>{let sum=0,missing=false;return values.map(v=>{if(v===null)missing=true;else sum+=v;return missing?null:sum;});};
 // Without explicit closing metadata, legacy actuals remain visible as provisional values.
 const actualRaw=raw.map((v,i)=>!closed||closed[i]?v:null);
 const futureRaw=raw.map((_,i)=>closed&&!closed[i]?forecast?.[i]??null:null);
 // Cumulative actuals end at the last closed period; forecast sums closed actuals and future forecasts.
 const actual=cumulative?cumulativeValues(actualRaw):actualRaw;
 const forecastValues=cumulative?cumulativeValues(raw.map((v,i)=>closed?.[i]?v:forecast?.[i]??null)).map((v,i)=>closed?.[i]?null:v):futureRaw;
 const budgets=budget?(cumulative?cumulativeValues(budget):budget):[];
 const a=niceAxis([...actual,...forecastValues,...budgets]),y=(v:number)=>20+(a.max-v)/(a.max-a.min)*165;
 const endpoints = [
   {name:closed?"実績":"仮実績",values:actual,color:presentation.chart.actual},
   {name:"見込み",values:forecastValues,color:presentation.chart.forecast},
   {name:"予算",values:budgets,color:presentation.chart.budget},
 ].flatMap(series=>{
   let index=series.values.length-1;
   while(index>=0 && series.values[index]===null) index--;
   return index<0?[]:[{...series,index,value:series.values[index]!}];
 }).sort((first,second)=>y(first.value)-y(second.value));
 let previousLabelY=2;
 const directLabels=endpoints.map((endpoint,index)=>{
   const labelY=Math.max(previousLabelY+18,Math.min(185-(endpoints.length-1-index)*18,y(endpoint.value)));
   previousLabelY=labelY;
   return {...endpoint,labelY};
 });
 return <><div className="finance-chart-unit">{presentation.units.money} · {cumulative?"累計":"単月"}</div><svg className="ops-month-chart" viewBox="0 0 800 225" role="img" aria-label={`${profit?"営業損益":"売上高"}の${cumulative?"累計":"単月"}推移。濃色は締め済み実績、淡色は見込み、点線は予算。`}>
 {a.ticks.map(v=><g key={v}><line x1="62" x2="604" y1={y(v)} y2={y(v)} stroke={v===0?presentation.chart.axis:presentation.chart.grid}/><text x="54" y={y(v)+3} textAnchor="end" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{number(v,axisDigits(a.step))}</text></g>)}
 {raw.map((_,i)=><g key={i}>{[{v:actual[i],forecast:false},{v:forecastValues[i],forecast:true}].map(({v,forecast:f})=>v===null||v===undefined?null:<rect key={String(f)} x={72+i*44} y={Math.min(y(v),y(0))} width="19" height={Math.abs(y(v)-y(0))} fill={f?presentation.chart.forecast:v<0?presentation.chart.negative:presentation.chart.actual}><title>{monthLabel(i)} {f?"見込み":closed?.[i]?"締め済み実績":"未締め仮実績"}：{money(v)}百万円</title></rect>)}<text x={81+i*44} y="211" textAnchor="middle" fill={presentation.chart.text} fontSize={presentation.typography.chart}>{monthLabel(i)}</text></g>)}
 {budgets.map((v,i)=>{
   if(v===null) return null;
   const previous=i>0?budgets[i-1]:null,next=i+1<budgets.length?budgets[i+1]:null;
   if(previous!==null && previous!==undefined) return <line key={i} x1={81+(i-1)*44} x2={81+i*44} y1={y(previous)} y2={y(v)} stroke={presentation.chart.budget} strokeWidth={1.2} strokeDasharray="3 3"/>;
   return next===null||next===undefined?<line key={i} x1={72+i*44} x2={91+i*44} y1={y(v)} y2={y(v)} stroke={presentation.chart.budget} strokeWidth={1.2} strokeDasharray="3 3"><title>{monthLabel(i)} 予算：{money(v)}百万円</title></line>:null;
 })}
 {directLabels.map(endpoint=><g key={endpoint.name}>
   <line x1={94+endpoint.index*44} x2="620" y1={y(endpoint.value)} y2={endpoint.labelY} stroke={endpoint.color} strokeWidth={.8} strokeDasharray={endpoint.name==="予算"?"3 3":undefined}/>
   <text x="628" y={endpoint.labelY+4} fontSize={presentation.typography.chart} fill={endpoint.name==="見込み"?presentation.chart.text:endpoint.color}>{endpoint.name} {money(endpoint.value)}</text>
 </g>)}
 </svg></>;
}
/** Kept as an export for existing callers; expense comparisons use descending bars. */
export function ExpenseDonut({rows}:{rows:MonthFields[]}) {
 const entries=expenseCategories.map(c=>({...c,value:roundMoney(rows.reduce((n,r)=>n+r[c.key],0))})).sort((a,b)=>b.value-a.value),total=monthlyTotals(rows).expenses;
 const a=niceAxis(entries.map(c=>c.value)),left=170,width=310,x=(v:number)=>left+(v-a.min)/(a.max-a.min)*width,h=entries.length*38+52;
 return <><div className="finance-chart-unit">{presentation.units.money}</div><svg viewBox={`0 0 600 ${h}`} className="ops-expense-bars" style={{width:"100%"}} role="img" aria-label={`費用内訳の降順比較、合計${money(total)}百万円。${entries.map(c=>`${c.label}${money(c.value)}百万円`).join("、")}`}>
 {a.ticks.map(v=><g key={v}><line x1={x(v)} x2={x(v)} y1="8" y2={h-32} stroke={v===0?presentation.chart.axis:presentation.chart.grid}/><text x={x(v)} y={h-14} textAnchor="middle" fontSize={presentation.typography.chart} fill={presentation.chart.text}>{number(v,axisDigits(a.step))}</text></g>)}
 {entries.map((c,i)=><g key={c.key}><text x={left-12} y={i*38+28} textAnchor="end" fontSize={presentation.typography.chart} fill={presentation.chart.text}>{c.label}</text><rect x={Math.min(x(0),x(c.value))} y={i*38+12} width={Math.abs(x(c.value)-x(0))} height="23" fill={presentation.chart.actual}/><text x="590" y={i*38+28} textAnchor="end" fontSize={presentation.typography.chart} fill={presentation.chart.text}>{money(c.value)} / <tspan fontSize={presentation.typography.chart}>{total>0?`${number(c.value/total*100)}%`:"—"}</tspan></text></g>)}
 </svg></>;
}
