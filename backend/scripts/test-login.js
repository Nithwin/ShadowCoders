const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testUser() {
  try {
    const email = '22cs004@nandhaengg.org';
    const password = '26/09/2004';
    
    console.log('Checking user:', email);
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password
    });
    
    if (user.password) {
      const isValid = await bcrypt.compare(password, user.password);
      console.log('Password test:', isValid ? '✅ VALID' : '❌ INVALID');
      
      // Test with trimmed password
      const isValidTrimmed = await bcrypt.compare(password.trim(), user.password);
      console.log('Password test (trimmed):', isValidTrimmed ? '✅ VALID' : '❌ INVALID');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUser();
