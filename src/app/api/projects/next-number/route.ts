import { NextResponse } from 'next/server';
import { generateProjectNumber, getBusinessId } from '@/shared/lib/invoiceHelper';

export async function GET() {
  const businessId = await getBusinessId();

  const result = await generateProjectNumber(businessId);

  return NextResponse.json(result);
}
