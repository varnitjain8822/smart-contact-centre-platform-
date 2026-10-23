const STATUS = { pending: 'ai_handling', open: 'in_progress', snoozed: 'waiting_on_customer', resolved: 'resolved' };
export const mapStatus = (s) => STATUS[s] ?? null;
export const priorityFromCw = { low: 'low', medium: 'medium', high: 'high', urgent: 'critical' };
export const priorityToCw = { low: 'low', medium: 'medium', high: 'high', critical: 'urgent' };
