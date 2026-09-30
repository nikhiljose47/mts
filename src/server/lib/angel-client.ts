import { createHmac } from 'node:crypto';

const ANGEL_BASE = 'https://apiconnect.angelbroking.com';

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-UserType': 'USER',
  'X-SourceID': 'WEB',
  'X-ClientLocalIP': '192.168.1.1',
  'X-ClientPublicIP': '106.193.147.98',
  'X-MACAddress': 'fe80::1',
};

interface Session {
  jwt: string;
  expiresAt: number;
}

let session: Session | null = null;

/* ── TOTP (RFC 6238) using Node built-in crypto ─────────────────── */

function base32Decode(input: string): Buffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const ch of input.replace(/=+$/, '').toUpperCase()) {
    const idx = chars.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTOTP(secret: string): string {
  const key = base32Decode(secret);
  const step = Math.floor(Date.now() / 1000 / 30);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
  counter.writeUInt32BE(step >>> 0, 4);

  const hash = createHmac('sha1', key).update(counter).digest();
  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, '0');
}

/* ── Session management ─────────────────────────────────────────── */

/** Returns a valid JWT, re-authenticating if the cached one is expired. */
export async function getJwt(): Promise<string> {
  if (session && Date.now() < session.expiresAt) return session.jwt;

  const totp = generateTOTP(process.env['ANGEL_TOTP_SECRET'] ?? '');

  const res = await fetch(
    `${ANGEL_BASE}/rest/auth/angelbroking/user/v1/loginByPassword`,
    {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'X-PrivateKey': process.env['ANGEL_API_KEY'] ?? '' },
      body: JSON.stringify({
        clientcode: process.env['ANGEL_CLIENT_ID'],
        password: process.env['ANGEL_PIN'],
        totp,
      }),
    },
  );

  const body = (await res.json()) as {
    status: boolean;
    message: string;
    data: { jwtToken: string };
  };
  if (!body.status) throw new Error(`AngelOne auth failed: ${body.message}`);

  /* Tokens expire at 24 h; refresh at 23 h to avoid expiry mid-request */
  session = { jwt: body.data.jwtToken, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return session.jwt;
}

/** POST to an authenticated AngelOne endpoint. */
export async function angelPost<T>(path: string, body: unknown): Promise<T> {
  const jwt = await getJwt();
  const res = await fetch(`${ANGEL_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...BASE_HEADERS,
      Authorization: `Bearer ${jwt}`,
      'X-PrivateKey': process.env['ANGEL_API_KEY'] ?? '',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json() as { status?: boolean; message?: string; errorcode?: string };
  if (json.status === false) {
    throw new Error(`AngelOne error (${json.errorcode ?? res.status}): ${json.message}`);
  }
  return json as T;
}
