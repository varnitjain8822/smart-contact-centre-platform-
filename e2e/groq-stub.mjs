// Deterministic OpenAI-compatible stand-in for Groq (e2e only). No deps.
// JSON mode (bot/suggest; Hindi answer when the system prompt says 'Reply in Hindi'): 'refund' → draft tier; 'payment' → auto tier; anything else → human (low confidence).
// stream:true (assistant chat): SSE deltas; 'payment' → confident answer citing the payment article; else unsure (suggestTicket).
// Also a WhatsApp Cloud (Graph API) mock for Chatwoot sidekiq (WHATSAPP_CLOUD_BASE_URL=http://groq-stub:8080):
// GET /v*/… → credential/template checks pass; POST /v*/<phone_number_id>/messages → recorded; GET /wa/sent → the recorded sends.
import http from 'node:http';

export const WA_PHONE_NUMBER_ID = '1555000111';
const waSent = [];
function graph(req, res, body) {
  const json = (o) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(o));
  if (req.method === 'GET' && req.url === '/wa/sent') return json(waSent);
  if (req.method === 'GET' && /\/phone_numbers/.test(req.url)) return json({ data: [{ id: WA_PHONE_NUMBER_ID }] });
  if (req.method === 'GET') return json({ data: [], paging: {} });             // message_templates, health, …
  const m = req.url.match(/^\/v[\d.]+\/([^/]+)\/messages/);
  if (req.method === 'POST' && m) {
    let b = {}; try { b = JSON.parse(body); } catch {}
    waSent.push({ phoneNumberId: m[1], auth: req.headers.authorization ? 'bearer' : 'none', ...b });
    return json({ messaging_product: 'whatsapp', contacts: [{ input: b.to, wa_id: b.to }], messages: [{ id: `wamid.mock.${waSent.length}` }] });
  }
  res.writeHead(404).end();
}

export function reply(user, sys = '') {
  const hindi = sys.includes('Reply in Hindi');
  const slugs = [...user.matchAll(/\[slug: ([a-z0-9-]+)\]/g)].map((m) => m[1]);
  const msgs = (user.split('CUSTOMER_MESSAGES')[1] ?? user).toLowerCase();
  const pick = (s) => (slugs.includes(s) ? [s] : slugs.slice(0, 1));
  const base = { triggers: [], summary: 'Customer reports a billing issue.' };
  if (msgs.includes('refund'))
    return { ...base, intent: 'refund_status', category: 'Billing', priority: 'medium', confidence: 0.7, sources: pick('refund-status'),
      answer: 'Refunds are processed to the original payment method within 5-7 business days of approval.' };
  if (/payment|पेमेंट|भुगतान/.test(msgs))
    return { ...base, intent: 'payment_pending', category: 'Billing', priority: 'high', confidence: 0.95,
      sources: pick('payment-pending-subscription-not-active'),
      answer: hindi ? '1. बैंक की पुष्टि के लिए 30 मिनट रुकें।\n2. Billing पेज रिफ़्रेश करें।\n3. फिर भी प्लान चालू न हो, तो यहाँ ट्रांज़ैक्शन ID भेजें।'
        : '1. Wait 30 minutes for the bank confirmation.\n2. Refresh the Billing page.\n3. If the plan is still inactive, reply here with the transaction ID.' };
  return { ...base, intent: 'unknown', category: 'General', priority: 'low', confidence: 0.3, sources: [], answer: '' };
}

/**
 * v4 tool round (request carries `tools`): call the first tool with a required parameter, filled with the first ID-like token of the
 * last user message (AC-1001, TSO-26-104390 …); after a tool result, or without such a token: no call ("NONE").
 */
export function toolReply(messages, tools) {
  const none = { role: 'assistant', content: 'NONE' };
  if (messages.some((m) => m.role === 'tool')) return none;
  const last = messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';
  const id = last.match(/\b[A-Z]{2,}[A-Z0-9]*[-/]?\d[\w/-]*/)?.[0];
  const tool = tools.find((t) => t.function?.parameters?.required?.length);
  if (!id || !tool) return none;
  return { role: 'assistant', content: null, tool_calls: [{ id: 'call_stub_1', type: 'function',
    function: { name: tool.function.name, arguments: JSON.stringify({ [tool.function.parameters.required[0]]: id }) } }] };
}

/** Assistant (stream:true) reply text, ending with the <<META …>> line the api strips. */
export function streamReply(messages) {
  const sys = messages.find((m) => m.role === 'system')?.content ?? '';
  const slugs = [...sys.matchAll(/\[slug: ([a-z0-9-]+)\]/g)].map((m) => m[1]);
  const last = (messages.filter((m) => m.role === 'user').at(-1)?.content ?? '').toLowerCase();
  const hindi = sys.includes('Reply in Hindi');
  const status = sys.match(/"found":true[^\n]*?"status":"([^"]+)"/)?.[1];   // v4: RECORDS from a tool lookup
  if (status) return `Your record shows the status: ${status}.\n<<META {"sources":[],"confidence":0.9}>>`;
  if (/payment|पेमेंट|भुगतान/.test(last) && slugs.includes('payment-pending-subscription-not-active')) {
    const text = hindi
      ? '1. बैंक की पुष्टि के लिए 30 मिनट रुकें।\n2. Billing पेज रिफ़्रेश करें।\n3. फिर भी प्लान चालू न हो, तो टिकट बनाएँ।'
      : '1. Wait 30 minutes for the bank confirmation.\n2. Refresh the Billing page.\n3. If the plan is still inactive, raise a ticket.';
    return `${text}\n<<META {"sources":["payment-pending-subscription-not-active"],"confidence":0.9}>>`;
  }
  return `${hindi ? 'मुझे इस बारे में पक्की जानकारी नहीं है। कृपया टिकट बनाएँ, ताकि हमारी टीम मदद कर सके।' : "I'm not sure about this one. Please raise a ticket so our team can help."}\n<<META {"sources":[],"confidence":0.2}>>`;
}

function writeStream(res, text) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  const parts = text.match(/[\s\S]{1,12}/g) ?? [];   // small chunks, so the META marker is split across deltas
  for (const p of parts) res.write(`data: ${JSON.stringify({ id: 'stub', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: p } }] })}\n\n`);
  res.end('data: [DONE]\n\n');
}

const port = Number(process.env.PORT ?? 8080);
http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  if (req.method === 'POST' && req.url.endsWith('/audio/transcriptions')) {
    req.on('end', () => {
      const isHindi = body.includes('name="language"\r\n\r\nhi') || body.includes('language=hi');
      const text = isHindi ? 'मेरा एटीएम कार्ड खो गया है' : 'I lost my debit card';
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ text }));
    });
    return;
  }
  if (req.method !== 'POST' || !req.url.endsWith('/chat/completions')) { req.on('end', () => graph(req, res, body)); return; }
  req.on('end', () => {
    let user = '', sys = '', parsed = {};
    try { parsed = JSON.parse(body); user = parsed.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n'); sys = parsed.messages.find((m) => m.role === 'system')?.content ?? ''; } catch {}
    if (parsed.stream) { writeStream(res, streamReply(parsed.messages ?? [])); return; }
    if (parsed.tools) {
      const message = toolReply(parsed.messages ?? [], parsed.tools);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: 'stub', object: 'chat.completion', model: 'stub',
        choices: [{ index: 0, finish_reason: message.tool_calls ? 'tool_calls' : 'stop', message }] }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
      id: 'stub', object: 'chat.completion', model: 'stub',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(reply(user, sys)) } }] }));
  });
}).listen(port, () => console.log(`groq-stub on :${port}`));
