/**
 * Cloudflare Worker — Discord Interaction Endpoint
 *
 * 環境變數（在 Cloudflare Dashboard 設定）：
 *   DISCORD_PUBLIC_KEY    — Discord App 的 Public Key
 *   DISCORD_APPLICATION_ID — Discord App 的 Application ID
 *   GAS_URL               — GAS Web App 部署後的 URL
 */

export default {
    async fetch(request, env, ctx) {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        const signature = request.headers.get('X-Signature-Ed25519');
        const timestamp = request.headers.get('X-Signature-Timestamp');
        const body = await request.text();

        // ── 1. 驗證 Discord 簽名 ───────────────────────────────
        const isValid = await verifyDiscordSignature(
            env.DISCORD_PUBLIC_KEY,
            signature,
            timestamp,
            body,
        );
        if (!isValid) {
            return new Response('Unauthorized', { status: 401 });
        }

        const interaction = JSON.parse(body);

        // ── 2. 回應 PING（type 1）用於端點驗證 ─────────────────
        if (interaction.type === 1) {
            return new Response(JSON.stringify({ type: 1 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // ── 3. Slash Command（type 2）─────────────────────────
        if (interaction.type === 2) {
            // 立刻回覆「思考中⋯」給 Discord，避免 3 秒逾時
            // 背景非同步呼叫 GAS，完成後透過 webhook 發送結果
            ctx.waitUntil(processAndFollowUp(interaction, body, env));

            return new Response(JSON.stringify({ type: 5 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ type: 1 }), {
            headers: { 'Content-Type': 'application/json' },
        });
    },
};

// ── 非同步處理：呼叫 GAS 後回報結果 ────────────────────────

async function processAndFollowUp(interaction, body, env) {
    const followUpUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}`;

    let content = '❌ 發生未知錯誤';

    try {
        const gasResponse = await fetch(env.GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });

        const gasData = await gasResponse.json();
        content = gasData?.data?.content ?? '✅ 完成';
    } catch (err) {
        content = `❌ GAS 連線失敗: ${err.message}`;
    }

    // 發送結果到 Discord
    await fetch(followUpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    });
}

// ── Ed25519 驗證 ────────────────────────────────────────────

async function verifyDiscordSignature(publicKey, signature, timestamp, body) {
    try {
        const key = await crypto.subtle.importKey(
            'raw',
            hexToBytes(publicKey),
            { name: 'Ed25519', namedCurve: 'Ed25519' },
            false,
            ['verify'],
        );

        const message = new TextEncoder().encode(timestamp + body);
        const sig = hexToBytes(signature);

        return await crypto.subtle.verify({ name: 'Ed25519' }, key, sig, message);
    } catch (e) {
        console.error('Signature verification error:', e);
        return false;
    }
}

function hexToBytes(hex) {
    const pairs = hex.match(/.{1,2}/g) || [];
    return new Uint8Array(pairs.map(byte => parseInt(byte, 16)));
}
