const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function createWorkspaceAndLink() {
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
    
    // Tìm user đã tạo
    const userResult = await client.query(
      'SELECT id FROM core."user" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('Không tìm thấy user với email:', email);
      return;
    }

    const userId = userResult.rows[0].id;
    console.log('Tìm thấy user với ID:', userId);

    // Kiểm tra xem đã có workspace chưa
    const existingWorkspace = await client.query(
      'SELECT w.id FROM core.workspace w JOIN core."userWorkspace" uw ON w.id = uw."workspaceId" WHERE uw."userId" = $1',
      [userId]
    );

    if (existingWorkspace.rows.length > 0) {
      console.log('User đã có workspace với ID:', existingWorkspace.rows[0].id);
      return;
    }

    // Tạo workspace mới
    const workspaceId = uuidv4();
    const inviteHash = uuidv4();
    
    const workspaceQuery = `
      INSERT INTO core.workspace (
        id, 
        "displayName", 
        "inviteHash", 
        "allowImpersonation", 
        "activationStatus", 
        "metadataVersion", 
        "databaseUrl", 
        "databaseSchema", 
        "isPublicInviteLinkEnabled", 
        subdomain, 
        "isMicrosoftAuthEnabled", 
        "isGoogleAuthEnabled", 
        "isPasswordAuthEnabled", 
        "isCustomDomainEnabled",
        "isTwoFactorAuthenticationEnforced"
      ) VALUES (
        $1, $2, $3, true, 'ACTIVE', 1, '', '', true, $4, true, true, true, false, false
      ) RETURNING id
    `;

    const workspaceResult = await client.query(workspaceQuery, [
      workspaceId,
      'Phanem MKT Workspace',
      inviteHash,
      'phanemmkt' // subdomain
    ]);

    console.log('Workspace đã tạo với ID:', workspaceResult.rows[0].id);

    // Liên kết user với workspace
    const userWorkspaceQuery = `
      INSERT INTO core."userWorkspace" (
        id, 
        "userId", 
        "workspaceId", 
        "createdAt", 
        "updatedAt"
      ) VALUES (
        $1, $2, $3, NOW(), NOW()
      )
    `;

    await client.query(userWorkspaceQuery, [
      uuidv4(),
      userId,
      workspaceId
    ]);

    console.log('User đã được liên kết với workspace thành công!');
    console.log('');
    console.log('Thông tin đăng nhập:');
    console.log('Email: dev@phanemmkt.vn');
    console.log('Password: vitechgroup2025');
    console.log('Workspace: Phanem MKT Workspace');

  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await client.end();
  }
}

createWorkspaceAndLink();