import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// neon()을 모듈 로드 시점이 아니라 실제 사용 시점에 호출.
// (DATABASE_URL이 없어도 `next build`의 페이지 데이터 수집 단계에서 죽지 않게 하기 위함)
function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

type DbClient = ReturnType<typeof createDb>;

let instance: DbClient | null = null;

export const db = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    if (!instance) instance = createDb();
    return Reflect.get(instance, prop, receiver);
  },
});
