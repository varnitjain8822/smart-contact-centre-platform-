import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpForm } from '../src/features/auth/OtpForm';
import { ChannelBadge } from '../src/features/tickets/ChannelBadge';
import { routeFetch, wrap } from './helpers';

const user = { id: 'u1', name: 'Priya', email: 'p@x.co', createdAt: '', locale: 'en' };
const sent = { status: 202, body: { sent: true, expiresInS: 600, resendInS: 30 } };

describe('OtpForm', () => {
  it('login: email → code (one-time-code autofill, resend timer) → wrong code → right code → done', async () => {
    let verifies = 0;
    const calls = routeFetch({
      'GET /api/auth/otp': { body: { email: true, sms: false } },
      'POST /api/auth/otp/request': sent,
      'POST /api/auth/otp/verify': () => (++verifies === 1
        ? { status: 400, body: { error: { code: 'OTP_INVALID', message: 'x', details: { attemptsLeft: 4 } } } }
        : { body: { user, created: false } }),
    });
    const done = vi.fn();
    render(<OtpForm mode="login" onDone={done} />, { wrapper: wrap() });
    expect(screen.queryByRole('button', { name: 'Use phone number instead' })).toBeNull();   // SMS off
    await userEvent.type(screen.getByLabelText('Email'), 'p@x.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('We sent a 6-digit code to p@x.co. It expires in 10 minutes.')).toBeTruthy();
    const code = screen.getByLabelText('Code');
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
    expect((screen.getByRole('button', { name: /Resend code in \d+ s/ }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(code, '12a3456');
    expect((code as HTMLInputElement).value).toBe('123456');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'That code is not right. 4 tries left.');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const body = JSON.parse(String(calls.filter((c) => c.url.endsWith('/verify')).at(-1)!.init.body));
    expect(body).toEqual({ email: 'p@x.co', code: '123456', locale: 'en', remember: false });
  });

  it('unknown email on login → asks for a name and creates the account with the same code', async () => {
    let n = 0;
    const calls = routeFetch({
      'GET /api/auth/otp': { body: { email: true, sms: true } },
      'POST /api/auth/otp/request': sent,
      'POST /api/auth/otp/verify': () => (++n === 1 ? { status: 404, body: { error: { code: 'ACCOUNT_NOT_FOUND', message: 'x' } } } : { status: 201, body: { user, created: true } }),
    });
    const done = vi.fn();
    render(<OtpForm mode="login" onDone={done} />, { wrapper: wrap() });
    expect(await screen.findByRole('button', { name: 'Use phone number instead' })).toBeTruthy();   // SMS on
    await userEvent.type(screen.getByLabelText('Email'), 'new@x.co');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await userEvent.type(await screen.findByLabelText('Code'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('No account uses this email yet. Add your name to create one.')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('Your name'), 'New Person');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(JSON.parse(String(calls.at(-1)!.init.body))).toMatchObject({ email: 'new@x.co', code: '654321', name: 'New Person' });
  });

  it('register mode validates name + email before sending', async () => {
    const calls = routeFetch({ 'GET /api/auth/otp': { body: { email: true, sms: false } } });
    render(<OtpForm mode="register" onDone={() => {}} />, { wrapper: wrap() });
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    expect(screen.getByLabelText('Your name').getAttribute('aria-invalid')).toBe('true');
    expect(calls.some((c) => c.url.includes('/request'))).toBe(false);
  });
});

it('ChannelBadge: WhatsApp only', () => {
  const { container, rerender } = render(<ChannelBadge channel="whatsapp" />);
  expect(container.textContent).toBe('WhatsApp');
  rerender(<ChannelBadge channel="portal" />);
  expect(container.textContent).toBe('');
});
