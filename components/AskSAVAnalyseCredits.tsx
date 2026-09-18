"use client";

import { useEffect, useState } from "react";
import { getSiteFaceAuth } from "../lib/siteface-auth";

type CreditState = {
  remaining: number | null;
  limit: number | null;
  loading: boolean;
};

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function inspectObject(value: any): { remaining: number | null; limit: number | null } | null {
  if (!value || typeof value !== "object") return null;

  const remainingKeys = [
    "remaining","analysesRemaining","analyses_remaining","analysisRemaining",
    "analysis_remaining","creditsRemaining","credits_remaining","remainingAnalyses",
    "remaining_analyses","monthlyRemaining","monthly_remaining"
  ];
  const limitKeys = [
    "limit","monthlyLimit","monthly_limit","analysisLimit","analysis_limit",
    "analysesLimit","analyses_limit","included","allowance","monthlyAllowance",
    "monthly_allowance"
  ];
  const usedKeys = [
    "used","analysesUsed","analyses_used","analysisUsed","analysis_used",
    "usedAnalyses","used_analyses","monthlyUsed","monthly_used"
  ];

  let remaining:null|number=null, limit:null|number=null, used:null|number=null;
  for (const k of remainingKeys) { const n=numeric(value[k]); if(n!==null){remaining=n;break;} }
  for (const k of limitKeys) { const n=numeric(value[k]); if(n!==null){limit=n;break;} }
  for (const k of usedKeys) { const n=numeric(value[k]); if(n!==null){used=n;break;} }

  if (remaining !== null) return { remaining: Math.max(0, remaining), limit };
  if (limit !== null && used !== null) return { remaining: Math.max(0, limit-used), limit };
  return null;
}

function findCredits(payload: any): { remaining: number | null; limit: number | null } {
  const queue:any[]=[payload];
  const seen=new Set<any>();

  while(queue.length){
    const current=queue.shift();
    if(!current || typeof current!=="object" || seen.has(current)) continue;
    seen.add(current);

    const direct=inspectObject(current);
    if(direct) return direct;

    for(const [key,value] of Object.entries(current)){
      // Prefer branches whose names indicate analysis/usage/plan information.
      if(value && typeof value==="object" &&
        /(analysis|analyses|usage|allowance|plan|credit|entitlement|subscription)/i.test(key)){
        queue.unshift(value);
      } else if(value && typeof value==="object"){
        queue.push(value);
      }
    }
  }
  return {remaining:null,limit:null};
}

export default function AskSAVAnalyseCredits() {
  const [state,setState]=useState<CreditState>({remaining:null,limit:null,loading:true});

  useEffect(()=>{
    let active=true;
    const auth=getSiteFaceAuth();

    async function loadForUser(user: NonNullable<typeof auth.currentUser>){
      try{
        if(active) setState(current=>({...current,loading:true}));

        const token=await user.getIdToken();
        const response=await fetch("/api/v20/entitlements",{
          method:"GET",
          headers:{Authorization:`Bearer ${token}`},
          credentials:"include",
          cache:"no-store",
        });
        const payload=await response.json().catch(()=>null);

        if(!response.ok){
          console.warn("[AskSAV credits] usage request failed",response.status,payload);
          throw new Error("usage request failed");
        }

        const credits=findCredits(payload);
        console.info("[AskSAV credits] loaded",credits);

        if(active) setState({...credits,loading:false});
      }catch(error){
        console.warn("[AskSAV credits] unable to load indicator",error);
        if(active) setState({remaining:null,limit:null,loading:false});
      }
    }

    // Firebase may still be restoring the persisted session when Analyse mounts.
    // Subscribe instead of reading currentUser once and permanently giving up.
    const unsubscribe=auth.onAuthStateChanged((user)=>{
      if(!active) return;

      if(!user){
        setState({remaining:null,limit:null,loading:false});
        return;
      }

      console.info("[AskSAV credits] authenticated user ready");
      void loadForUser(user);
    });

    return ()=>{
      active=false;
      unsubscribe();
    };
  },[]);

  if(state.loading || state.remaining===null) return null;

  const low=state.remaining<=2 && state.remaining>0;
  const empty=state.remaining<=0;
  const label=empty
    ? "No analyses left"
    : state.remaining===1
      ? "1 analysis left"
      : `${state.remaining} analyses left`;

  return (
    <a
      className={`asksav-analysis-credits-v02039${empty?" empty":low?" low":""}`}
      href="/account"
      title={state.limit!==null ? `${state.remaining} of ${state.limit} monthly analyses remaining` : label}
      aria-label={`${label}. View account usage.`}
      data-asksav-analysis-credits="true"
    >
      <span className="asksav-analysis-credits-v02039__icon" aria-hidden="true">&#10022;</span>
      <span>
        <strong>{label}</strong>
        <small>{empty ? "View plans" : "Monthly allowance"}</small>
      </span>
      <span className="asksav-analysis-credits-v02039__arrow" aria-hidden="true">&#8250;</span>
    </a>
  );
}
