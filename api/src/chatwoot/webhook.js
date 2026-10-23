import { log } from '../lib/log.js';
import { Ticket } from '../models/Ticket.js';
import * as hub from '../realtime/hub.js';
import { applyConversationState, findTicket, recordOutgoing } from '../tickets/service.js';

// E20: inbox webhook events (§5.2)
export async function handleInboxEvent(p) {
  switch (p.event) {
    case 'message_created': {
      if (p.private) return;                        // internal notes never reach the customer (REQ-029)
      if (p.message_type !== 'outgoing') return;    // incoming = our own echoes; activity/template ignored
      const t = await findTicket(p.conversation);
      if (!t) return log.warn({ evt: 'unknown_conversation', conversationId: p.conversation?.id });
      await recordOutgoing(t, p);
      return;
    }
    case 'conversation_status_changed':
    case 'conversation_updated': {
      const t = await findTicket(p);               // payload is the conversation itself
      if (t) await applyConversationState(t, p, 'webhook');
      return;
    }
    case 'conversation_typing_on':
    case 'conversation_typing_off': {
      // agents only; typing a private note never reaches the customer (REQ-029)
      if (p.is_private === true || p.is_private === 'true' || p.user?.type !== 'user') return;
      const t = await Ticket.findOne({ 'chatwoot.conversationId': p.conversation?.id }, 'number customerId').lean();
      if (t) hub.emit(t.customerId, 'typing', { ticketNumber: t.number, on: p.event === 'conversation_typing_on', name: p.user.name ?? '' });
      return;
    }
    default:
  }
}
