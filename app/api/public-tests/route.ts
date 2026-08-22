import { NextRequest, NextResponse } from 'next/server';
import { listPublishedTests } from '@/lib/cloudTests';
import { readActiveStudentSession } from '@/lib/auth/active-student';

export async function GET(request:NextRequest){
  if (!await readActiveStudentSession(request)) return NextResponse.json({error:'Student sessiyasi faol emas.',tests:[]},{status:403});
  try{return NextResponse.json({tests:await listPublishedTests()},{headers:{'Cache-Control':'private, max-age=60'}});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error',tests:[]},{status:500});}
}
