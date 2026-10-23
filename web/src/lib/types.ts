// DTOs — mirror lld-backend §4.2 exactly (lld-frontend §8).
export type Status = 'ai_handling' | 'in_progress' | 'waiting_on_customer' | 'resolved';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'Account' | 'Billing' | 'Technical' | 'Commerce & Trade' | 'Compliance & GST' | 'Logistics & Orders' | 'General';
export type Trigger = 'fraud' | 'security' | 'legal' | 'angry_customer' | 'payment_dispute' | 'account_takeover' | 'repeated_issue' | 'critical_incident';
export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'met';
export type Locale = 'en' | 'hi';
export interface NotifyPrefs { email: { reply: boolean; status: boolean; sla: boolean }; inApp: boolean }
/** ProfileDTO; `locale`/`notify` are absent on the register response (refetch me). */
export interface User { id: string; name: string; email: string; createdAt: string; locale?: Locale; notify?: NotifyPrefs; phone?: string | null; organization?: string | null }
export interface Attachment { id: string; name: string; size: number; mime: string; url: string }
export interface Sla { responseDueAt: string; resolutionDueAt: string; firstResponseAt: string | null;
  resolvedAt: string | null; activeDueAt: string | null; state: SlaState }
export interface TicketSummary { number: string; subject: string; status: Status; priority: Priority; category: Category;
  createdAt: string; updatedAt: string; lastMessageAt: string; sla: Sla; aiTier: 'auto' | 'draft' | 'human' | null;
  delivery: 'synced' | 'queued' | 'delayed'; channel?: 'portal' | 'whatsapp' }
export interface StatusEvent { status: Status; at: string; by: 'customer' | 'agent' | 'ai' | 'system' }
export interface TicketActions { canAccept: boolean; canRequestHuman: boolean; canResolve: boolean; canRate: boolean }
export interface TicketDetail extends TicketSummary { description: string; customerCategory: Category | null;
  resolutionType: 'ai' | 'human' | null; csat: { rating: number; comment: string; submittedAt: string } | null;
  statusHistory: StatusEvent[]; ai: { confidence: number | null; triggers: Trigger[] }; actions: TicketActions }
export interface Source { slug: string; title: string }
export interface Message { id: string; ticketNumber: string; author: 'customer' | 'agent' | 'ai' | 'system'; authorName: string;
  body: string; sources: Source[]; createdAt: string; clientMessageId: string | null; deliveryState: 'sent' | 'pending'; attachments?: Attachment[] }
/** View model: adds client-only failure state for optimistic sends */
export type UiMessage = Message & { localState?: 'failed' };
export interface KbArticleSummary { slug: string; title: string; category: Category; excerpt: string; updatedAt: string }
/** myVote: true = helpful, false = not, null = no vote / signed out. */
export interface KbVotes { helpfulCount: number; notHelpfulCount: number; myVote: boolean | null }
export interface KbArticle extends KbArticleSummary, Partial<KbVotes> { body: string; locale?: Locale; views?: number }
export interface Typing { ticketNumber: string; on: boolean; name: string }
export interface Suggestion { answer: string | null; confidence: number | null; sources: Source[]; articles: KbArticleSummary[] }
export interface Page<T> { items: T[]; nextCursor: string | null }
export interface ApiErrorBody { error: { code: ErrorCode; message: string; details?: { path: string; message: string }[] | Record<string, unknown> } }
export type ErrorCode = 'VALIDATION_FAILED' | 'WRONG_PASSWORD' | 'UNAUTHENTICATED' | 'INVALID_CREDENTIALS' | 'FORBIDDEN_ORIGIN' | 'NOT_FOUND'
  | 'EMAIL_TAKEN' | 'INVALID_STATE' | 'ALREADY_RATED' | 'UNSUPPORTED_MEDIA_TYPE' | 'RATE_LIMITED' | 'INTERNAL'
  | 'INVALID_ATTACHMENT' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE_TYPE' | 'AI_UNAVAILABLE'
  | 'OTP_INVALID' | 'OTP_EXPIRED' | 'OTP_SEND_FAILED' | 'SMS_UNAVAILABLE' | 'ACCOUNT_NOT_FOUND' | 'WHATSAPP_TICKET';
export type LiveEvent = { type: 'message.created'; ticketNumber: string; message: Message }
  | { type: 'ticket.updated'; ticket: TicketDetail };

export const CATEGORIES: Category[] = ['Account', 'Billing', 'Technical', 'Commerce & Trade', 'Compliance & GST', 'Logistics & Orders', 'General'];
export type Scope = 'open' | 'resolved' | 'all';
export const STATUSES: Status[] = ['ai_handling', 'in_progress', 'waiting_on_customer', 'resolved'];
export const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low'];
export type TicketSort = 'updated' | 'created' | 'priority' | 'sla';
export interface TicketFilters { q?: string; status?: Status[]; category?: Category[]; priority?: Priority[]; from?: string; to?: string; sort?: TicketSort }

export interface Overview {
  counts: { open: number; aiHandling: number; waitingOnYou: number; resolved30d: number };
  avgFirstResponseMin: number | null; avgResolutionHrs: number | null; csatAvg: number | null;
  slaWatch: { number: string; dueAt: string; state: 'at_risk' | 'breached' }[];
  activity: { type: 'agent_reply' | 'status' | 'ai_answer' | 'csat'; ticket: string; at: string; text: string }[];
  popularArticles: { slug: string; title: string; views: number }[];
}
export interface Notification { id: string; type: 'agent_reply' | 'status' | 'sla_breach' | 'ai_answer'; ticketNumber: string;
  title: string; body: string; readAt: string | null; createdAt: string }
export interface NotificationPage { items: Notification[]; unreadCount: number; nextCursor: string | null }
