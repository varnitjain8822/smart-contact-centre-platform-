import { Component, type ReactNode } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RotateCw, TriangleAlert } from 'lucide-react';
import { Button, buttonClass } from '../../ui/Button';

export function ErrorPanel({ onRetry }: { onRetry(): void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-md border border-line bg-surface p-8 text-center shadow-card">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-bad/10 text-bad"><TriangleAlert aria-hidden size={26} /></span>
      <h1 className="text-2xl font-semibold">{t('error.title')}</h1>
      <p className="mt-2 text-ink-2">{t('error.body')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry}><RotateCw aria-hidden size={18} /> {t('error.retry')}</Button>
        <Link to="/" reloadDocument className={buttonClass('secondary')}>{t('error.home')}</Link>
      </div>
    </div>
  );
}

/** Wraps each route's content (AppShell keys it by pathname, so navigating away also resets it). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(error); }
  render() {
    return this.state.error ? <ErrorPanel onRetry={() => this.setState({ error: null })} /> : this.props.children;
  }
}

/** Router `errorElement` for errors outside the shell's boundary (auth pages, the shell itself). */
export function RouteError() {
  console.error(useRouteError());
  return <div className="px-4"><ErrorPanel onRetry={() => location.reload()} /></div>;
}
