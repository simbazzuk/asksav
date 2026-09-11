import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "pdf-lib";
import { getSessionReportData } from "../../../../../lib/report-data";
import { storage, bucketName } from "../../../../../lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB");
}

function nice(value?: string | null) {
  return String(value ?? "-")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function wrapText(text: string, maxChars = 88) {
  const words = String(text ?? "").split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function gcsPath(uri?: string | null) {
  if (!uri) return null;
  const prefix = `gs://${bucketName}/`;
  return uri.startsWith(prefix) ? uri.substring(prefix.length) : null;
}

async function downloadEvidence(uri?: string | null) {
  const path = gcsPath(uri);
  if (!path) return null;

  try {
    const [bytes] = await storage.bucket(bucketName).file(path).download();
    return bytes;
  } catch (error) {
    console.warn("[AskSAV] Could not embed evidence image:", uri, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const data = await getSessionReportData(sessionId);

    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (request.nextUrl.searchParams.get("format") !== "pdf") {
      return NextResponse.json({ data });
    }

    const { session, inspections, findings, summary } = data;
    const finalReport = session.status === "COMPLETED";

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const M = 42;
    const green = rgb(0.06, 0.48, 0.34);
    const blue = rgb(0.10, 0.36, 0.70);
    const dark = rgb(0.08, 0.10, 0.12);
    const muted = rgb(0.36, 0.42, 0.48);
    const pale = rgb(0.94, 0.97, 0.95);
    const paleBlue = rgb(0.94, 0.97, 1.0);
    const paleGreen = rgb(0.94, 0.98, 0.96);
    const line = rgb(0.86, 0.88, 0.90);

    let page = pdf.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H;

    function addPage() {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - M;

      page.drawText("AskSAV", {
        x: M,
        y: PAGE_H - 28,
        size: 10,
        font: bold,
        color: green,
      });
      page.drawLine({
        start: { x: M, y: PAGE_H - 36 },
        end: { x: PAGE_W - M, y: PAGE_H - 36 },
        thickness: 0.6,
        color: line,
      });
      y = PAGE_H - 56;
    }

    function ensure(space: number) {
      if (y - space < M + 25) addPage();
    }

    function paragraph(
      value: string,
      x = M,
      maxChars = 90,
      size = 9,
      color = dark
    ) {
      const lines = wrapText(value, maxChars);
      for (const l of lines) {
        ensure(size + 5);
        page.drawText(l, { x, y, size, font: regular, color });
        y -= size + 4;
      }
    }

    function section(title: string) {
      ensure(36);
      y -= 8;
      page.drawText(title, {
        x: M,
        y,
        size: 15,
        font: bold,
        color: dark,
      });
      y -= 24;
    }

    function labelValue(label: string, value: string, x: number, width = 210) {
      page.drawText(label, {
        x,
        y,
        size: 7.5,
        font: bold,
        color: muted,
      });
      page.drawText(value, {
        x: x + width,
        y,
        size: 8,
        font: regular,
        color: dark,
      });
      y -= 14;
    }

    page.drawRectangle({
      x: 0,
      y: PAGE_H - 95,
      width: PAGE_W,
      height: 95,
      color: green,
    });

    page.drawText("AskSAV", {
      x: M,
      y: PAGE_H - 40,
      size: 21,
      font: bold,
      color: rgb(1, 1, 1),
    });

    page.drawText("Detailed Property Inspection Report", {
      x: M,
      y: PAGE_H - 65,
      size: 11,
      font: regular,
      color: rgb(1, 1, 1),
    });

    if (!finalReport) {
      page.drawText("DRAFT", {
        x: 210,
        y: 390,
        size: 68,
        font: bold,
        color: rgb(0.90, 0.90, 0.90),
        rotate: degrees(35),
        opacity: 0.42,
      });
    }

    y = PAGE_H - 125;

    page.drawText(session.property_name || "Property", {
      x: M,
      y,
      size: 20,
      font: bold,
      color: dark,
    });
    y -= 20;

    const address = [
      session.address_line1,
      session.address_line2,
      session.city,
      session.postcode,
    ]
      .filter(Boolean)
      .join(", ");

    if (address) {
      page.drawText(address, {
        x: M,
        y,
        size: 9,
        font: regular,
        color: muted,
      });
      y -= 22;
    } else {
      y -= 6;
    }

    const infoTop = y;
    page.drawRectangle({
      x: M,
      y: infoTop - 78,
      width: PAGE_W - M * 2,
      height: 78,
      color: pale,
    });

    const rows = [
      ["Inspection type", nice(session.inspection_type)],
      ["Session status", nice(session.status)],
      ["Started", fmtDate(session.started_at)],
      ["Completed", fmtDate(session.completed_at)],
    ];

    let iy = infoTop - 17;
    for (const [k, v] of rows) {
      page.drawText(k, {
        x: M + 10,
        y: iy,
        size: 8,
        font: bold,
        color: muted,
      });
      page.drawText(v, {
        x: M + 118,
        y: iy,
        size: 8,
        font: regular,
        color: dark,
      });
      iy -= 17;
    }

    y = infoTop - 100;

    section("Inspection summary");

    const summaryRows = [
      ["Items inspected", String(summary.itemsInspected)],
      ["Configured items", String(session.total_items ?? 0)],
      ["Condition findings", String(summary.conditionFindings)],
      ["High priority", String(summary.highPriority)],
    ];

    for (const [k, v] of summaryRows) {
      page.drawText(k, { x: M, y, size: 9, font: bold, color: muted });
      page.drawText(v, { x: M + 120, y, size: 9, font: regular, color: dark });
      y -= 17;
    }

    section("Detailed comparison by inspection item");

    if (!inspections.length) {
      paragraph("No inspection items have been completed in this session.");
      y -= 4;
    }

    for (let index = 0; index < inspections.length; index++) {
      const item: any = inspections[index];
      const detail: any = item.comparison_detail ?? {};
      const previous: any = detail.previous ?? {};
      const current: any = detail.current ?? {};

      ensure(330);

      page.drawLine({
        start: { x: M, y },
        end: { x: PAGE_W - M, y },
        thickness: 0.7,
        color: line,
      });
      y -= 18;

      page.drawText(
        `${index + 1}. ${item.room_name || "Area"} - ${
          item.asset_name || item.asset || "Asset"
        }`,
        {
          x: M,
          y,
          size: 12,
          font: bold,
          color: dark,
        }
      );
      y -= 17;

      page.drawText(detail.baseline ? "BASELINE" : "PREVIOUS VS CURRENT", {
        x: M,
        y,
        size: 7.5,
        font: bold,
        color: detail.baseline ? green : blue,
      });
      y -= 15;

      const boxTop = y;
      const boxH = 92;
      const gap = 12;
      const colW = (PAGE_W - M * 2 - gap) / 2;

      page.drawRectangle({
        x: M,
        y: boxTop - boxH,
        width: colW,
        height: boxH,
        color: paleBlue,
      });

      page.drawRectangle({
        x: M + colW + gap,
        y: boxTop - boxH,
        width: colW,
        height: boxH,
        color: paleGreen,
      });

      let py = boxTop - 14;
      page.drawText("Previous inspection", {
        x: M + 9,
        y: py,
        size: 8,
        font: bold,
        color: blue,
      });
      py -= 15;
      page.drawText(`Condition: ${nice(previous.condition)}`, {
        x: M + 9,
        y: py,
        size: 7.5,
        font: regular,
        color: dark,
      });
      py -= 13;
      page.drawText(
        `Defect: ${
          previous.defectDetected ? nice(previous.defectType) : "None detected"
        }`,
        {
          x: M + 9,
          y: py,
          size: 7.5,
          font: regular,
          color: dark,
        }
      );
      py -= 13;
      page.drawText(`Severity: ${nice(previous.severity)}`, {
        x: M + 9,
        y: py,
        size: 7.5,
        font: regular,
        color: dark,
      });

      let cy = boxTop - 14;
      const cx = M + colW + gap + 9;
      page.drawText("Current inspection", {
        x: cx,
        y: cy,
        size: 8,
        font: bold,
        color: green,
      });
      cy -= 15;
      page.drawText(`Condition: ${nice(current.condition)}`, {
        x: cx,
        y: cy,
        size: 7.5,
        font: regular,
        color: dark,
      });
      cy -= 13;
      page.drawText(
        `Defect: ${
          current.defectDetected ? nice(current.defectType) : "None detected"
        }`,
        {
          x: cx,
          y: cy,
          size: 7.5,
          font: regular,
          color: dark,
        }
      );
      cy -= 13;
      page.drawText(`Severity: ${nice(current.severity)}`, {
        x: cx,
        y: cy,
        size: 7.5,
        font: regular,
        color: dark,
      });

      y = boxTop - boxH - 16;

      ensure(150);

      page.drawText("What changed visually", {
        x: M,
        y,
        size: 8,
        font: bold,
        color: blue,
      });
      y -= 13;
      paragraph(detail.whatChanged || item.change_description || "-", M, 86, 8);
      y -= 4;

      page.drawText("What stayed the same", {
        x: M,
        y,
        size: 8,
        font: bold,
        color: muted,
      });
      y -= 13;
      paragraph(detail.whatStayedSame || "-", M, 86, 8);
      y -= 4;

      page.drawText("Condition assessment", {
        x: M,
        y,
        size: 8,
        font: bold,
        color: green,
      });
      y -= 13;
      paragraph(detail.conditionAssessment || item.summary || "-", M, 86, 8);
      y -= 4;

      page.drawText("Evidence quality", {
        x: M,
        y,
        size: 8,
        font: bold,
        color: muted,
      });
      y -= 13;
      paragraph(detail.evidenceQuality || "-", M, 86, 8);
      y -= 4;

      page.drawText("Comparison assessment", {
        x: M,
        y,
        size: 8,
        font: bold,
        color: dark,
      });
      y -= 13;
      paragraph(detail.comparisonNarrative || item.summary || "-", M, 86, 8);
      y -= 4;

      page.drawText("Recommended action", {
        x: M,
        y,
        size: 8,
        font: bold,
        color: green,
      });
      y -= 13;
      paragraph(
        detail.recommendedAction || item.recommended_action || "-",
        M,
        86,
        8
      );
      y -= 8;

      ensure(180);

      const beforeBytes = await downloadEvidence(item.before_uri);
      const afterBytes = await downloadEvidence(item.after_uri);

      if (beforeBytes || afterBytes) {
        page.drawText("Photographic evidence", {
          x: M,
          y,
          size: 8,
          font: bold,
          color: dark,
        });
        y -= 12;

        const imgW = 220;
        const imgH = 130;
        const imgGap = 14;

        async function embed(bytes: Buffer | null, x: number, caption: string) {
          if (!bytes) return;
          try {
            let image;
            try {
              image = await pdf.embedJpg(bytes);
            } catch {
              image = await pdf.embedPng(bytes);
            }

            const scale = Math.min(imgW / image.width, imgH / image.height);
            const drawW = image.width * scale;
            const drawH = image.height * scale;

            page.drawRectangle({
              x,
              y: y - imgH,
              width: imgW,
              height: imgH,
              borderColor: line,
              borderWidth: 0.7,
            });

            page.drawImage(image, {
              x: x + (imgW - drawW) / 2,
              y: y - imgH + (imgH - drawH) / 2,
              width: drawW,
              height: drawH,
            });

            page.drawText(caption, {
              x,
              y: y - imgH - 11,
              size: 7,
              font: bold,
              color: muted,
            });
          } catch (error) {
            console.warn("[AskSAV] Could not embed evidence image", error);
          }
        }

        await embed(beforeBytes, M, detail.baseline ? "Baseline" : "Previous");
        await embed(
          afterBytes,
          M + imgW + imgGap,
          detail.baseline ? "Baseline" : "Current"
        );

        y -= imgH + 28;
      }
    }

    section("Findings");

    if (!findings.length) {
      paragraph("No property-condition findings were raised.");
    } else {
      for (const finding of findings as any[]) {
        ensure(70);
        page.drawText(finding.title || nice(finding.defect_type), {
          x: M,
          y,
          size: 10,
          font: bold,
          color: dark,
        });
        y -= 14;
        paragraph(finding.description || "-", M, 88, 8);
        page.drawText(
          `Status: ${nice(finding.status)}   Severity: ${nice(finding.severity)}`,
          {
            x: M,
            y,
            size: 7.5,
            font: regular,
            color: muted,
          }
        );
        y -= 20;
      }
    }

    section("Inspector sign-off");

    if (session.status === "COMPLETED") {
      labelValue("Inspector", String(session.signed_off_by || "-"), M, 90);
      labelValue("Signed off", fmtDate(session.signed_off_at), M, 90);
      if (session.sign_off_notes) {
        page.drawText("Notes", {
          x: M,
          y,
          size: 8,
          font: bold,
          color: muted,
        });
        y -= 13;
        paragraph(String(session.sign_off_notes), M, 90, 8);
      }
    } else {
      paragraph(
        "This report is a draft. Final sign-off is available after all configured inspection items are complete."
      );
    }

    ensure(60);
    y -= 15;
    page.drawLine({
      start: { x: M, y },
      end: { x: PAGE_W - M, y },
      thickness: 0.6,
      color: line,
    });
    y -= 18;

    paragraph(
      "AskSAV provides AI-assisted evidence comparison. Findings should be reviewed by an appropriate person before maintenance, legal or safety decisions are made.",
      M,
      92,
      7.5,
      muted
    );

    const bytes = await pdf.save();
    const body = new Uint8Array(bytes);

    const safeProperty = String(session.property_name || session.property_id || "property")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const filename = finalReport
      ? `siteface-${safeProperty}-inspection-report.pdf`
      : `siteface-${safeProperty}-draft-inspection-report.pdf`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[AskSAV] report generation failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate report",
      },
      { status: 500 }
    );
  }
}
