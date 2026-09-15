import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { verifyFirebaseRequest } from "../../../../lib/v20-entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firebaseAdminApp() {
  if (getApps().length) return getApps()[0];
  const encoded = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_B64 || "";
  if (!encoded) throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON_B64_MISSING");
  const serviceAccount = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  if (serviceAccount.project_id !== "siteface-dev-1bfd6") throw new Error("FIREBASE_ADMIN_PROJECT_MISMATCH");
  return initializeApp({ credential: cert(serviceAccount), projectId: "siteface-dev-1bfd6" });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] || c));
}

export async function POST(request: Request) {
  try {
    const identity = await verifyFirebaseRequest(request);
    if (!identity) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    if (identity.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });
    if (!identity.email) return NextResponse.json({ error: "Account has no email address." }, { status: 400 });

    const resendKey = process.env.RESEND_API_KEY || "";
    const from = process.env.ASKSAV_VERIFICATION_FROM || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    if (!resendKey || !from) throw new Error("ASKSAV_EMAIL_CONFIGURATION_MISSING");

    const actionLink = await getAuth(firebaseAdminApp()).generateEmailVerificationLink(identity.email, {
      url: `${appUrl.replace(/\/$/, "")}/verify-email`,
      handleCodeInApp: false,
    });

    const email = escapeHtml(identity.email);
    const html = `<!doctype html><html><body style="margin:0;background:#f5faf8;font-family:Arial,sans-serif;color:#10222d">
<div style="max-width:600px;margin:0 auto;padding:36px 20px">
<div style="font-size:26px;font-weight:800;color:#0d8f72;margin-bottom:28px">AskSAV</div>
<div style="background:#fff;border:1px solid #dce8e4;border-radius:18px;padding:32px">
<div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#13a57f">VERIFY YOUR EMAIL</div>
<h1 style="font-size:28px;margin:10px 0 14px">Welcome to AskSAV</h1>
<p style="line-height:1.6">Thanks for creating your AskSAV account with <strong>${email}</strong>.</p>
<p style="line-height:1.6">Verify your email address to start identifying, verifying and understanding the value of your items.</p>
<p style="margin:28px 0"><a href="${actionLink}" style="background:#213f83;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:9px;display:inline-block">Verify my email</a></p>
<p style="font-size:13px;line-height:1.6;color:#66737a">If you didn't create an AskSAV account, you can safely ignore this email.</p>
</div>
<p style="font-size:12px;color:#78858b;text-align:center;margin-top:20px">AskSAV - Visual intelligence for the things you own</p>
</div></body></html>`;

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "authorization": `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [identity.email], subject: "Verify your email for AskSAV", html }),
      cache: "no-store",
    });
    const result = await sent.json().catch(() => ({}));
    if (!sent.ok) {
      console.error("[AskSAV] branded verification email failed", result);
      return NextResponse.json({ error: "Could not send verification email." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[AskSAV] verification email failed", error);
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "AUTH_REQUIRED" || message === "AUTH_INVALID")
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    return NextResponse.json({ error: "Could not send verification email." }, { status: 500 });
  }
}
