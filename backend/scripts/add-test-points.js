const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTestPoints() {
  try {
    const email = '22cs004@nandhaengg.org';
    const pointsToAdd = 10000;

    console.log(`Looking for user with email: ${email}...`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, points: true },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`Current points: ${user.points || 0}`);

    // Add points using the points service logic
    const currentPoints = user.points || 0;
    const newBalance = currentPoints + pointsToAdd;

    // Update user points
    await prisma.user.update({
      where: { id: user.id },
      data: { points: newBalance },
    });

    // Create history entry
    await prisma.pointsHistory.create({
      data: {
        userId: user.id,
        points: pointsToAdd,
        balance: newBalance,
        type: 'EARNED',
        description: 'Test points added via script',
      },
    });

    console.log(`✅ Successfully added ${pointsToAdd} points!`);
    console.log(`New balance: ${newBalance} points`);

  } catch (error) {
    console.error('❌ Error adding points:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPoints();

