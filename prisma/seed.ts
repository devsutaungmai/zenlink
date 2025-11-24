import { InvoiceDueDateType, PaymentTimeUnit, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, get the first business to use as default
  const business = await prisma.business.findFirst()

  if (!business) {
    console.log('No business found. Please create a business first.')
    return
  }

  console.log('Seeding salary codes for business:', business.name)

  // // Create default salary codes
  // const defaultSalaryCodes = [
  //   {
  //     code: '120',
  //     name: 'Hourly Wages',
  //     description: 'Standard hourly wages for regular work',
  //   },
  //   {
  //     code: '1203',
  //     name: 'Sick Pay',
  //     description: 'Sick pay based on average salary calculation',
  //   },
  //   {
  //     code: '1201',
  //     name: 'Supervisor Shift Wages',
  //     description: 'Additional wages for supervisor shifts',
  //   },
  //   {
  //     code: '121',
  //     name: 'Overtime Wages',
  //     description: 'Overtime wages at premium rates',
  //   },
  // ]

  // for (const salaryCode of defaultSalaryCodes) {
  //   try {
  //     const created = await prisma.salaryCode.upsert({
  //       where: {
  //         code_businessId: {
  //           code: salaryCode.code,
  //           businessId: business.id,
  //         },
  //       },
  //       update: {
  //         name: salaryCode.name,
  //         description: salaryCode.description,
  //       },
  //       create: {
  //         code: salaryCode.code,
  //         name: salaryCode.name,
  //         description: salaryCode.description,
  //         businessId: business.id,
  //       },
  //     })
  //     console.log(`✓ Created/Updated salary code: ${created.code} - ${created.name}`)
  //   } catch (error) {
  //     console.log(`✗ Failed to create salary code ${salaryCode.code}:`, error)
  //   }
  // }

  // // Create some default pay rules
  // const hourlyWagesCode = await prisma.salaryCode.findFirst({
  //   where: { code: '120', businessId: business.id },
  // })

  // const overtimeCode = await prisma.salaryCode.findFirst({
  //   where: { code: '121', businessId: business.id },
  // })

  // if (hourlyWagesCode) {
  //   try {
  //     const basePayRule = await prisma.payRule.upsert({
  //       where: {
  //         name_businessId: {
  //           name: 'Standard Hourly Rate',
  //           businessId: business.id,
  //         },
  //       },
  //       update: {
  //         description: 'Standard hourly pay rate for all employees',
  //         ratePerHour: 15.00,
  //         isActive: true,
  //       },
  //       create: {
  //         name: 'Standard Hourly Rate',
  //         description: 'Standard hourly pay rate for all employees',
  //         ratePerHour: 15.00,
  //         isActive: true,
  //         businessId: business.id,
  //         salaryCodeId: hourlyWagesCode.id,
  //       },
  //     })
  //     console.log(`✓ Created/Updated pay rule: ${basePayRule.name}`)

  //     if (overtimeCode) {
  //       await prisma.overtimeRule.upsert({
  //         where: {
  //           payRuleId: basePayRule.id,
  //         },
  //         update: {
  //           triggerHours: 8,
  //           overtimeMultiplier: 1.5,
  //           maxOvertimeHours: 4,
  //         },
  //         create: {
  //           payRuleId: basePayRule.id,
  //           triggerHours: 8,
  //           overtimeMultiplier: 1.5,
  //           maxOvertimeHours: 4,
  //         },
  //       })
  //       console.log('✓ Created/Updated overtime rule for standard pay')
  //     }
  //   } catch (error) {
  //     console.log('✗ Failed to create pay rule:', error)
  //   }
  // }
  console.log('Start seeding...');

  // Term 1: 14 days after invoice date
  const term1 = await prisma.invoicePaymentTerms.upsert({
    where: {
      id: `default-term-14-days`,
    },
    update: {},
    create: {
      id: `default-term-14-days`,
      invoiceDueDateType: InvoiceDueDateType.DAYS_AFTER,
      invoiceDueDateValue: 14,
      invoiceDueDateUnit: PaymentTimeUnit.DAYS,
      defaultDiscountPercent: 0,
      businessId: business.id,
    },
  });

  console.log('✓ Created payment term 1: 14 days after invoice date');

  // Term 2: Fixed date day 1 of month
  const term2 = await prisma.invoicePaymentTerms.upsert({
    where: {
      id: `default-term-fixed-1`,
    },
    update: {},
    create: {
      id: `default-term-fixed-1`,
      invoiceDueDateType: InvoiceDueDateType.FIXED_DATE,
      invoiceDueDateValue: 1,
      invoiceDueDateUnit: PaymentTimeUnit.MONTHS,
      defaultDiscountPercent: 0,
      businessId: business.id,
    },
  });

  console.log('✓ Created payment term 2: Fixed day 1 of each month');

  // Create Units
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { name: 'Piece' },
      update: {},
      create: {
        name: 'Piece',
        symbol: 'pcs',
        description: 'Individual pieces or units',
      },
    }),
    prisma.unit.upsert({
      where: { name: 'Kilogram' },
      update: {},
      create: {
        name: 'Kilogram',
        symbol: 'kg',
        description: 'Weight measurement in kilograms',
      },
    }),
    prisma.unit.upsert({
      where: { name: 'Liter' },
      update: {},
      create: {
        name: 'Liter',
        symbol: 'l',
        description: 'Volume measurement in liters',
      },
    }),
    prisma.unit.upsert({
      where: { name: 'Meter' },
      update: {},
      create: {
        name: 'Meter',
        symbol: 'm',
        description: 'Length measurement in meters',
      },
    }),
    prisma.unit.upsert({
      where: { name: 'Box' },
      update: {},
      create: {
        name: 'Box',
        symbol: 'box',
        description: 'Boxed items',
      },
    }),
  ]);

  console.log('✓ Units created');

  // Create Product Groups
  const productGroups = await Promise.all([
    prisma.productGroup.upsert({
      where: { code: 'ELEC' },
      update: {},
      create: {
        name: 'Electronics',
        code: 'ELEC',
        description: 'Electronic devices and accessories',
      },
    }),
    prisma.productGroup.upsert({
      where: { code: 'FOOD' },
      update: {},
      create: {
        name: 'Food & Beverages',
        code: 'FOOD',
        description: 'Food items and drinks',
      },
    }),
    prisma.productGroup.upsert({
      where: { code: 'FURN' },
      update: {},
      create: {
        name: 'Furniture',
        code: 'FURN',
        description: 'Furniture and home accessories',
      },
    }),
    prisma.productGroup.upsert({
      where: { code: 'CLTH' },
      update: {},
      create: {
        name: 'Clothing',
        code: 'CLTH',
        description: 'Apparel and fashion items',
      },
    }),
    prisma.productGroup.upsert({
      where: { code: 'STAT' },
      update: {},
      create: {
        name: 'Stationery',
        code: 'STAT',
        description: 'Office and school supplies',
      },
    }),
  ]);

  console.log('✓ Product Groups created');

  // Create Sales Accounts
  const salesAccounts = await Promise.all([
    prisma.salesAccount.upsert({
      where: { accountNumber: '4000' },
      update: {},
      create: {
        accountNumber: '4000',
        accountName: 'Product Sales',
        description: 'General product sales revenue',
        isActive: true,
      },
    }),
    prisma.salesAccount.upsert({
      where: { accountNumber: '4100' },
      update: {},
      create: {
        accountNumber: '4100',
        accountName: 'Service Revenue',
        description: 'Revenue from services',
        isActive: true,
      },
    }),
    prisma.salesAccount.upsert({
      where: { accountNumber: '4200' },
      update: {},
      create: {
        accountNumber: '4200',
        accountName: 'Retail Sales',
        description: 'Retail product sales',
        isActive: true,
      },
    }),
    prisma.salesAccount.upsert({
      where: { accountNumber: '4300' },
      update: {},
      create: {
        accountNumber: '4300',
        accountName: 'Wholesale Sales',
        description: 'Wholesale product sales',
        isActive: true,
      },
    }),
  ]);

  console.log('✓ Sales Accounts created');
  console.log('Creating projects...');

  const departments = await prisma.department.findMany({
    where: { businessId: business.id },
  });

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id },
  });

  if (departments.length === 0 || customers.length === 0) {
    console.log('No departments or customers found. Skipping projects.');
    return;
  }

  // const projectsData = [
  //   {
  //     name: 'Website Redesign',
  //     projectNumber: 'PRJ-2024-001',
  //     status: 'In Progress',
  //     category: 'Web Development',
  //     startDate: new Date('2024-01-15'),
  //     endDate: new Date('2024-06-30'),
  //     active: true,
  //   },
  //   {
  //     name: 'Mobile App Development',
  //     projectNumber: 'PRJ-2024-002',
  //     status: 'Planning',
  //     category: 'Mobile Development',
  //     startDate: new Date('2024-02-01'),
  //     endDate: new Date('2024-08-31'),
  //     active: true,
  //   },
  //   {
  //     name: 'Database Migration',
  //     projectNumber: 'PRJ-2024-003',
  //     status: 'Completed',
  //     category: 'Infrastructure',
  //     startDate: new Date('2023-11-01'),
  //     endDate: new Date('2024-01-31'),
  //     active: false,
  //   },
  //   {
  //     name: 'Marketing Campaign Q1',
  //     projectNumber: 'PRJ-2024-004',
  //     status: 'In Progress',
  //     category: 'Marketing',
  //     startDate: new Date('2024-01-01'),
  //     endDate: new Date('2024-03-31'),
  //     active: true,
  //   },
  //   {
  //     name: 'ERP System Implementation',
  //     projectNumber: 'PRJ-2024-005',
  //     status: 'Planning',
  //     category: 'Enterprise Software',
  //     startDate: new Date('2024-03-01'),
  //     endDate: new Date('2024-12-31'),
  //     active: true,
  //   },
  //   {
  //     name: 'Office Renovation',
  //     projectNumber: 'PRJ-2024-006',
  //     status: 'On Hold',
  //     category: 'Facilities',
  //     startDate: new Date('2024-04-01'),
  //     endDate: new Date('2024-05-31'),
  //     active: true,
  //   },
  // ];

  // const createdProjects = [];

  // for (let i = 0; i < projectsData.length; i++) {
  //   const projectData = projectsData[i];
  //   const department = departments[i % departments.length];
  //   const customer = customers[i % customers.length];

  //   try {
  //     const project = await prisma.project.upsert({
  //       where: { projectNumber: projectData.projectNumber },
  //       update: { ...projectData },
  //       create: {
  //         ...projectData,
  //         departmentId: department.id,
  //         customerId: customer.id,
  //       },
  //     });

  //     createdProjects.push(project);
  //     console.log(`✓ Created project: ${project.projectNumber} - ${project.name}`);
  //   } catch (error) {
  //     console.log(`✗ Failed to create project ${projectData.projectNumber}:`, error);
  //   }
  // }

  // console.log(`✓ Created ${createdProjects.length} projects`);
  console.log(`Found ${customers.length} customers`)

  for (const customer of customers) {
    // 2. Check if contact person already exists (avoid duplicate seeds)
    const existingContact = await prisma.contactPerson.findFirst({
      where: { customerId: customer.id },
    })

    if (existingContact) {
      console.log(
        `Skipping ${customer.customerName} — contact already exists`
      )
      continue
    }

    // 3. Create default contact
    await prisma.contactPerson.create({
      data: {
        customerId: customer.id,
        name: `${customer.customerName} Main Contact`,
        title: 'Manager',
        phoneNumber: '099-999-9999',
        email: `contact+${customer.id.slice(0, 6)}@example.com`,
        isPrimary: true,
      },
    })

    console.log(`Created contact for ${customer.customerName}`)
  }

   const categories = [
    { name: "Internal" },
    { name: "External" },
    { name: "Maintenance" },
    { name: "Development" },
    { name: "Service" },
    { name: "Other" }
  ]

  for (const cat of categories) {
    await prisma.projectCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  console.log("✅ Project categories seeded!")

  console.log('✓ Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
