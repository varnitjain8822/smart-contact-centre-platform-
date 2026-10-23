import { afterEach, expect, test, vi } from 'vitest';
import { configured, sendOtp } from '../../src/notifications/sms.js';

const MSG91 = { SMS_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'auth-key', MSG91_TEMPLATE_ID: 'tpl-1' };
const TWILIO = { SMS_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'tok', TWILIO_FROM: '+15550001111' };
afterEach(() => vi.unstubAllGlobals());
const mockFetch = (status = 200) => { const f = vi.fn(async () => new Response('{}', { status })); vi.stubGlobal('fetch', f); return f; };

test('configured only with a provider and all of its keys', () => {
  expect(configured({})).toBe(false);
  expect(configured(MSG91)).toBe(true);
  expect(configured({ ...MSG91, MSG91_TEMPLATE_ID: undefined })).toBe(false);
  expect(configured(TWILIO)).toBe(true);
  expect(configured({ ...TWILIO, TWILIO_FROM: undefined })).toBe(false);
});

test('msg91: flow API with authkey header, template id, number without +, code as otp variable', async () => {
  const f = mockFetch();
  await sendOtp('+919876543210', '123456', 'ignored', MSG91);
  const [url, init] = f.mock.calls[0];
  expect(url).toBe('https://control.msg91.com/api/v5/flow');
  expect(init.headers.authkey).toBe('auth-key');
  expect(JSON.parse(init.body)).toEqual({ template_id: 'tpl-1', short_url: '0', recipients: [{ mobiles: '919876543210', otp: '123456' }] });
});

test('twilio: Messages.json with basic auth and form body', async () => {
  const f = mockFetch(201);
  await sendOtp('+919876543210', '123456', '123456 is your code', TWILIO);
  const [url, init] = f.mock.calls[0];
  expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
  expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('AC123:tok').toString('base64')}`);
  expect(Object.fromEntries(init.body)).toEqual({ To: '+919876543210', From: '+15550001111', Body: '123456 is your code' });
});

test('non-2xx and unconfigured throw', async () => {
  mockFetch(401);
  await expect(sendOtp('+919876543210', '1', 't', TWILIO)).rejects.toThrow('sms_twilio_http_401');
  await expect(sendOtp('+919876543210', '1', 't', {})).rejects.toThrow('sms_not_configured');
});
