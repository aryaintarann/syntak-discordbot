import { createCanvas, loadImage } from '@napi-rs/canvas';

export async function generateWelcomeImage(member, config, type = 'welcome') {
    const width = 800;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    let bgLoaded = false;
    if (config.background_url) {
        try {
            const bg = await loadImage(config.background_url);
            // Maintain aspect ratio or cover?
            // "cover" logic:
            const hRatio = canvas.width / bg.width;
            const vRatio = canvas.height / bg.height;
            const ratio = Math.max(hRatio, vRatio);
            const centerShift_x = (canvas.width - bg.width * ratio) / 2;
            const centerShift_y = (canvas.height - bg.height * ratio) / 2;

            ctx.drawImage(bg, 0, 0, bg.width, bg.height, centerShift_x, centerShift_y, bg.width * ratio, bg.height * ratio);
            bgLoaded = true;
        } catch (e) {
            console.error('Failed to load background image:', e);
        }
    }

    if (!bgLoaded) {
        // Gradient background
        const grd = ctx.createLinearGradient(0, 0, width, height);
        grd.addColorStop(0, '#1a2a6c');
        grd.addColorStop(0.5, '#b21f1f');
        grd.addColorStop(1, '#fdbb2d');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
    }

    // Dim background slightly
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Avatar
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
    try {
        const avatar = await loadImage(avatarURL);

        // Circle Clip for Avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(150, 150, 100, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 50, 50, 200, 200);
        ctx.restore();

        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(150, 150, 100, 0, Math.PI * 2);
        ctx.stroke();
    } catch (e) {
        console.error('Failed to load avatar:', e);
    }

    // Text
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 60px Sans';
    const title = type === 'welcome' ? 'WELCOME' : 'GOODBYE';
    ctx.fillText(title, 300, 140);

    ctx.font = '40px Sans';
    let username = member.user.username;
    if (username.length > 15) username = username.substring(0, 15) + '...';
    ctx.fillText(username, 300, 210);

    // Server Name
    ctx.font = '24px Sans';
    ctx.fillStyle = '#DDDDDD';
    ctx.fillText(`to ${member.guild.name}`, 300, 250);

    return canvas.toBuffer('image/png');
}
