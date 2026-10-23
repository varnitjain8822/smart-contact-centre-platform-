import { useTranslation } from 'react-i18next';
import { AssistantChat } from '../features/assistant/AssistantChat';
import { PageTitle } from '../ui/PageTitle';

/** Full-page assistant: the chat fills the viewport below the page header. */
export default function AssistantPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageTitle title={t('assistant.title')} className="text-3xl md:text-[40px]" />
      <p className="mt-2 text-ink-2">{t('assistant.lede')}</p>
      <div className="mt-6 flex h-[calc(100dvh-300px)] min-h-[440px] flex-col overflow-hidden rounded-md border border-line bg-surface shadow-card max-md:h-[calc(100dvh-280px)]">
        <AssistantChat />
      </div>
    </div>
  );
}
