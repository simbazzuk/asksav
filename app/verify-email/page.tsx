"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSiteFaceAuth } from "../../lib/siteface-auth";

async function resendVerification(user: any) {
  const token = await user.getIdToken(true);
  const response = await fetch("/api/v20/send-verification-email", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || "Could not send verification email.");
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [ready,setReady]=useState(false);
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(() => {
    const auth=getSiteFaceAuth();
    return auth.onAuthStateChanged(async user => {
      if(!user){setMessage("Sign in to continue your email verification.");setReady(true);return;}
      await user.reload();
      setEmail(user.email || "");
      if(user.emailVerified){router.replace("/analyse");return;}
      setReady(true);
    });
  },[router]);

  async function refresh(){
    const user=getSiteFaceAuth().currentUser;
    if(!user){setMessage("Sign in to continue your email verification.");return;}
    setBusy(true);setMessage("");
    try{
      await user.reload();
      if(user.emailVerified){router.replace("/analyse");return;}
      setMessage("Not verified yet. Open the verification link in your email, then try again.");
    }finally{setBusy(false);}
  }

  async function resend(){
    const user=getSiteFaceAuth().currentUser;
    if(!user){setMessage("Sign in to resend your verification email.");return;}
    setBusy(true);setMessage("");
    try{await resendVerification(user);setMessage("A new AskSAV verification email has been sent.");}
    catch(e){setMessage(e instanceof Error ? e.message : "Could not resend verification email.");}
    finally{setBusy(false);}
  }

  if(!ready)return <main className="asksav-verify-page"><section className="asksav-verify-card"><p>Checking your account...</p></section></main>;

  return <main className="asksav-verify-page">
    <section className="asksav-verify-card" aria-live="polite">
      <div className="asksav-verify-mark">AskSAV</div>
      <span className="asksav-verify-eyebrow">VERIFY YOUR EMAIL</span>
      <h1>Check your inbox</h1>
      <p>We sent a verification link to <strong>{email || "your email address"}</strong>. Verify your email to activate your AskSAV account and start analysing items.</p>
      <div className="asksav-verify-actions">
        <button type="button" onClick={refresh} disabled={busy}>{busy ? "Checking..." : "I've verified my email"}</button>
        <button type="button" className="secondary" onClick={resend} disabled={busy}>Resend verification email</button>
      </div>
      {message && <p className="asksav-verify-message">{message}</p>}
    </section>
  </main>;
}
