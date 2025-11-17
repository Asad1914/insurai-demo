import bcrypt from 'bcrypt';
import pool from '../config/database.js';

async function fixAdminPassword() {
  try {
    console.log('🔐 Generating new password hash for Admin@123...');

    // Generate hash for Admin@123
    const password = 'Admin@123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('✅ Password hash generated');
    console.log('📝 Updating admin user...');

    // Update admin user password
    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE email = 'admin@insurai.com'
       RETURNING id, email, full_name, role`,
      [passwordHash]
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('');
      console.log('Admin credentials:');
      console.log('Email: admin@insurai.com');
      console.log('Password: Admin@123');
      console.log('');
      console.log('User details:', result.rows[0]);
    } else {
      console.log('❌ Admin user not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
    process.exit(1);
  }
}

fixAdminPassword();
