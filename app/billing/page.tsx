import { redirect } from "next/navigation";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ view: "Billing" });
  if (params.plan === "challenge" || params.plan === "mock") {
    query.set("plan", params.plan);
  }
  redirect(`/dashboard?${query.toString()}`);
}
