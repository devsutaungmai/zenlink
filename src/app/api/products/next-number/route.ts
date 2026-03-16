import { NextResponse } from 'next/server';
import {  generateProductNumber, getBusinessId } from '@/shared/lib/invoiceHelper';

export async function GET() {
  const businessId = await getBusinessId();

  const result = await generateProductNumber(businessId);

  return NextResponse.json(result);
}
