import "server-only";

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

function authHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function tossFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `Toss API 오류 (${res.status})`);
  }
  return data;
}

export async function issueBillingKey(authKey: string, customerKey: string) {
  // POST /v1/billing/authorizations/issue
  return tossFetch("/billing/authorizations/issue", { authKey, customerKey });
}

export async function chargeBilling(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}) {
  // POST /v1/billing/{billingKey}
  const { billingKey, ...rest } = params;
  return tossFetch(`/billing/${billingKey}`, rest);
}
