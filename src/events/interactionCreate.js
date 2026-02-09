import { Events } from 'discord.js';
import FeatureManager from '../utils/featureManager.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);

                const errorMessage = {
                    content: '❌ Terjadi kesalahan saat menjalankan command ini!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Handle Buttons
        else if (interaction.isButton()) {
            if (interaction.customId === 'verify_user') {
                try {
                    const config = await FeatureManager.getFeatureConfig(interaction.guildId, 'security', 'verification');

                    if (!config?.enabled || !config?.roleId) {
                        return interaction.reply({ content: '❌ Verification system is not correctly configured.', ephemeral: true });
                    }

                    const role = interaction.guild.roles.cache.get(config.roleId);
                    if (!role) {
                        return interaction.reply({ content: '❌ Verified role not found. Please contact admin.', ephemeral: true });
                    }

                    if (interaction.member.roles.cache.has(role.id)) {
                        return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
                    }

                    await interaction.member.roles.add(role);
                    await interaction.reply({ content: '✅ Verification successful! You now have access.', ephemeral: true });

                } catch (error) {
                    console.error('Error in verification button:', error);
                    await interaction.reply({ content: '❌ Verification failed. Please try again later.', ephemeral: true });
                }
            }
        }
    }
};
