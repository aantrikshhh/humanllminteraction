export function clampNumber(value: number | undefined, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function integerOrDefault(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.trunc(value as number);
}

export function stableStringify(value: unknown): string {
  return stringifyValue(value);
}

export function hashString(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function createSleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

function stringifyValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  const valueType = typeof value;

  if (valueType === "string") {
    return JSON.stringify(value);
  }

  if (valueType === "number" || valueType === "boolean") {
    return String(value);
  }

  if (valueType === "bigint") {
    return String(value as bigint);
  }

  if (valueType === "undefined") {
    return "\"[undefined]\"";
  }

  if (valueType === "function") {
    return "\"[function]\"";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stringifyValue(entry)).join(",")}]`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (valueType === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stringifyValue(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(String(value));
}
