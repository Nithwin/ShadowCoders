
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function resetPassword() {
    const email = 'shadowadmin@gmail.com';
    const password = 'shadowadmin';

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await prisma.user.update({
            where: { email: email },
            data: { password: hashedPassword }
        });

        console.log(`Password reset successfully for ${email}`);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
