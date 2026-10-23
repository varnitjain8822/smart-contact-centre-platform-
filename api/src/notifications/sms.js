import { cfg } from '../config.js';

// SMS for sign-in codes. Off unless SMS_PROVIDER=msg91|twilio and that provider's keys are set (the web hides the phone option).
// `c` defaults to the app config; tests pass their own.
export function configured(c = cfg) {
  if (c.SMS_PROVIDER === 'msg91') return !!(c.MSG91_AUTH_KEY && c.MSG91_TEMPLATE_ID);
  if (c.SMS_PROVIDER === 'twilio') return !!(c.TWILIO_ACCOUNT_SID && c.TWILIO_AUTH_TOKEN && c.TWILIO_FROM);
  return false;
}

/** phone: E.164. msg91 sends its DLT-approved template with the code as ##otp##; twilio sends `text`. Throws on a non-2xx. */
export async function sendOtp(phone, code, text, c = cfg) {
  if (!configured(c)) throw new Error('sms_not_configured');
  let res;
  if (c.SMS_PROVIDER === 'msg91') {
    res = await fetch('https://control.msg91.com/api/v5/flow', { method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { authkey: c.MSG91_AUTH_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ template_id: c.MSG91_TEMPLATE_ID, short_url: '0', recipients: [{ mobiles: phone.replace(/^\+/, ''), otp: code }] }) });
  } else {
    res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Basic ${Buffer.from(`${c.TWILIO_ACCOUNT_SID}:${c.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, From: c.TWILIO_FROM, Body: text }) });
  }
  if (!res.ok) throw new Error(`sms_${c.SMS_PROVIDER}_http_${res.status}`);
}
