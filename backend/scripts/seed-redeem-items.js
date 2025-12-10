const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding redeem items...');

  // Check if items already exist
  const existingItems = await prisma.redeemItem.findMany({
    where: {
      itemType: {
        in: ['LEAVE_1_DAY', 'LEAVE_1_WEEK'],
      },
    },
  });

  if (existingItems.length > 0) {
    console.log('Redeem items already exist. Skipping seed.');
    return;
  }

  // Create 1-day leave item
  const oneDayLeave = await prisma.redeemItem.create({
    data: {
      name: '1-Day Leave',
      description: 'Redeem points for a 1-day leave approval',
      pointsCost: 500, // High cost as requested
      itemType: 'LEAVE_1_DAY',
      isActive: true,
      metadata: {
        duration: 1,
        unit: 'day',
      },
    },
  });
  console.log('Created 1-day leave item:', oneDayLeave.id);

  // Create 1-week leave item
  const oneWeekLeave = await prisma.redeemItem.create({
    data: {
      name: '1-Week Leave',
      description: 'Redeem points for a 1-week leave approval',
      pointsCost: 3000, // Very high cost as requested
      itemType: 'LEAVE_1_WEEK',
      isActive: true,
      metadata: {
        duration: 7,
        unit: 'days',
      },
    },
  });
  console.log('Created 1-week leave item:', oneWeekLeave.id);

  console.log('Redeem items seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding redeem items:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

