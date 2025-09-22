const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createUser() {
  // Hash password
  const password = 'vitechgroup2025';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  console.log('Password hash generated:', passwordHash);
  
  // Database connection
  const client = new Client({
    connectionString: 'postgres://mkt_user:VitechGroup2023%40@localhost:5432/mkt_crm'
  });
  
  try {
    await client.connect();
    
    // Insert user
    const userResult = await client.query(`
      INSERT INTO core."user" (
        id,
        "firstName",
        "lastName", 
        email,
        "emailVerified",
        "defaultWorkspaceId",
        "passwordHash",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'Developer',
        'Phanem MKT',
        'dev@phanemmkt.vn',
        true,
        '20202020-1c25-4d02-bf25-6aeccf7ea419',
        $1,
        NOW(),
        NOW()
      ) ON CONFLICT (email) DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName", 
        "passwordHash" = EXCLUDED."passwordHash",
        "updatedAt" = NOW()
      RETURNING id;
    `, [passwordHash]);
    
    const userId = userResult.rows[0].id;
    console.log('User created with ID:', userId);
    
    // Insert workspace member
    await client.query(`
      INSERT INTO core."workspaceMember" (
        id,
        "userId",
        "workspaceId", 
        name,
        "avatarUrl",
        "userEmail",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        $1,
        '20202020-1c25-4d02-bf25-6aeccf7ea419',
        'Developer Phanem MKT',
        '',
        'dev@phanemmkt.vn',
        NOW(),
        NOW()
      ) ON CONFLICT DO NOTHING;
    `, [userId]);
    
    console.log('Workspace member created');
    
    // Verify user
    const verifyResult = await client.query(`
      SELECT 
        u.id,
        u.email, 
        u."firstName", 
        u."lastName",
        w."displayName" as workspace
      FROM core."user" u 
      JOIN core."workspaceMember" wm ON u.id = wm."userId"
      JOIN core."workspace" w ON wm."workspaceId" = w.id
      WHERE u.email = 'dev@phanemmkt.vn';
    `);
    
    console.log('User verification:', verifyResult.rows[0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createUser();
