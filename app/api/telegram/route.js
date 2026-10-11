export const runtime = "nodejs";

export async function GET() {
  return Response.json({ok:false, error:"This legacy bot endpoint has been retired"}, {status:410});
}

export const POST = GET;
