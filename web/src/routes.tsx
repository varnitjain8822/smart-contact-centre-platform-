import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, useSearchParams, type RouteObject } from 'react-router-dom';
import { safeNext } from './lib/validate';
import { AppShell } from './features/shell/AppShell';
import { RouteError } from './features/shell/ErrorBoundary';
import { RequireAuth, Splash } from './features/auth/RequireAuth';
import { useMe } from './features/auth/hooks';
import LoginPage from './pages/LoginPage';

const HomePage = lazy(() => import('./pages/HomePage'));
const TicketsPage = lazy(() => import('./pages/TicketsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const NewTicketPage = lazy(() => import('./pages/NewTicketPage'));
const TicketPage = lazy(() => import('./pages/TicketPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AssistantPage = lazy(() => import('./pages/AssistantPage'));

/** Signed-in visitors skip the auth pages — to `?next=` if safe (this is also the post-login redirect). */
function GuestOnly() {
  const me = useMe();
  const [sp] = useSearchParams();
  if (me.isPending) return <Splash />;
  return me.data ? <Navigate replace to={safeNext(sp.get('next'))} /> : <Outlet />;
}

export const routes: RouteObject[] = [
  { element: <GuestOnly />, errorElement: <RouteError />, children: [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
  ] },
  { element: <AppShell />, errorElement: <RouteError />, children: [
    { path: '/help', element: <HelpPage /> },
    { path: '/help/:slug', element: <ArticlePage /> },
    { path: '*', element: <NotFoundPage /> },
    { element: <RequireAuth><Outlet /></RequireAuth>, children: [
      { path: '/', element: <HomePage /> },
      { path: '/tickets', element: <TicketsPage /> },
      { path: '/tickets/new', element: <NewTicketPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/tickets/:number', element: <TicketPage /> },
      { path: '/assistant', element: <AssistantPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ] },
  ] },
];

export const future = { v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true,
  v7_partialHydration: true, v7_skipActionErrorRevalidation: true } as const;
export const router = createBrowserRouter(routes, { future });
