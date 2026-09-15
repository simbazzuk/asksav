import { setAskSAVPlanForEmail, type AskSAVPlan } from "../../../../../lib/v20-entitlements";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:Request){
 const configured=process.env.ASKSAV_ADMIN_PLAN_KEY||"", supplied=request.headers.get("x-asksav-admin-plan-key")||"";
 if(!configured||supplied!==configured)return Response.json({error:"Not authorised."},{status:401});
 const body=await request.json().catch(()=>({})),email=String(body?.email||"").trim(),raw=String(body?.plan||"").toUpperCase();
 const plan:AskSAVPlan|null=raw==="FREE"||raw==="ASKSAV_PLUS"||raw==="ASKSAV_PRO"?raw:null;
 if(!email||!plan)return Response.json({error:"Provide email and plan: FREE, ASKSAV_PLUS or ASKSAV_PRO."},{status:400});
 await setAskSAVPlanForEmail(email,plan); return Response.json({ok:true,email,plan});
}