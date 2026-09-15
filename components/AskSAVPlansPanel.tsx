"use client";
import {useEffect,useState} from "react"; import {getSiteFaceAuth} from "../lib/siteface-auth";
export default function AskSAVPlansPanel(){
 const [s,setS]=useState<any>(null);
 useEffect(()=>getSiteFaceAuth().onAuthStateChanged(async u=>{if(!u)return;const t=await u.getIdToken();const r=await fetch("/api/v20/entitlements",{headers:{Authorization:`Bearer ${t}`},cache:"no-store"});if(r.ok)setS(await r.json());}),[]);
 if(!s)return null;
 const label=s.plan==="ASKSAV_PLUS"?"AskSAV Plus":s.plan==="ASKSAV_PRO"?"AskSAV Pro":"AskSAV Free";
 const plans=[["FREE","AskSAV Free","5 analyses / month","5 saved items","Market Intelligence locked"],["ASKSAV_PLUS","AskSAV Plus","50 analyses / month","100 saved items","Market Intelligence included"],["ASKSAV_PRO","AskSAV Pro","Fair-use analyses","Unlimited saved items","Full Market Intelligence"]];
 return <section id="asksav-plans" className="asksav-plans-v205"><div className="asksav-plans-current-v205"><small>YOUR PLAN</small><h2>{label}</h2><p>{s.usage?.analysesUsed??0} analyses used this month ?? {s.usage?.remaining==="FAIR_USE"?"Fair use":`${s.usage?.remaining??0} remaining`}</p></div><h2>AskSAV plans</h2><div className="asksav-plans-grid-v205">{plans.map(x=><article key={x[0]} className={x[0]===s.plan?"current":""}><small>{x[0]===s.plan?"CURRENT PLAN":x[1]}</small><h3>{x[1]}</h3><p>{x[2]}</p><p>{x[3]}</p><p>{x[4]}</p><button disabled>{x[0]===s.plan?"Current plan":"Coming soon"}</button></article>)}</div></section>;
}