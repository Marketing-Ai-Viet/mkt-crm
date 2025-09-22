const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createUser() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'mkt_crm',
    user: 'mkt_user',
    password: 'VitechGroup2023@',
  });

  try {
    await client.connect();

    const email = 'dev@phanemmkt.vn';
    const password = 'vitechgroup2025';
    
    // Kiểm tra xem user đã tồn tại chưa
    const existingUser = await client.query(
      'SELECT id FROM core."user" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('User đã tồn tại với email:', email);
      return;
    }

    // Tạo password hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('Password hash đã tạo:', passwordHash);

    // Tạo user đơn giản chỉ với các cột cần thiết
    const userId = uuidv4();
    const userQuery = `
      INSERT INTO core."user" (
        id, 
        "firstName", 
        "lastName", 
        email, 
        "isEmailVerified", 
        "passwordHash", 
        "canImpersonate", 
        "createdAt", 
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
      RETURNING id
    `;

    const userResult = await client.query(userQuery, [
      userId,
      'Dev',
      'User',
      email,
      true,
      passwordHash
    ]);

    console.log('User đã tạo thành công với ID:', userResult.rows[0].id);
    console.log('Thông tin đăng nhập:');
    console.log('Email:', email);
    console.log('Password:', password);

  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await client.end();
  }
}

createUser();