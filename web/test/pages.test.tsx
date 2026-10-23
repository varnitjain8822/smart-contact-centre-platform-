import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { future, routes } from '../src/routes';
import { ToastProvider } from '../src/ui/Toast';
import { mockFetch, newQc, routeFetch } from './helpers';

const unauth = { status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'no' } } };
const user = { id: 'u1', name: 'Priya Shah', email: 'p@x.co', createdAt: '' };

function boot(path: string) {
  vi.stubGlobal('EventSource', class { addEventListener() {} close() {} });
  const qc = newQc();
  const router = createMemoryRouter(routes, { initialEntries: [path], future });
  render(<QueryClientProvider client={qc}><ToastProvider><RouterProvider router={router} future={{ v7_startTransition: true }} /></ToastProvider></QueryClientProvider>);
  return { qc, router };
}

describe('routing + pages', () => {
  it('signed-out /help renders without redirect', async () => {
    mockFetch(unauth, { body: { items: [{ slug: 'a', title: 'Invoices', category: 'Billing', excerpt: '', updatedAt: '' }] } });
    const { router } = boot('/help');
    expect(await screen.findByRole('heading', { level: 1, name: 'Help Center' })).toBeTruthy();
    expect(await screen.findByText('1 article')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/help');
  });

  it('unknown path renders the 404 page for signed-out visitors too', async () => {
    mockFetch(unauth);
    boot('/no/such/page');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Go to Help Center/ }).getAttribute('href')).toBe('/help');
  });

  it('protected route redirects to /login?next=', async () => {
    mockFetch(unauth, unauth);   // the login page re-runs ['me']; an unqueued {} would resolve it to undefined
    const { router } = boot('/tickets/SC-1');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(router.state.location.pathname + router.state.location.search).toBe('/login?next=%2Ftickets%2FSC-1');
  });

  it('login sets [me] and navigates to next', async () => {
    mockFetch(unauth, { body: { user } }, { body: { items: [], nextCursor: null } });
    const { qc, router } = boot('/login?next=%2Fprofile');
    await userEvent.type(await screen.findByLabelText('Email'), 'p@x.co');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
    expect(qc.getQueryData(['me'])).toEqual(user);
  });

  it('login rejects an external next', async () => {
    mockFetch(unauth, { body: { user } }, { body: { items: [], nextCursor: null } });
    const { router } = boot('/login?next=%2F%2Fevil.com');
    await userEvent.type(await screen.findByLabelText('Email'), 'p@x.co');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('empty KB search offers Raise a ticket with ?subject=', async () => {
    mockFetch({ body: { items: [] } }, { body: { items: [] } }, unauth);   // kb list, kb search, then ['me']
    boot('/help?q=refund%20gst');
    const link = await screen.findByRole('link', { name: 'Raise a ticket' });
    expect(link.getAttribute('href')).toBe('/tickets/new?subject=refund%20gst');
  });

  it('Home first-run state; profile WRONG_PASSWORD on current password field', async () => {
    routeFetch({
      'GET /api/auth/me': { body: { user } },
      'GET /api/me/overview': { body: { counts: { open: 0, aiHandling: 0, waitingOnYou: 0, resolved30d: 0 }, avgFirstResponseMin: null,
        avgResolutionHrs: null, csatAvg: null, slaWatch: [], activity: [], popularArticles: [{ slug: 'gst', title: 'GST invoices', views: 3 }] } },
      'GET /api/tickets': { body: { items: [], nextCursor: null } },
      'GET /api/notifications': { body: { items: [], unreadCount: 0, nextCursor: null } },
    });
    const { router } = boot('/');
    expect(await screen.findByRole('heading', { name: 'Welcome to SmartCC, Priya' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Raise a ticket/ }).getAttribute('href')).toBe('/tickets/new');
    expect(screen.getByRole('link', { name: /GST invoices/ }).getAttribute('href')).toBe('/help/gst');

    mockFetch({ status: 400, body: { error: { code: 'WRONG_PASSWORD', message: 'x' } } });
    await router.navigate('/profile');
    await userEvent.type(await screen.findByLabelText('Current password'), 'oldoldold');
    await userEvent.type(screen.getByLabelText('New password'), 'newnewnew');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Current password is incorrect')).toBeTruthy();
    expect(screen.getByLabelText('Current password').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('group', { name: 'Theme' })).toBeTruthy();
  });
});
