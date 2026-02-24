import { Prisma } from '@prisma/client'

export const shiftWithRelationsInclude = {
  employee: {
    select: {
      firstName: true,
      lastName: true,
      department: {
        select: {
          name: true
        }
      }
    }
  },
  employeeGroup: {
    select: {
      name: true
    }
  },
  department: {
    select: {
      id: true,
      name: true
    }
  },
  shiftTypeConfig: {
    select: {
      id: true,
      name: true
    }
  },
  function: {
    select: {
      id: true,
      name: true,
      color: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          departmentId: true
        }
      }
    }
  },
  shiftExchanges: {
    where: {
      status: 'APPROVED' as const
    },
    include: {
      fromEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: {
            select: {
              name: true
            }
          }
        }
      },
      toEmployee: {
        select: {
          firstName: true,
          lastName: true,
          department: {
            select: {
              name: true
            }
          }
        }
      }
    }
  }
} satisfies Prisma.ShiftInclude
