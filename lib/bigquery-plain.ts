export function toPlainValue(value: any): any {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(toPlainValue);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("value" in value && Object.keys(value).length <= 2) {
      return toPlainValue((value as any).value);
    }

    const out: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = toPlainValue(child);
    }
    return out;
  }

  return value;
}

export function toPlainRow<T = any>(row: T): T {
  return toPlainValue(row) as T;
}
