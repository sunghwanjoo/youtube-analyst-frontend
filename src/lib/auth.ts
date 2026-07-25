import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 리프레시 토큰을 받아야 채널 연동(Stage4)에서 access token을 계속 갱신할 수 있음
      accessType: "offline",
    },
  },
  // nextCookies()는 반드시 플러그인 배열의 마지막에 위치해야 함
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
