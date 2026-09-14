"use client";

import { useEffect, useRef, useState } from "react";

const STAGES = [
  [8,"Uploading image","Preparing your photo for analysis"],
  [22,"Identifying item","Looking for logos, model details and distinctive features"],
  [38,"Verifying identity","Cross-checking what the item appears to be"],
  [54,"Assessing condition","Reviewing visible wear, marks and condition clues"],
  [70,"Estimating market value","Building an indicative UK market value"],
  [84,"Finding comparable listings","Checking available market evidence"],
  [93,"Preparing results","Bringing your AskSAV result together"],
] as const;

function findButton() {
  return Array.from(document.querySelectorAll("button")).find((b) => {
    const t=(b.textContent||"").toLowerCase();
    return t.includes("analyse item") || t.includes("analyze item") ||
           t.includes("analysing item") || t.includes("analyzing item");
  }) as HTMLButtonElement | undefined;
}

function running() {
  const b=findButton();
  if(!b) return false;
  const t=(b.textContent||"").toLowerCase();
  return t.includes("analysing item") || t.includes("analyzing item") ||
         b.disabled || b.getAttribute("aria-busy")==="true";
}

export default function AskSavAnalysisProgress() {
  const [active,setActive]=useState(false);
  const [progress,setProgress]=useState(0);
  const [complete,setComplete]=useState(false);
  const started=useRef(0);

  useEffect(()=>{
    const sync=()=>{
      const isRunning=running();
      if(isRunning && !active){
        started.current=Date.now();
        setProgress(5); setComplete(false); setActive(true);
      } else if(active && !isRunning){
        setProgress(100); setComplete(true);
        setTimeout(()=>{setActive(false);setComplete(false);setProgress(0)},900);
      }
    };
    sync();
    const o=new MutationObserver(sync);
    o.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["disabled","aria-busy"]});
    return ()=>o.disconnect();
  },[active]);

  useEffect(()=>{
    if(!active || complete) return;
    const id=setInterval(()=>{
      const s=(Date.now()-started.current)/1000;
      let p=s<5?5+s*3:s<20?20+(s-5)*1.25:s<40?39+(s-20)*1.15:s<55?62+(s-40)*1.7:90+Math.min(4,(s-55)*.12);
      setProgress(v=>Math.max(v,Math.min(94,p)));
    },650);
    return ()=>clearInterval(id);
  },[active,complete]);

  if(!active) return null;

  let stage: readonly [number, string, string] = STAGES[0];
  for(const s of STAGES) if(progress>=s[0]) stage=s;
  if(complete) stage=[100,"Analysis complete","Your AskSAV result is ready"];

  const pct=Math.round(progress);

  return (
    <div className="asksav-progress-fix" role="status" aria-live="polite">
      <div className="asksav-progress-head">
        <div className="asksav-progress-icon">{complete?"✓":"✦"}</div>
        <div>
          <div className="asksav-progress-title">{complete?"Analysis complete":"Analysing your item"}</div>
          <div className="asksav-progress-stage">{stage[1]}</div>
        </div>
        <div className="asksav-progress-pct">{pct}%</div>
      </div>
      <p>{stage[2]}</p>
      <div className="asksav-progress-track">
        <div className="asksav-progress-fill" style={{width:`${pct}%`}} />
      </div>
      <div className="asksav-progress-time">{complete?"Done":"Usually takes around 30–60 seconds"}</div>
      {!complete && <div className="asksav-progress-steps">
        <span className={pct>=22?"done":""}>Identify</span>
        <span className={pct>=38?"done":""}>Verify</span>
        <span className={pct>=54?"done":""}>Condition</span>
        <span className={pct>=70?"done":""}>Value</span>
        <span className={pct>=84?"done":""}>Evidence</span>
      </div>}
    </div>
  );
}
