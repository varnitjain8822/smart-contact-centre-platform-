import { cfg } from '../config.js';
import { ChatwootError } from '../lib/errors.js';

/** @typedef {'admin'|'bot'} As */
async function cw(path, { method = 'GET', body, as = 'admin' } = {}) {
  const res = await fetch(`${cfg.CHATWOOT_URL}/api/v1/accounts/${cfg.CHATWOOT_ACCOUNT_ID}${path}`, {
    method, signal: AbortSignal.timeout(cfg.CHATWOOT_TIMEOUT_MS),
    headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),   // fetch sets the multipart boundary
      api_access_token: as === 'bot' ? cfg.CHATWOOT_BOT_TOKEN : cfg.CHATWOOT_ADMIN_TOKEN },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new ChatwootError(res.status, path, text.slice(0, 500));
  return text ? JSON.parse(text) : null;
}

export const createContact = async ({ name, email, identifier }) => {
  const r = await cw('/contacts', { method: 'POST', body: { inbox_id: cfg.CHATWOOT_INBOX_ID, name, email, identifier } });
  return { contactId: r.payload.contact.id, sourceId: r.payload.contact_inbox.source_id };
};
export const findContactByIdentifier = async (identifier) => {          // fallback on 422
  const r = await cw(`/contacts/search?q=${encodeURIComponent(identifier)}&include_contact_inboxes=true`);
  const c = r.payload.find((x) => x.identifier === identifier); if (!c) return null;
  const ci = c.contact_inboxes?.find((x) => x.inbox?.id === Number(cfg.CHATWOOT_INBOX_ID));
  if (ci) return { contactId: c.id, sourceId: ci.source_id };
  const created = await cw(`/contacts/${c.id}/contact_inboxes`, { method: 'POST', body: { inbox_id: cfg.CHATWOOT_INBOX_ID } });
  return { contactId: c.id, sourceId: created.source_id };
};
// PUT merges additional_attributes server-side (ContactsController#contact_additional_attributes)
export const updateContact = (contactId, body) => cw(`/contacts/${contactId}`, { method: 'PUT', body });
export const createConversation = ({ sourceId, contactId, ticketNumber, slaDueAt, content }) =>
  cw('/conversations', { method: 'POST', body: { source_id: sourceId, inbox_id: cfg.CHATWOOT_INBOX_ID, contact_id: contactId,
    custom_attributes: { ticket_number: ticketNumber, sla_due_at: slaDueAt },
    message: { content, message_type: 'incoming' } } });            // → {id, status:'pending', …}
export const findConversationByTicket = (contactId, ticketNumber) =>   // retry dedupe for createConversation
  cw(`/contacts/${contactId}/conversations`).then((r) => r.payload.find((c) => c.custom_attributes?.ticket_number === ticketNumber) ?? null);
// attachments: [{name, mime, buffer}] → multipart with `attachments[]` (Chatwoot MessageBuilder#process_attachments)
export const createMessage = (convId, { content, messageType = 'outgoing', isPrivate = false, sourceId, attachments }, as = 'admin') => {
  if (!attachments?.length) {
    return cw(`/conversations/${convId}/messages`, { method: 'POST', as, body: { content, message_type: messageType, private: isPrivate, source_id: sourceId } });
  }
  const form = new FormData();
  if (content) form.append('content', content);
  form.append('message_type', messageType);
  form.append('private', String(isPrivate));
  if (sourceId) form.append('source_id', sourceId);
  for (const a of attachments) form.append('attachments[]', new Blob([a.buffer], { type: a.mime }), a.name);
  return cw(`/conversations/${convId}/messages`, { method: 'POST', as, body: form });
};
export const toggleStatus = (convId, status, as = 'admin') =>
  cw(`/conversations/${convId}/toggle_status`, { method: 'POST', as, body: { status } });   // open|resolved|pending|snoozed
export const togglePriority = (convId, priority) =>          // low|medium|high|urgent
  cw(`/conversations/${convId}/toggle_priority`, { method: 'POST', as: 'bot', body: { priority } });
export const setLabels = (convId, labels) =>                  // REPLACES the list — callers pass the merged set
  cw(`/conversations/${convId}/labels`, { method: 'POST', as: 'bot', body: { labels } }).then((r) => r.payload);
export const setCustomAttributes = (convId, attrs, as = 'bot') =>   // merge:true keeps other keys
  cw(`/conversations/${convId}/custom_attributes`, { method: 'POST', as, body: { custom_attributes: attrs, merge: true } });
export const getConversation = (convId) => cw(`/conversations/${convId}`);
// message_type is INTEGER here (0 in, 1 out, 2 activity, 3 template); created_at epoch s
export const listMessages = (convId) => cw(`/conversations/${convId}/messages`).then((r) => r.payload);

/**
 * Download an agent attachment. Only Active Storage paths are accepted and they are always fetched from CHATWOOT_URL
 * (the internal network), whatever host the webhook's data_url names: no SSRF to arbitrary hosts. Max `maxBytes`.
 */
export async function downloadAttachment(dataUrl, maxBytes) {
  const u = new URL(dataUrl);
  if (!u.pathname.startsWith('/rails/active_storage/')) throw new Error('unexpected_attachment_url');
  const res = await fetch(new URL(u.pathname + u.search, cfg.CHATWOOT_URL), { signal: AbortSignal.timeout(cfg.CHATWOOT_TIMEOUT_MS * 3) });
  if (!res.ok) throw new ChatwootError(res.status, u.pathname, '');
  if (Number(res.headers.get('content-length')) > maxBytes) throw new Error('attachment_too_large');
  const chunks = []; let n = 0;
  for await (const c of res.body) {
    n += c.length;
    if (n > maxBytes) throw new Error('attachment_too_large');
    chunks.push(c);
  }
  return { buffer: Buffer.concat(chunks), contentType: res.headers.get('content-type') ?? '' };
}

// healthz probe: any HTTP answer from Chatwoot counts as up
export const ping = () => fetch(`${cfg.CHATWOOT_URL}/api`, { signal: AbortSignal.timeout(3000) }).then(() => true, () => false);
