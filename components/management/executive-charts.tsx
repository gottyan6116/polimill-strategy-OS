"use client";
import {useEffect,useRef,useState} from 'react';
import {executiveConfig as config} from '@/config/executive';
import {evaluationLabels} from '@/config/management';
import {niceAxis,axisDigits} from '@/lib/presentation';
import type {TrendPoint} from '@/lib/executive';
import {money,number,percent,count} from '../finance/format';
type SeriesKey='actual'|'target'|'achievement';
export function ComparisonChart({rows,annual=false}:{rows:TrendPoint[];annual?:boolean}){
 const root=useRef<HTMLDivElement>(null),[width,setWidth]=useState(420),[hidden,setHidden]=useState<string[]>([]),[tip,setTip]=useState('');
 useEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(Math.max(280,Math.floor(entries[0].contentRect.width))));if(root.current)observer.observe(root.current);return()=>observer.disconnect()},[]);
 const labels={actual:'実績',target:annual?'営業利益':'目標',achievement:'達成率'},colors={actual:config.colors.actual,target:annual?config.colors.profit:config.colors.target,achievement:config.colors.achievement};
 const shown=(key:string)=>!hidden.includes(key),series:SeriesKey[]=annual?['actual','target']:['actual','target','achievement'];
 const axis=niceAxis(rows.flatMap(row=>[shown('actual')?row.actual:null,shown('target')?row.target:null]),{targetTicks:4}),ratios=rows.map(r=>r.actual===null||r.target===null||r.target<=0?null:r.actual/r.target*100),ratioAxis=niceAxis([100,...ratios],{targetTicks:3,padding:0}),hasRatio=ratios.some(v=>v!==null);
 const left=55,right=annual?12:40,top=20,bottom=183,plot=width-left-right,step=plot/Math.max(1,rows.length),x=(i:number)=>left+step*(i+.5),y=(v:number)=>top+(axis.max-v)/(axis.max-axis.min)*(bottom-top),ry=(v:number)=>top+(ratioAxis.max-v)/(ratioAxis.max-ratioAxis.min)*(bottom-top),bar=Math.min(28,step*.35);
 const hasValue=rows.some(r=>(shown('actual')&&r.actual!==null)||(shown('target')&&r.target!==null));
 const desc=(r:TrendPoint,i:number)=>`${r.period}：${annual?'売上高':'実績'} ${r.actual===null?'未設定':money(r.actual)+'百万円'}、${labels.target} ${r.target===null?'未設定':money(r.target)+'百万円'}${annual?'':`、達成率 ${percent(ratios[i])}`}`;
 return <div className="exec-comparison" ref={root}>
  <div className="exec-chart-legend" aria-label={annual?'年度比較の系列':'売上推移の系列'}>{series.map(key=><button key={key} aria-pressed={shown(key)} onClick={()=>setHidden(current=>current.includes(key)?current.filter(k=>k!==key):[...current,key])}><i style={{background:colors[key]}}/>{annual&&key==='actual'?'売上高':labels[key]}</button>)}</div>
  <div className="exec-chart-unit">百万円{!annual&&hasRatio&&' / 右軸：達成率 %'}</div>
  <svg width="100%" viewBox={`0 0 ${width} 225`} className="exec-comparison-svg" role="group" aria-label={annual?'年度別売上高と営業利益の比較':'売上高の実績・月別目標・達成率'}>
   {axis.ticks.map(v=><g key={v}><line x1={left} x2={width-right} y1={y(v)} y2={y(v)} stroke={v===0?'var(--chart-axis)':'var(--chart-grid)'}/><text x={left-7} y={y(v)+4} textAnchor="end">{number(v,axisDigits(axis.step))}</text></g>)}
   {!annual&&hasRatio&&shown('achievement')&&ratioAxis.ticks.map(v=><text key={v} x={width-right+6} y={ry(v)+4}>{number(v,0)}%</text>)}
   {rows.map((row,i)=><g key={row.period} role="button" tabIndex={0} aria-label={desc(row,i)} onMouseEnter={()=>setTip(desc(row,i))} onFocus={()=>setTip(desc(row,i))} onClick={()=>setTip(desc(row,i))} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setTip(desc(row,i))}if(event.key==='Escape')setTip('')}}>
    <title>{desc(row,i)}</title><rect x={x(i)-step/2+1} y={top} width={Math.max(1,step-2)} height={bottom-top} fill="transparent"/>
    {(['actual','target'] as const).map((key,index)=>row[key]!==null&&shown(key)?<rect key={key} x={x(i)+(index-1)*bar} y={Math.min(y(row[key]!),y(0))} width={Math.max(1,bar-2)} height={Math.abs(y(row[key]!)-y(0))} fill={colors[key]}/>:null)}
    {(rows.length<8||width>580||i%2===0||i===rows.length-1)&&<text x={x(i)} y={205} textAnchor="middle">{row.period.match(/^\d{4}-\d{2}$/)?`${Number(row.period.slice(5))}月`:row.period.replace('年度','').replace('（選択','(').replace('か月）','月)')}</text>}
   </g>)}
   {!annual&&shown('achievement')&&ratios.map((v,i)=>v!==null&&i>0&&ratios[i-1]!==null?<line key={i} x1={x(i-1)} x2={x(i)} y1={ry(ratios[i-1]!)} y2={ry(v)} stroke={colors.achievement} strokeWidth={2}/>:null)}
   {!hasValue&&<text x={left+plot/2} y={100} textAnchor="middle">表示できる値は未設定です</text>}
  </svg>
  <output className="exec-chart-tip" aria-live="polite">{tip||'棒を選択・ホバーすると数値を確認できます。'}</output>
 </div>;
}
type StackRow={id:string;label:string;counts:number[]};
export function StatusStack({rows,normalized=false,onSelect}:{rows:StackRow[];normalized?:boolean;onSelect:(id:string)=>void}){
 const max=Math.max(1,...rows.map(r=>r.counts.reduce((n,c)=>n+c,0)));
 return <div className="exec-stack-chart"><div className="exec-static-legend">{config.statuses.map(status=><span key={status}><i style={{background:config.colors[status]}}/>{evaluationLabels[status]}</span>)}</div>
  {!rows.length?<p className="exec-empty">該当する指標はありません。</p>:rows.map(row=>{const total=row.counts.reduce((n,c)=>n+c,0);return <div className="exec-stack-row" key={row.id}><button className="exec-stack-label" onClick={()=>onSelect(row.id)}>{row.label}</button><div className="exec-stack-track" aria-label={`${row.label} ${count(total)}指標`}>{row.counts.map((value,i)=>value>0?<span key={config.statuses[i]} style={{width:`${value/(normalized?total:max)*100}%`,background:config.colors[config.statuses[i]],color:'#fff'}} title={`${row.label}：${evaluationLabels[config.statuses[i]]} ${count(value)}件 (${percent(value/total*100)})`}><span>{normalized?`${Math.round(value/total*100)}%`:count(value)}</span></span>:null)}{!total&&<small>指標なし</small>}</div></div>})}
  <p className="exec-chart-unit">{normalized?'対象カテゴリ内のKPI件数構成（100%）':'単位：KPI件数。異なるKPIの達成率は平均しません。'}</p>
 </div>;
}
type Slice={id:string;label:string;value:number;color:string};
export function DonutChart({slices,unit,caption}:{slices:Slice[];unit:'指標'|'百万円';caption:string}){
 const [hidden,setHidden]=useState<string[]>([]),[tip,setTip]=useState('');const visible=slices.filter(s=>!hidden.includes(s.id)),total=visible.reduce((n,s)=>n+s.value,0);let offset=0;
 return <div className="exec-donut-chart"><div className="exec-donut-visual"><svg viewBox="0 0 180 180" role="group" aria-label={caption}>
  <circle cx="90" cy="90" r="65" fill="none" stroke="var(--line)" strokeWidth="26"/>
  {visible.map(slice=>{const share=total>0?slice.value/total*100:0,start=offset;offset+=share;return slice.value>0?<circle key={slice.id} cx="90" cy="90" r="65" pathLength="100" fill="none" stroke={slice.color} strokeWidth="26" strokeDasharray={`${share} ${100-share}`} strokeDashoffset={-start} transform="rotate(-90 90 90)" tabIndex={0} role="button" aria-label={`${slice.label} ${count(slice.value)}${unit} (${percent(share)})`} onFocus={()=>setTip(`${slice.label} ${percent(share)}`)} onMouseEnter={()=>setTip(`${slice.label} ${percent(share)}`)} onClick={()=>setTip(`${slice.label} ${percent(share)}`)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setTip(`${slice.label} ${percent(share)}`)}if(event.key==='Escape')setTip('')}}><title>{slice.label} {count(slice.value)}{unit} / {percent(share)}</title></circle>:null;})}
  </svg><div className="exec-donut-total"><small>{hidden.length?'表示中':unit==='指標'?'対象KPI':'売上高'}</small><strong>{unit==='百万円'?(slices.length?money(total):'未設定'):count(total)}</strong><small>{unit}</small></div></div>
  <div className="exec-donut-legend">{slices.map(slice=><button key={slice.id} aria-pressed={!hidden.includes(slice.id)} onClick={()=>setHidden(current=>current.includes(slice.id)?current.filter(id=>id!==slice.id):[...current,slice.id])}><i style={{background:slice.color}}/><span>{slice.label}</span><strong>{unit==='百万円'?money(slice.value):count(slice.value)}<small> ({total>0&&!hidden.includes(slice.id)?percent(slice.value/total*100):'—'})</small></strong></button>)}</div>
  <output className="exec-chart-tip" aria-live="polite">{tip||(!total?'構成比を算出できる値がありません。':'凡例を選択して表示する系列を切り替えます。')}</output>
 </div>;
}
