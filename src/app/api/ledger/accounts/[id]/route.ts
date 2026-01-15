import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

// GET /api/ledger/accounts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      // For employees, get businessId from their department
      businessId = (auth.data as any).department.businessId
    }
    const defaultLedgerAccount =
      request.nextUrl.searchParams.get('default') === 'true'
    const whereClause = defaultLedgerAccount
      ? { id: id }
      : { id: id, businessId: businessId }
    const ledgerAccount = await prisma.ledgerAccount.findFirst({
      where: whereClause,
      include: {
        vatCode: true,
        businessVatCodes: {
          where: { businessId, ledgerAccountId: id },
          include: { vatCode: true }
        }
      }
    })

    if (!ledgerAccount) {
      return NextResponse.json({ error: 'LedgerAccount not found' }, { status: 404 })
    }

    return NextResponse.json(ledgerAccount)
  } catch (error) {
    console.error('Error fetching LedgerAccount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ledger/accounts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const body = await request.json()
    const { accountNumber, name, type, vatCodeId, ...otherFields } = body

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and Type are required' },
        { status: 400 }
      )
    }

    // Check if this is a default (shared) account or a custom (business-specific) account
    const existingLedgerAccount = await prisma.ledgerAccount.findUnique({
      where: { id },
      select: { 
        id: true, 
        businessId: true,
        accountNumber: true,
        name: true,
        type: true
      }
    })

    if (!existingLedgerAccount) {
      return NextResponse.json(
        { error: 'Ledger account not found' },
        { status: 404 }
      )
    }
    const isDefaultAccount = existingLedgerAccount.businessId === null
    const isOwnedByBusiness = existingLedgerAccount.businessId === businessId

    // Security check: if it's a custom account, make sure it belongs to this business
    if (!isDefaultAccount && !isOwnedByBusiness) {
      return NextResponse.json(
        { error: 'Unauthorized to update this account' },
        { status: 403 }
      )
    }

     if (isDefaultAccount) {
      // Case 1: Updating a DEFAULT account
      
      // VALIDATION: Account number cannot be changed for default accounts
      if (accountNumber && accountNumber !== existingLedgerAccount.accountNumber) {
        return NextResponse.json(
          { error: 'Cannot change account number for default accounts' },
          { status: 400 }
        )
      }

      // For default accounts:
      // - Update name, type, and other fields directly on the default account
      // - Customize VAT code via junction table
      
      // Update the default account's editable fields
      const updatedAccount = await prisma.ledgerAccount.update({
        where: { id },
        data: {
          name,
          type,
          ...otherFields
          // Note: NOT updating vatCodeId here, that goes to junction table
        }
      })

      // Handle VAT code customization separately via junction table
      if (vatCodeId) {
        await prisma.businessLedgerAccountVatCode.upsert({
          where: {
            businessId_ledgerAccountId: {
              businessId,
              ledgerAccountId: id
            }
          },
          create: {
            businessId,
            ledgerAccountId: id,
            vatCodeId
          },
          update: {
            vatCodeId
          }
        })
      } else {
        // If vatCodeId is null/undefined, remove customization (reset to default)
        await prisma.businessLedgerAccountVatCode.deleteMany({
          where: {
            businessId,
            ledgerAccountId: id
          }
        })
      }

      // Return the account with customization info
      const accountWithCustomization = await prisma.ledgerAccount.findUnique({
        where: { id },
        include: {
          vatCode: true,
          businessVatCodes: {
            where: { businessId },
            include: { vatCode: true }
          }
        }
      })

      const customVatCode = accountWithCustomization?.businessVatCodes[0]?.vatCode
      const effectiveVatCode = customVatCode || accountWithCustomization?.vatCode

      return NextResponse.json({
        ...accountWithCustomization,
        effectiveVatCode,
        isVatCodeCustomized: !!customVatCode,
        isDefaultAccount: true
      })

    } else {
      // Case 2: Updating a CUSTOM account (already belongs to this business)
      
      // For custom accounts, everything including accountNumber can be changed
      if (!accountNumber) {
        return NextResponse.json(
          { error: 'Account number is required' },
          { status: 400 }
        )
      }

      // Check if the new account number conflicts with another account
      if (accountNumber !== existingLedgerAccount.accountNumber) {
        const conflictingAccount = await prisma.ledgerAccount.findFirst({
          where: {
            accountNumber,
            businessId,
            id: { not: id }
          }
        })

        if (conflictingAccount) {
          return NextResponse.json(
            { error: `Account number ${accountNumber} is already in use` },
            { status: 409 }
          )
        }
      }

      // Update custom account directly (all fields including vatCodeId)
      const updatedAccount = await prisma.ledgerAccount.update({
        where: { id },
        data: {
          accountNumber,
          name,
          type,
          vatCodeId,
          ...otherFields
        },
        include: {
          vatCode: true,
          businessVatCodes: {
            where: { businessId },
            include: { vatCode: true }
          }
        }
      })

      return NextResponse.json({
        ...updatedAccount,
        isDefaultAccount: false,
        isCustomized: true
      })
    }
    // let ledgerAccount = null;
    // if (defaultLedgerAccount) {
    //   ledgerAccount = await prisma.businessLedgerAccountVatCode.upsert({
    //     where: {
    //       businessId_ledgerAccountId: {
    //         businessId,
    //         ledgerAccountId: id
    //       }
    //     },
    //     create: {
    //       businessId,
    //       ledgerAccountId: id,
    //       vatCodeId: vatCodeId
    //     },
    //     update: {
    //       vatCodeId: vatCodeId
    //     }
    //   });

    // } else {
    //   ledgerAccount = await prisma.ledgerAccount.update({
    //     where: { id: id },
    //     data: body
    //   })
    // }
    // return NextResponse.json(ledgerAccount)
  } catch (error: any) {
    console.error('Error updating ledgerAccount:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'LedgerAccount name already exists in this department' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getCurrentUserOrEmployee()

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let businessId: string
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId
    } else {
      const employeeData = auth.data as any
      if (!employeeData.department || !employeeData.department.businessId) {
        return NextResponse.json({ error: 'Employee department not found' }, { status: 404 })
      }
      businessId = employeeData.department.businessId
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const ledgerAccount = await prisma.ledgerAccount.findFirst({
      where: {
        id: id,
        businessId: businessId
      }
    })

    if (!ledgerAccount) {
      return NextResponse.json({ error: 'LedgerAccount not found' }, { status: 404 })
    }

    await prisma.ledgerAccount.delete({
      where: { id: id }
    })

    return NextResponse.json({ message: 'LedgerAccount deleted successfully' })
  } catch (error) {
    console.error('Error deleting ledgerAccount:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
