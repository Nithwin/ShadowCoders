// hash-password.js
const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainTextPassword = 'shadowadmin'; // The password you want to hash

bcrypt.hash(plainTextPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Your hashed password is:');
    console.log(hash);
});