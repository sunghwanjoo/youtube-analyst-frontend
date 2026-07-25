import { pgTable, text, timestamp, boolean, integer, date, jsonb, unique } from "drizzle-orm/pg-core";

// ─── Better Auth 관리 테이블 (기본 스키마 그대로) ────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── 앱 전용 테이블 ──────────────────────────────────────────────

export const userPlan = pgTable("user_plan", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["free", "paid"] }).notNull().default("free"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const searchUsage = pgTable("search_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  usageDate: date("usage_date").notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [
  unique("search_usage_user_date_unique").on(t.userId, t.usageDate),
]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  billingKey: text("billing_key").notNull(),
  customerKey: text("customer_key").notNull(),
  status: text("status", { enum: ["active", "past_due", "cancelled"] }).notNull().default("active"),
  nextBillingAt: date("next_billing_at").notNull(),
  priceKrw: integer("price_krw").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentLogs = pgTable("payment_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["success", "failed"] }).notNull(),
  tossResponse: jsonb("toss_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 액세스/리프레시 토큰은 저장하지 않음 — Better Auth의 account 테이블에 이미 있고,
// auth.api.getAccessToken({ providerId: "google", userId })로 항상 최신 토큰을 가져옴
export const connectedChannels = pgTable("connected_channels", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
}, (t) => [
  unique("connected_channels_user_channel_unique").on(t.userId, t.channelId),
]);

export const workshopItems = pgTable("workshop_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  sourceVideoId: text("source_video_id").notNull(),
  sourceTitle: text("source_title").notNull(),
  sourceDescription: text("source_description").notNull().default(""),
  sourceThumbnailUrl: text("source_thumbnail_url"),
  sourceScript: text("source_script").notNull().default(""),
  generatedTitles: jsonb("generated_titles").$type<Record<string, unknown>[]>().notNull().default([]),
  generatedScripts: jsonb("generated_scripts").$type<Record<string, unknown>[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const scheduledPublishes = pgTable("scheduled_publishes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull().references(() => connectedChannels.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  script: text("script").notNull().default(""),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status", { enum: ["pending", "published", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
