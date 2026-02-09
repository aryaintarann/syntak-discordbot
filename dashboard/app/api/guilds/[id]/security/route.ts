import { NextResponse } from 'next/server';
import pool from '../../../../../../src/database/database.js';
import FeatureManager from '../../../../../../src/utils/featureManager.js';

// Define interface for config structure
interface GuildConfig {
    features: {
        security?: {
            accountAge?: { enabled: boolean; minDays: number; action: 'kick' | 'ban' | 'warn' };
            verification?: { enabled: boolean; type: 'button'; channelId: string | null; roleId: string | null };
            altDetection?: { enabled: boolean };
            phishingDetection?: { enabled: boolean };
            autoRaidBan?: { enabled: boolean };
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

        // Return security config
        return NextResponse.json(config.features.security || {});
    } catch (error: any) {
        console.error('Error fetching security config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Get current config to merge
        const currentConfig = await FeatureManager.getGuildConfig(id) as GuildConfig;

        // Initialize security config if missing
        if (!currentConfig.features.security) {
            currentConfig.features.security = {};
        }

        // Merge updates
        currentConfig.features.security = {
            ...currentConfig.features.security,
            ...body
        };

        // Save back to database
        await pool.query(
            `INSERT INTO guild_config (guild_id, config_data) VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE config_data = ?`,
            [id, JSON.stringify(currentConfig), JSON.stringify(currentConfig)]
        );

        return NextResponse.json({ success: true, security: currentConfig.features.security });

    } catch (error: any) {
        console.error('Error saving security config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
