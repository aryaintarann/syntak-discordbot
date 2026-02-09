import { NextResponse } from 'next/server';
import pool from '../../../../../../src/database/database.js';
import FeatureManager from '../../../../../../src/utils/featureManager.js';

// Define interface for config structure
interface GuildConfig {
    features: {
        logging?: {
            modLog?: { enabled: boolean; channelId: string | null };
            messageLog?: { enabled: boolean; channelId: string | null };
            joinLeaveLog?: { enabled: boolean; channelId: string | null };
            voiceLog?: { enabled: boolean; channelId: string | null };
            roleLog?: { enabled: boolean; channelId: string | null };
            [key: string]: any;
        };
        [key: string]: any;
    };
    [key: string]: any;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Get current config
        const config = await FeatureManager.getGuildConfig(id) as GuildConfig;

        // Return logging config
        return NextResponse.json(config.features.logging || {});
    } catch (error: any) {
        console.error('Error fetching logging config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json(); // Expected: { modLog: { enabled, channelId }, ... }

        // Get current config to merge
        const currentConfig = await FeatureManager.getGuildConfig(id) as GuildConfig;

        // Initialize logging config if missing
        if (!currentConfig.features.logging) {
            currentConfig.features.logging = {};
        }

        // Merge updates
        currentConfig.features.logging = {
            ...currentConfig.features.logging,
            ...body
        };

        // Save back to database
        await pool.query(
            `INSERT INTO guild_config (guild_id, config_data) VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE config_data = ?`,
            [id, JSON.stringify(currentConfig), JSON.stringify(currentConfig)]
        );

        return NextResponse.json({ success: true, logging: currentConfig.features.logging });

    } catch (error: any) {
        console.error('Error saving logging config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
