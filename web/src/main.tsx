import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/figtree';
import './styles/index.css';
import { i18nReady } from './i18n';
import { makeQueryClient } from './lib/queryClient';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './ui/Toast';
import { router } from './routes';
import { Splash } from './features/auth/RequireAuth';

void i18nReady.then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={makeQueryClient()}>
      <ThemeProvider>
        <ToastProvider>
          <Suspense fallback={<Splash />}>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </Suspense>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
));
