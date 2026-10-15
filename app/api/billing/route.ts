import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getStudent } from "@/lib/ark60-content-auth";
import { getServiceSupabase } from "@/lib/supabase/server";
import { BILLING_PLANS, isBillingMethod, isBillingPlan, PLAN_LOOKUP } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const send = (payload: unknown, status = 200) => NextResponse.json(payload, {
  status, headers: { "Cache-Control": "private, no-store" },
});
function safeOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (!origin || origin === request.nextUrl.origin) && fetchSite !== "cross-site";
}
export async function GET(request: NextRequest) {
  try {
    const student = await getStudent(request);
    if (!student) return send({ error: "Kirish talab qilinadi." }, 401);
    const db = getServiceSupabase();
    const [cards, orders, access] = await Promise.all([
      db.from("ark60_billing_cards").select("method,card_number,card_holder").eq("enabled", true),
      db.from("ark60_billing_orders").select("id,order_code,plan_key,price_uzs,payment_method,status,created_at,reviewed_at,admin_note").eq("student_id", student.id).order("created_at", { ascending: false }).limit(30),
      db.from("ark60_billing_access").select("plan_key,starts_at,expires_at,mock_on").eq("student_id", student.id).order("starts_at", { ascending: false }).limit(30),
    ]);
    if (cards.error || orders.error || access.error) throw new Error("Billing schema is not available yet.");
    return send({ plans: BILLING_PLANS, cards: cards.data || [], orders: orders.data || [], access: access.data || [], telegram: "rustam_usmon0v", student: { first_name: student.first_name, last_name: student.last_name, username: student.username } });
  } catch {
    return send({ error: "Billing hozircha tayyor emas. Iltimos, keyinroq urinib ko‘ring." }, 503);
  }
}
export async function POST(request: NextRequest) {
  if (!safeOrigin(request)) return send({ error: "Invalid request origin." }, 403);
  try {
    const student = await getStudent(request);
    if (!student) return send({ error: "Kirish talab qilinadi." }, 401);
    const body = await request.json().catch(() => null);
    if (!body || !isBillingPlan(body.plan_key) || !isBillingMethod(body.payment_method)) {
      return send({ error: "Paket yoki to‘lov usuli noto‘g‘ri." }, 400);
    }
    const db = getServiceSupabase();
    const { data: card, error: cardError } = await db.from("ark60_billing_cards")
      .select("method").eq("method", body.payment_method).eq("enabled", true).maybeSingle();
    if (cardError) throw cardError;
    if (!card) return send({ error: "Bu karta hali sozlanmagan. Adminga murojaat qiling." }, 409);
    const { data: pending, error: pendingError } = await db.from("ark60_billing_orders")
      .select("id,order_code,plan_key,price_uzs,payment_method,status")
      .eq("student_id", student.id).eq("status", "pending").maybeSingle();
    if (pendingError) throw pendingError;
    if (pending) return send({ order: pending, reused: true });
    const code = "ARK-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(4).toString("hex").toUpperCase();
    const { data: order, error } = await db.from("ark60_billing_orders").insert({
      student_id: student.id, order_code: code, plan_key: body.plan_key,
      price_uzs: PLAN_LOOKUP[body.plan_key as keyof typeof PLAN_LOOKUP].price, payment_method: body.payment_method, status: "pending",
    }).select("id,order_code,plan_key,price_uzs,payment_method,status").single();
    if (error?.code === "23505") return send({ error: "Sizda kutilayotgan to‘lov bor. Sahifani yangilang." }, 409);
    if (error || !order) throw error || new Error("Could not create order");
    return send({ order }, 201);
  } catch {
    return send({ error: "To‘lov so‘rovi yaratilmadi. Qayta urinib ko‘ring." }, 503);
  }
}
