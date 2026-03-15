import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export type Locale = 'en' | 'ru' | 'zh';

const translations = {
  en: {
    title: 'AI Council',
    promptPlaceholder: 'Enter a prompt for AI Council...',
    newRequest: 'New Request',
    waitForCompletion: 'Wait for the current request to complete',
    cancel: 'Cancel',
    submit: 'Send',
    compiler: 'compiler',
    history: 'History',
    noSessions: 'No sessions yet',
    delete: 'Delete',
    pending: 'Pending...',
    running: 'Running...',
    timeout: 'Timeout',
    error: 'Error',
    cancelled: 'Cancelled',
    errorWithCode: (code: number | null) => `Error (exit code: ${code})`,
    timeoutExceeded: 'Request timed out',
    compilerTitle: (label: string) => `Compiler (${label})`,
  },
  ru: {
    title: 'AI Council',
    promptPlaceholder: 'Введите запрос для AI Council...',
    newRequest: 'Новый запрос',
    waitForCompletion: 'Дождитесь завершения текущего запроса',
    cancel: 'Отмена',
    submit: 'Отправить',
    compiler: 'компилятор',
    history: 'История',
    noSessions: 'Пока нет сессий',
    delete: 'Удалить',
    pending: 'Ожидание...',
    running: 'Выполняется...',
    timeout: 'Таймаут',
    error: 'Ошибка',
    cancelled: 'Отменено',
    errorWithCode: (code: number | null) => `Ошибка (exit code: ${code})`,
    timeoutExceeded: 'Превышено время ожидания',
    compilerTitle: (label: string) => `Компилятор (${label})`,
  },
  zh: {
    title: 'AI Council',
    promptPlaceholder: '输入 AI Council 的提示...',
    newRequest: '新请求',
    waitForCompletion: '请等待当前请求完成',
    cancel: '取消',
    submit: '发送',
    compiler: '编译器',
    history: '历史记录',
    noSessions: '暂无会话',
    delete: '删除',
    pending: '等待中...',
    running: '运行中...',
    timeout: '超时',
    error: '错误',
    cancelled: '已取消',
    errorWithCode: (code: number | null) => `错误 (exit code: ${code})`,
    timeoutExceeded: '请求超时',
    compilerTitle: (label: string) => `编译器 (${label})`,
  },
};

export type Translations = {
  title: string;
  promptPlaceholder: string;
  newRequest: string;
  waitForCompletion: string;
  cancel: string;
  submit: string;
  compiler: string;
  history: string;
  noSessions: string;
  delete: string;
  pending: string;
  running: string;
  timeout: string;
  error: string;
  cancelled: string;
  errorWithCode: (code: number | null) => string;
  timeoutExceeded: string;
  compilerTitle: (label: string) => string;
};

export const I18nContext = createContext<Translations>(translations.en);
export const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: 'en',
  setLocale: () => {},
});

export function getTranslations(locale: Locale): Translations {
  return translations[locale];
}

export function useT(): Translations {
  return useContext(I18nContext);
}

export function useLocale() {
  return useContext(LocaleContext);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  zh: '中文',
};

const STORAGE_KEY = 'ai-council-locale';

export function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ru' || saved === 'zh') return saved;
  } catch {}
  return 'en';
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}
