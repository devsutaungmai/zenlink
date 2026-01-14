import { NextResponse } from 'next/server';
import { generateCustomerNumber, getBusinessId } from '@/shared/lib/invoiceHelper';

export async function GET() {
  const businessId = await getBusinessId();

  const result = await generateCustomerNumber(businessId);

  return NextResponse.json(result);
}
