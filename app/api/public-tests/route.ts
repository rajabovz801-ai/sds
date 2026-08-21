import { NextResponse } from 'next/server';
import { listPublishedTests } from '@/lib/cloudTests';

export async function GET(){
  try{return NextResponse.json({tests:await listPublishedTests()});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Server error',tests:[]},{status:500});}
}
