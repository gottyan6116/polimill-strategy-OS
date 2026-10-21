"use client";
import {useCallback,useLayoutEffect,useRef,type RefObject} from 'react';
/** Presentation only: native modal semantics, delayed close, and focus restoration. */
export function useDialog(ref:RefObject<HTMLDialogElement|null>,finish:()=>void,busy=false){
 const latest=useRef({finish,busy});latest.current={finish,busy};
 const closing=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),opener=useRef<HTMLElement|null>(null);
 const restore=useCallback(()=>{requestAnimationFrame(()=>{const target=opener.current,top=[...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);if(target?.isConnected&&(!top||top.contains(target)))target.focus({preventScroll:true});});},[]);
 const close=useCallback((after?:unknown)=>{
  if(closing.current)return;
  closing.current=true;const element=ref.current;if(element)element.dataset.state='closing';
  const complete=()=>{element?.close();latest.current.finish();restore();if(typeof after==='function')after();};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)complete();else timer.current=setTimeout(complete,150);
 },[ref,restore]);
 useLayoutEffect(()=>{
  const element=ref.current;if(!element)return;
  if(!element.open)opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  closing.current=false;element.classList.add('dialog');element.dataset.state='opening';element.showModal();
  element.querySelector<HTMLElement>('[autofocus],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')?.focus({preventScroll:true});
  let startedOutside=false;
  const outside=(event:MouseEvent)=>{const bounds=element.getBoundingClientRect();return event.target===element&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)};
  const pointer=(event:PointerEvent)=>{startedOutside=outside(event)};
  const click=(event:MouseEvent)=>{if(startedOutside&&outside(event)&&!latest.current.busy)close();startedOutside=false};
  const cancel=(event:Event)=>{event.preventDefault();if(!latest.current.busy)close()};
  element.addEventListener('pointerdown',pointer);element.addEventListener('click',click);element.addEventListener('cancel',cancel);
  return()=>{if(timer.current)clearTimeout(timer.current);element.removeEventListener('pointerdown',pointer);element.removeEventListener('click',click);element.removeEventListener('cancel',cancel);restore();};
 },[ref,close,restore]);
 return close;
}
