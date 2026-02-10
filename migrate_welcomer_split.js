import pool from './src/database/database.js';

async function run() {
    console.log('🔄 Migrating welcomer_config table...');
    const connection = await pool.getConnection();
    try {
        // 1. Add new columns
        console.log('Adding new columns...');
        await connection.query(`
            ALTER TABLE welcomer_config
            ADD COLUMN welcome_enabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN welcome_channel_id VARCHAR(20),
            ADD COLUMN welcome_message TEXT,
            ADD COLUMN welcome_background_url TEXT,
            ADD COLUMN goodbye_enabled BOOLEAN DEFAULT FALSE,
            ADD COLUMN goodbye_channel_id VARCHAR(20),
            ADD COLUMN goodbye_message TEXT,
            ADD COLUMN goodbye_background_url TEXT
        `);

        // 2. Migrate existing data to 'welcome' columns
        console.log('Migrating data...');
        await connection.query(`
            UPDATE welcomer_config
            SET 
                welcome_enabled = enabled,
                welcome_channel_id = channel_id,
                welcome_message = message,
                welcome_background_url = background_url
        `);

        // 3. Drop old columns
        console.log('Dropping old columns...');
        await connection.query(`
            ALTER TABLE welcomer_config
            DROP COLUMN enabled,
            DROP COLUMN channel_id,
            DROP COLUMN message,
            DROP COLUMN background_url
        `);

        console.log('✅ Migration successful!');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Columns already exist, skipping migration.');
        } else {
            console.error('❌ Migration failed:', e);
        }
    } finally {
        connection.release();
        await pool.end();
        process.exit(0);
    }
}

run();
