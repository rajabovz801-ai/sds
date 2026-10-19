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
    const [orders, cards, totals, people, events, access] = await Promise.all([
      db.from("ark60_billing_orders").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("ark60_billing_cards").select("*").order("method"),
      db.rpc("ark60_billing_totals"),
      db.from("ark60_students").select("id,first_name,last_name,username,created_at").eq("status","active").order("first_name").limit(2000),
      db.from("ark60_billing_events").select("*").order("created_at",{ascending:false}).limit(50),
      db.from("ark60_billing_access").select("id,student_id,plan_key,starts_at,expires_at,mock_on,revoked_at,order_id,source_order_id").order("starts_at",{ascending:false}).limit(2000),
    ]);
    if (orders.error || cards.error || totals.error || people.error || events.error || access.error) throw new Error("Billing database unavailable");
    const studentIds = [...new Set((orders.data || []).map((item) => item.student_id))];
    const students = studentIds.length
      ? await db.from("ark60_students").select("id,first_name,last_name,username").in("id", studentIds)
      : { data: [], error: null };
    if (students.error) throw students.error;
    const byId = new Map((students.data || []).map((student) => [student.id, student]));
    return send({
      orders: (orders.data || []).map((order) => ({ ...order, student: byId.get(order.student_id) || null })),
      cards: cards.data || [],
      stats: totals.data,
      students: people.data||[], events: events.data||[], access: access.data||[],
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
    if (input.action === "record_cash") {
      const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      if (!uuid(input.student_id)||!uuid(input.request_id)||
          !["challenge","mock"].includes(input.plan)||
          input.confirmed!==true||typeof input.note!=="string"||
          input.note.trim().length<3||input.note.length>500||
          (input.plan==="challenge"&&input.mock_on!=null)||
          (input.plan==="mock"&&(typeof input.mock_on!=="string"||!/^\\d{4}-\\d{2}-\\d{2}$/.test(input.mock_on)))) {
        return send({error:"O‘quvchi, naqd pul tasdig‘i, paket yoki ma’lumotlar noto‘g‘ri."},400);
      }
      const {data,error}=await db.rpc("ark60_billing_record_cash",{
        p_admin:admin.id,p_student:input.student_id,p_plan:input.plan,
        p_request_id:input.request_id,p_mock:input.plan==="mock"?input.mock_on:null,
        p_note:input.note.trim()
      });
      if(error){
        const msg=String(error.message||"");
        const detail=msg.includes("Pending payment")?"Bu o‘quvchida oldingi to‘lov so‘rovi kutilmoqda. Avval uni tekshiring yoki rad eting.":
          msg.includes("MOCK payment already")?"Bu o‘quvchida shu Mock uchun avvaldan ruxsat bor.":
          msg.includes("Sunday")?"Mock uchun to‘g‘ri yakshanba sanasini tanlang.":
          msg.includes("Active student")?"O‘quvchi faol emas.":
          msg.includes("Receipt ID")?"Bu chek identifikatori boshqa to‘lovga tegishli.":
          "Naqd to‘lov yozilmadi. Ma’lumotlar yoki mavjud ruxsatlarni tekshiring.";
        return send({error:detail},409);
      }
      const receipt=Array.isArray(data)?data[0]:data;
      if(!receipt?.order_id)return send({error:"To‘lov tasdig‘ini tekshirib bo‘lmadi. Ro‘yxatni yangilang."},503);
      return send({ok:true,receipt});
    }
    if (input.action === "review") {
      if (!/^[0-9a-f-]{36}$/i.test(String(input.order_id || "")) ||
          !["approved", "rejected"].includes(input.decision) ||
          typeof input.note !== "string" || input.note.length > 500) {
        return send({ error: "Invalid review details." }, 400);
      }
      if(input.decision==="approved"){
        const {data:order,error:orderError}=await db.from("ark60_billing_orders").select("plan_key").eq("id",input.order_id).maybeSingle();
        if(orderError)throw orderError;
        if(order?.plan_key==="all_access")return send({error:"All Access eski kombinatsiya paketini tasdiqlab bo‘lmaydi. To‘lov o‘tkazilgan bo‘lsa, o‘quvchi bilan alohida kelishing; yangi Challenge va Full MOCK buyurtmalari alohida rasmiylashtiriladi."},409);
      }
      const { data, error } = await db.rpc("ark60_billing_review_v2", {
        p_order: input.order_id, p_admin: admin.id,
        p_decision: input.decision, p_note: input.note, p_mock:input.mock_on||null, p_bank_ref:input.transaction_ref||null,
      });
      if (error) return send({ error: error.code==="23505"?"Bu bank tranzaksiyasi avval qayd qilingan.":error.message.includes("already reviewed") ? "Bu to‘lov allaqachon tekshirilgan." : "To‘lovni tekshirish amalga oshmadi. MOCK sanasi yoki mavjud ruxsatni tekshiring." }, 409);
      return send({ order: data });
    }
    if(input.action==="revoke"){
      if(!/^[0-9a-f-]{36}$/i.test(String(input.order_id||""))||typeof input.note!=="string"||input.note.trim().length<3)return send({error:"Sabab yozing."},400);
      const {error}=await db.rpc("ark60_billing_revoke",{p_admin:admin.id,p_order:input.order_id,p_reason:input.note.slice(0,500)});
      if(error)return send({error:"Tasdiqni qaytarib bo‘lmadi. Sahifani yangilang."},409);
      return send({ok:true});
    }
    if(input.action==="revoke_grant"){
      if(!/^[0-9a-f-]{36}$/i.test(String(input.access_id||""))||typeof input.note!=="string"||input.note.trim().length<3)return send({error:"Sabab yozing."},400);
      const {error}=await db.rpc("ark60_billing_revoke_grant",{p_admin:admin.id,p_access:input.access_id,p_reason:input.note.slice(0,500)});
      if(error)return send({error:"Imtiyozni qaytarib bo‘lmadi."},409);
      return send({ok:true});
    }
    if(input.action==="grant"){
      if(!/^[0-9a-f-]{36}$/i.test(String(input.student_id||""))||!["challenge","mock"].includes(input.plan)||!Number.isInteger(input.days)||input.days<1||input.days>60||typeof input.note!=="string"||input.note.trim().length<3||!Number.isFinite(Date.parse(input.starts_at)))return send({error:"Imtiyoz ma’lumotlarini tekshiring."},400);
      const {error}=await db.rpc("ark60_billing_grant",{p_admin:admin.id,p_student:input.student_id,p_plan:input.plan,p_start:input.starts_at,p_days:input.days,p_mock:input.mock_on||null,p_note:input.note.slice(0,500)});
      if(error)return send({error:"Imtiyoz berilmadi. Sana va o‘quvchini tekshiring."},409);
      return send({ok:true});
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
