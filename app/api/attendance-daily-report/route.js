export const runtime = "nodejs";
export async function GET() {
  return Response.json({ok:false, error:"Legacy attendance bot retired"}, {status:410});
}
