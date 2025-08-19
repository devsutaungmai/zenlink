import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function generateActivationCode(): string {
  // Generate a 6-digit alphanumeric code
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser?.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const profileId = params.id;
    
    // Verify the profile belongs to the user's business
    const profile = await prisma.punchClockProfile.findFirst({
      where: {
        id: profileId,
        businessId: currentUser.businessId,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Generate a new activation code
    const activationCode = generateActivationCode();

    // Update the profile with the new activation code
    const updatedProfile = await prisma.punchClockProfile.update({
      where: {
        id: profileId,
      },
      data: {
        activationCode,
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      activationCode,
    });
  } catch (error) {
    console.error('Error generating activation code:', error);
    return NextResponse.json(
      { error: 'Failed to generate activation code' },
      { status: 500 }
    );
  }
}
