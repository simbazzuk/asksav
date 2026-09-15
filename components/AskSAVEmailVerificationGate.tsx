"use client";

import { ReactNode, useEffect, useState } from "react";
import { getSiteFaceAuth } from "../lib/siteface-auth";

async function askSavSendBrandedVerificationEmail(user: any) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/v20/send-verification-email", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Could not send verification email.");
}

export default function AskSAVEmailVerificationGate({ children }: { children: ReactNode }) {
  const [ready,setReady]=useState(false);
  const [verified,setVerified]=useState(false);
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");

  useEffect(() => {
    const auth=getSiteFaceAuth();
    return auth.onAuthStateChanged(async user => {
      if(!user){ setReady(true); setVerified(true); return; }
      await user.reload();
      setEmail(user.email || "");
      setVerified(Boolean(user.emailVerified));
      setReady(true);
    });
  },[]);

  async function refresh(){
    const user=getSiteFaceAuth().currentUser;
    if(!user) return;
    await user.reload();
    setVerified(Boolean(user.emailVerified));
    setMessage(user.emailVerified ? "Email verified. You can continue." : "Not verified yet. Please use the link in your email.");
  }

  async function resend(){
    const user=getSiteFaceAuth().currentUser;
    if(!user) return;
    await askSavSendBrandedVerificationEmail(user);
    setMessage("Verification email sent again.");
  }

  if(!ready) return null;
  if(verified) return <>{children}</>;

  return (
    <section className="asksav-email-verification-v02040" aria-live="polite">
      <span className="asksav-email-verification-v02040__eyebrow">VERIFY YOUR EMAIL</span>
      <h2>Check your inbox</h2>
      <p>We sent a verification link to <strong>{email || "your email address"}</strong>. Verify your email before using AskSAV analysis.</p>
      <div className="asksav-email-verification-v02040__actions">
        <button type="button" onClick={refresh}>I've verified my email</button>
        <button type="button" className="secondary" onClick={resend}>Resend email</button>
      </div>
      {message && <p className="asksav-email-verification-v02040__message">{message}</p>}
    </section>
  );
}
