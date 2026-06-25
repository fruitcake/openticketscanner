// Tiny zero-dependency mock ticket-validation server for local testing.
//
//   node scripts/mock-server.mjs        # http://localhost:8787/validate
//
// Decides the result from the scanned `code`:
//   - code containing "used"    -> yellow (already scanned)
//   - code containing "invalid" -> red    (rejected)
//   - anything else             -> green  (valid)
// To test from a phone, point your config's API URL at http://<your-LAN-IP>:8787/validate
import { createServer } from 'node:http';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const server = createServer((req, res) => {
  if (req.method !== 'POST' || !req.url?.startsWith('/validate')) {
    res.writeHead(404).end('Not found');
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    let code = '';
    try {
      code = String(JSON.parse(body || '{}').code ?? '');
    } catch {
      // ignore parse errors; treat as empty code
    }

    const lower = code.toLowerCase();
    let payload;
    if (lower.includes('used')) {
      payload = {
        status: 'used',
        message: 'Already scanned at the main gate',
        ticket: { name: 'Grace Hopper', type: 'General', gate: 'A' },
      };
    } else if (lower.includes('invalid')) {
      payload = {
        status: 'invalid',
        message: 'Ticket not recognised',
        ticket: {},
      };
    } else {
      payload = {
        status: 'valid',
        message: 'Valid – VIP entry',
        ticket: { name: 'Ada Lovelace', type: 'VIP', gate: 'A', seat: '12' },
      };
    }

    console.log(`[mock] ${code || '(empty)'} -> ${payload.status}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
});

server.listen(PORT, () => {
  console.log(`Mock ticket server listening on http://localhost:${PORT}/validate`);
  console.log('Scan codes containing "used" or "invalid" to see yellow/red; anything else is green.');
});
