import { useLocale, LOCALE_LABELS } from '../i18n';
import type { Locale } from '../i18n';

const LOCALES: Locale[] = ['en', 'ru', 'zh'];

export function LanguageSelector() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      class="lang-select"
      value={locale}
      onChange={(e) => setLocale((e.target as HTMLSelectElement).value as Locale)}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
