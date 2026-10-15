export const BILLING_PLANS = [
  { key: "challenge", name: "Challenge", price: 15000, period: "7 kun", description: "60-Day Challenge kundalik topshiriqlari", features: ["Reading, Listening, Speaking", "Writing, Vocabulary, Articles", "Natijalar va leaderboard"] },
  { key: "mock", name: "MOCK Only", price: 25000, period: "1 yakshanbalik MOCK", description: "Bir martalik Full MOCK imtihoni", features: ["Listening, Reading, Writing", "Natijalar va xatolar tahlili", "Imtihon tarixi"] },
  { key: "all_access", name: "All Access", price: 35000, period: "7 kun + 1 MOCK", description: "Challenge va yakshanbalik MOCK", features: ["Challenge barcha imkoniyatlari", "Bir yakshanbalik Full MOCK", "Natijalar va statistika"] },
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number]["key"];
export type BillingMethod = "uzcard" | "humo";
export const PLAN_LOOKUP: Record<BillingPlan, (typeof BILLING_PLANS)[number]> =
  Object.fromEntries(BILLING_PLANS.map((plan) => [plan.key, plan])) as Record<BillingPlan, (typeof BILLING_PLANS)[number]>;
export const isBillingPlan = (value: unknown): value is BillingPlan =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(PLAN_LOOKUP, value);
export const isBillingMethod = (value: unknown): value is BillingMethod => value === "uzcard" || value === "humo";
export const formatSom = (amount: number) => new Intl.NumberFormat("uz-UZ").format(amount) + " so‘m";
