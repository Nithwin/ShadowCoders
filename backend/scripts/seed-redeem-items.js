const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding redeem items...');

  // Deactivate old items instead of deleting (to preserve foreign key relationships)
  await prisma.redeemItem.updateMany({
    where: {
      itemType: {
        in: ['LEAVE_1_DAY', 'LEAVE_1_WEEK'],
      },
    },
    data: {
      isActive: false,
    },
  });
  console.log('Deactivated old redeem items');

  // Find or create 1-day leave + surprise gift item
  let oneDayLeaveGift = await prisma.redeemItem.findFirst({
    where: {
      itemType: 'LEAVE_1_DAY_GIFT',
    },
  });

  if (oneDayLeaveGift) {
    oneDayLeaveGift = await prisma.redeemItem.update({
      where: { id: oneDayLeaveGift.id },
      data: {
        name: 'One Day Leave + Surprise Gift',
        description: 'Redeem points for a 1-day leave approval plus a surprise gift',
        pointsCost: 3000,
        isActive: true,
        metadata: {
          duration: 1,
          unit: 'day',
          includesGift: true,
        },
      },
    });
    console.log('Updated 1-day leave + surprise gift item:', oneDayLeaveGift.id);
  } else {
    oneDayLeaveGift = await prisma.redeemItem.create({
      data: {
        name: 'One Day Leave + Surprise Gift',
        description: 'Redeem points for a 1-day leave approval plus a surprise gift',
        pointsCost: 3000,
        itemType: 'LEAVE_1_DAY_GIFT',
        isActive: true,
        metadata: {
          duration: 1,
          unit: 'day',
          includesGift: true,
        },
      },
    });
    console.log('Created 1-day leave + surprise gift item:', oneDayLeaveGift.id);
  }

  // Find or create 2-days leave + surprise gift item
  let twoDaysLeaveGift = await prisma.redeemItem.findFirst({
    where: {
      itemType: 'LEAVE_2_DAYS_GIFT',
    },
  });

  if (twoDaysLeaveGift) {
    twoDaysLeaveGift = await prisma.redeemItem.update({
      where: { id: twoDaysLeaveGift.id },
      data: {
        name: 'Two Days Leave + Surprise Gift',
        description: 'Redeem points for a 2-days leave approval plus a surprise gift',
        pointsCost: 5000,
        isActive: true,
        metadata: {
          duration: 2,
          unit: 'days',
          includesGift: true,
        },
      },
    });
    console.log('Updated 2-days leave + surprise gift item:', twoDaysLeaveGift.id);
  } else {
    twoDaysLeaveGift = await prisma.redeemItem.create({
      data: {
        name: 'Two Days Leave + Surprise Gift',
        description: 'Redeem points for a 2-days leave approval plus a surprise gift',
        pointsCost: 5000,
        itemType: 'LEAVE_2_DAYS_GIFT',
        isActive: true,
        metadata: {
          duration: 2,
          unit: 'days',
          includesGift: true,
        },
      },
    });
    console.log('Created 2-days leave + surprise gift item:', twoDaysLeaveGift.id);
  }

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

