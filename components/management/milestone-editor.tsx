"use client";
import { useState } from "react";
import type { Milestone } from "@/lib/management";
export default function MilestoneEditor({ initiativeId, item, onSaved, onCancel }: { initiativeId:string; item?:Milestone; onSaved:()=>Promise<void>; onCancel:()=>void }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();setBusy(true);setError("");
    const form=new FormData(e.currentTarget);
    try {
      const response=await fetch("/api/management",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:item?"milestone":"milestone_create",...(item?{id:item.id,version:item.version}:{}),initiative_id:initiativeId,title:form.get("title"),planned_on:form.get("planned_on"),completed_on:form.get("completed_on")||null})});
      if(response.status===401){window.location.assign("/login");return;}
      const result=await response.json() as {error?:string};
      if(!response.ok) throw new Error(result.error||"保存できませんでした。");
      await onSaved();onCancel();
    } catch(e){setError(e instanceof Error?e.message:"接続を確認してください。");} finally{setBusy(false);}
  }
  return <form className="milestone-form" onSubmit={save} aria-label={item?"マイルストーンを編集":"マイルストーンを追加"}>
    <label>マイルストーン名<input autoFocus name="title" required maxLength={300} defaultValue={item?.title}/></label>
    <div className="management-form-pair"><label>予定日<input name="planned_on" type="date" required defaultValue={item?.planned_on}/></label><label>完了日（未完了なら空欄）<input name="completed_on" type="date" defaultValue={item?.completed_on??""}/></label></div>
    {error&&<p role="alert">{error}</p>}<div className="management-actions"><button type="button" disabled={busy} onClick={onCancel}>キャンセル</button><button type="submit" disabled={busy}>{busy?"保存中…":"保存"}</button></div>
  </form>;
}
