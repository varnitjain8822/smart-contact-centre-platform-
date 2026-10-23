import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dialog } from '../src/ui/Dialog';
import { SegmentedControl } from '../src/ui/SegmentedControl';
import { Field } from '../src/ui/Field';
import { AuthForm } from '../src/features/auth/AuthForm';
import { TicketActions } from '../src/features/tickets/TicketActions';
import { CsatCard } from '../src/features/tickets/CsatCard';
import { Thread } from '../src/features/tickets/Thread';
import { StatusPill } from '../src/features/tickets/StatusPill';
import { Composer } from '../src/features/tickets/Composer';
import { SuggestionPanel } from '../src/features/tickets/SuggestionPanel';
import { ApiError } from '../src/lib/api';
import { mockFetch, msg, wrap } from './helpers';
import { NAV } from '../src/features/shell/SideNav';
import i18n from '../src/i18n';

it('bottom-tab visible text is part of its accessible name (WCAG 2.5.3), in every language', () => {
  for (const lng of ['en', 'hi'])
    for (const n of NAV) expect(i18n.t(n.label, { lng }).toLowerCase()).toContain(i18n.t(n.short, { lng }).toLowerCase());
});

describe('ui primitives', () => {
  it('Dialog uses showModal and returns focus to the opener', async () => {
    const spy = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    function T() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>open</button>
        <Dialog open={open} title="Sure?" onClose={() => setOpen(false)}><button onClick={() => setOpen(false)}>no</button></Dialog></>;
    }
    render(<T />);
    const opener = screen.getByText('open');
    opener.focus();
    await userEvent.click(opener);
    expect(spy).toHaveBeenCalled();
    await userEvent.click(screen.getByText('no'));
    expect(document.activeElement).toBe(opener);
  });

  it('SegmentedControl is a radio group with a legend', async () => {
    const on = vi.fn();
    render(<SegmentedControl name="s" legend="Show tickets" value="open" onChange={on}
      options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }]} />);
    expect(screen.getByRole('group', { name: 'Show tickets' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await userEvent.click(screen.getByLabelText('All'));
    expect(on).toHaveBeenCalledWith('all');
  });

  it('Field wires aria-describedby / aria-invalid', () => {
    render(<Field label="Email" error="Enter a valid email">{(p) => <input {...p} />}</Field>);
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('Enter a valid email');
  });
});

