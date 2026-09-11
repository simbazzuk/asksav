export function pretty(value?: string) {
  if (!value) return "—";
  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function dateText(value: any) {
  try {
    const raw = value?.value ?? value;
    if (!raw) return "—";
    return new Date(raw).toLocaleString();
  } catch {
    return String(value ?? "—");
  }
}

export function conditionClass(condition?: string) {
  if (condition === "POOR") return "status-poor";
  if (condition === "ATTENTION") return "status-attention";
  if (condition === "GOOD") return "status-good";
  return "status-neutral";
}

export function propertyCondition(row: any) {
  if (Number(row.poor_assets || 0) > 0) return "POOR";
  if (Number(row.attention_assets || 0) > 0 || Number(row.active_defects || 0) > 0)
    return "ATTENTION";
  return "GOOD";
}
