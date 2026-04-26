/**
 * Troy Bot - Session ID Generator
 * 
 * Run this ONCE to generate your SESSION_ID:
 *   node get-session.js
 * 
 * Scan the QR code with WhatsApp, then copy the TroyBot!... string printed.
 * Paste it as SESSION_ID in your hosting platform (Heroku, Koyeb, etc.)
 */

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pino = require('pino');

const SESSION_FOLDER = './session-generator-temp';

async function generateSession() {
  console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮');
  console.log('┃   TROY BOT SESSION GENERATOR   ┃');
  console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n');
  console.log('📱 Starting... A QR code will appear below.');
  console.log('👉 Open WhatsApp → Linked Devices → Link a Device → Scan QR\n');

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      qrcode.generate(qr, { small: true });
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⏳ Waiting for you to scan...\n');
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp connected! Generating your Session ID...\n');

      // Wait a moment for creds to fully save
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        const credsFile = path.join(SESSION_FOLDER, 'creds.json');

        if (!fs.existsSync(credsFile)) {
          console.error('❌ creds.json not found. Please try again.');
          process.exit(1);
        }

        const credsData = fs.readFileSync(credsFile);
        const compressed = zlib.gzipSync(credsData);
        const b64 = compressed.toString('base64');
        const sessionID = `TroyBot!${b64}`;

        console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
        console.log('┃        YOUR SESSION ID BELOW        ┃');
        console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n');
        console.log(sessionID);
        console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
        console.log('┃  Copy the full string above (TroyBot!...)  ┃');
        console.log('┃  Paste it as SESSION_ID on your host        ┃');
        console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n');

        // Save to a file too for easy access
        fs.writeFileSync('my-session-id.txt', sessionID);
        console.log('✅ Also saved to: my-session-id.txt\n');

      } catch (err) {
        console.error('❌ Error generating session ID:', err.message);
      }

      // Cleanup temp session folder
      fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
      process.exit(0);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. Please try again.');
        fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
        process.exit(1);
      } else {
        console.log('⚠️ Connection closed, retrying...');
        generateSession();
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

generateSession();