describe('AuthForm', () => {
  it('maps server details[] to fields and EMAIL_TAKEN to email', async () => {
    const submit = vi.fn();
    const { rerender } = render(<AuthForm mode="register" onSubmit={submit} />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Priya');
    await userEvent.type(screen.getByLabelText('Email'), 'p@x.co');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(submit).toHaveBeenCalledWith({ name: 'Priya', email: 'p@x.co', password: 'longenough' });
    rerender(<AuthForm mode="register" onSubmit={submit} error={new ApiError(409, 'EMAIL_TAKEN', 'taken')} />);
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('An account with this email already exists')).toBeTruthy();
    rerender(<AuthForm mode="register" onSubmit={submit} error={new ApiError(400, 'VALIDATION_FAILED', 'bad', [{ path: 'name', message: 'Server says no' }])} />);
    expect(screen.getByText('Server says no')).toBeTruthy();
  });
  it('blocks submit on client errors', async () => {
    const submit = vi.fn();
    render(<AuthForm mode="login" onSubmit={submit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email')).toBeTruthy();
  });
});

describe('ticket components', () => {
  const none = { canAccept: false, canRequestHuman: false, canResolve: false, canRate: false };
  it('TicketActions renders strictly per flags; Close needs confirmation', async () => {
    const on = vi.fn();
    const { rerender, container } = render(<TicketActions actions={none} onAction={on} />);
    expect(container.textContent).toBe('');
    rerender(<TicketActions actions={{ ...none, canAccept: true }} onAction={on} />);
    expect(screen.getByText('This solved it')).toBeTruthy();
    expect(screen.queryByText('Talk to a human')).toBeNull();
    rerender(<TicketActions actions={{ ...none, canResolve: true }} onAction={on} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close ticket' }));
    expect(on).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole('button', { name: 'Close ticket' });
    await userEvent.click(buttons[buttons.length - 1]!);
    expect(on).toHaveBeenCalledWith('resolve');
  });

  it('CsatCard: radio group + submit; thanks state once rated', async () => {
    const on = vi.fn();
    const { rerender } = render(<CsatCard canRate csat={null} onRate={on} />);
    await userEvent.click(screen.getByLabelText('4 — Good'));
    await userEvent.click(screen.getByRole('button', { name: 'Send rating' }));
    expect(on).toHaveBeenCalledWith(4, '');
    rerender(<CsatCard canRate={false} csat={{ rating: 4, comment: '', submittedAt: '' }} onRate={on} />);
    expect(screen.getByText(/you rated 4\/5/)).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('Thread is a polite log with AI badge, sources disclosure and reviewing state', async () => {
    const ai = msg({ id: 'ai', author: 'ai', authorName: 'AI', body: 'Try this', sources: [{ slug: 'pay', title: 'Payment pending' }] });
    render(<Thread messages={[msg(), ai]} onRetry={() => {}} aiPending />, { wrapper: wrap() });
    const log = screen.getByRole('log');
    expect(log.getAttribute('aria-live')).toBe('polite');
    expect(within(log).getByRole('list').querySelectorAll(':scope > li').length).toBeGreaterThan(0);   // li keep list semantics (axe listitem)
    expect(screen.getByText('AI assistant', { selector: 'span' })).toBeTruthy();
    const disc = screen.getByRole('button', { name: /Based on 1 article/ });
    expect(disc.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(disc);
    expect(screen.getByRole('link', { name: 'Payment pending' }).getAttribute('href')).toBe('/help/pay');
    expect(screen.getByText(/AI assistant is reviewing/)).toBeTruthy();
  });

  it('failed bubble offers Retry', async () => {
    const on = vi.fn();
    const m = { ...msg({ id: 'tmp-1', clientMessageId: '1', deliveryState: 'pending' }), localState: 'failed' as const };
    render(<Thread messages={[m]} onRetry={on} />, { wrapper: wrap() });
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(on).toHaveBeenCalledWith(m);
  });

  it('StatusPill shows text', () => {
    render(<StatusPill status="waiting_on_customer" />);
    expect(screen.getByText('Waiting on you')).toBeTruthy();
  });

  it('Composer sends on Ctrl+Enter, not on Enter', async () => {
    const on = vi.fn();
    render(<Composer ticket="SC-1" disabled={false} onSend={on} placeholder="Reply" />);
    const box = screen.getByLabelText('Message');
    await userEvent.type(box, 'hi{Enter}');
    expect(on).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    expect(on).toHaveBeenCalledWith('hi', []);
  });
});

describe('SuggestionPanel', () => {
  it('requests 800 ms after typing stops, aborts stale requests, hides on failure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => {
      signals.push(init.signal!);
      return new Promise<Response>(() => {}); // never resolves → stays in flight
    }));
    const desc = 'My payment went through but the plan';
    const { rerender } = render(<SuggestionPanel subject="Pay" description="short" />, { wrapper: wrap() });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(fetch).not.toHaveBeenCalled(); // < 20 chars
    rerender(<SuggestionPanel subject="Pay" description={desc} />);
    await act(() => vi.advanceTimersByTimeAsync(700));
    expect(fetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(fetch).toHaveBeenCalledTimes(1);
    rerender(<SuggestionPanel subject="Pay" description={desc + ' is inactive'} />);
    await act(() => vi.advanceTimersByTimeAsync(850));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(signals[0]!.aborted).toBe(true);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders nothing when the request fails', async () => {
    mockFetch({ status: 500, body: { error: { code: 'INTERNAL', message: 'x' } } });
    const { container } = render(<SuggestionPanel subject="Pay" description={'x'.repeat(25)} />, { wrapper: wrap() });
    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(() => expect(container.textContent).toBe(''));
    vi.unstubAllGlobals();
  });
});
