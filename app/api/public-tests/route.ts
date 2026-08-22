import { NextRequest, NextResponse } from 'next/server';
import { listPublishedTests } from '@/lib/cloudTests';
import { readSession } from '@/lib/auth/session';

export async function GET(request:NextRequest){
  if (!readSession(request)) return NextResponse.json({error:'Avval platformaga kiring.',tests:[]},{status:401});
  try{return NextResponse.json({tests:await listPublishedTests()},{headers:{'Cache-Control':'private, max-age=60'}});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error',tests:[]},{status:500});}
}
