import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/ark60-content-auth";
import { getServiceSupabase } from "@/lib/supabase/server";
import { isBillingMethod } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const send = (payload: unknown, status = 200) => NextResponse.json(payload, {
  status, headers: { "Cache-Control": "private, no-store" },
});
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return (!origin || origin === request.nextUrl.origin) && request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdmin(request);
    if (!admin || admin.role !== "super_admin") return send({ error: "Super admin access required." }, 403);
    const db = getServiceSupabase();
    const [orders, cards] = await Promise.all([
      db.from("ark60_billing_orders").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("ark60_billing_cards").select("*").order("method"),
    ]);
    if (orders.error || cards.error) throw new Error("Billing database unavailable");
    const studentIds = [...new Set((orders.data || []).map((item) => item.student_id))];
    const students = studentIds.length
      ? await db.from("ark60_students").select("id,first_name,last_name,username").in("id", studentIds)
      : { data: [], error: null };
    if (students.error) throw students.error;
    const byId = new Map((students.data || []).map((student) => [student.id, student]));
    return send({
      orders: (orders.data || []).map((order) => ({ ...order, student: byId.get(order.student_id) || null })),
      cards: cards.data || [],
      stats: {
        pending: (orders.data || []).filter((order) => order.status === "pending").length,
        approved: (orders.data || []).filter((order) => order.status === "approved").length,
        rejected: (orders.data || []).filter((order) => order.status === "rejected").length,
        approved_uzs: (orders.data || []).filter((order) => order.status === "approved").reduce((a, order) => a + Number(order.price_uzs), 0),
      },
      limited: (orders.data || []).length >= 200,
    });
  } catch {
    return send({ error: "Billing ma‘lumotlarini yuklab bo‘lmadi. Migratsiyani tekshiring." }, 503);
  }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return send({ error: "Invalid request origin." }, 403);
  try {
    const admin = await getAdmin(request);
    if (!admin || admin.role !== "super_admin") return send({ error: "Super admin access required." }, 403);
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object") return send({ error: "Invalid body." }, 400);
    const db = getServiceSupabase();
    if (input.action === "review") {
      if (!/^[0-9a-f-]{36}$/i.test(String(input.order_id || "")) ||
          !["approved", "rejected"].includes(input.decision) ||
          typeof input.note !== "string" || input.note.length > 500) {
        return send({ error: "Invalid review details." }, 400);
      }
      const { data, error } = await db.rpc("ark60_review_billing_order", {
        p_order_id: input.order_id, p_admin_id: admin.id,
        p_decision: input.decision, p_note: input.note,
      });
      if (error) return send({ error: error.message.includes("already reviewed") ? "Bu to‘lov allaqachon tekshirilgan." : "To‘lovni tekshirish amalga oshmadi." }, 409);
      return send({ order: data });
    }
    if (input.action === "set_card") {
      if (!isBillingMethod(input.method) ||
          typeof input.number !== "string" || !/^\d{16}$/.test(input.number.replaceAll(" ", "")) ||
          typeof input.holder !== "string" || input.holder.trim().length < 3 || input.holder.trim().length > 100 ||
          typeof input.enabled !== "boolean") {
        return send({ error: "Karta rekvizitlari noto‘g‘ri." }, 400);
      }
      const { error } = await db.from("ark60_billing_cards").upsert({
        method: input.method, card_number: input.number.replaceAll(" ", ""),
        card_holder: input.holder.trim(), enabled: input.enabled, updated_at: new Date().toISOString(),
      }, { onConflict: "method" });
      if (error) throw error;
      return send({ ok: true });
    }
    return send({ error: "Unknown action." }, 400);
  } catch {
    return send({ error: "Amal bajarilmadi. Keyinroq qayta urinib ko‘ring." }, 503);
  }
}
