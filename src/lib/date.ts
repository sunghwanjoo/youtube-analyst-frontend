export function todayKSTDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function addOneMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}
