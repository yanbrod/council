import { useState, useEffect } from 'preact/hooks';
import type { ProviderName, ProviderInfo } from '../types';
import { useT } from '../i18n';

interface Props {
  onSubmit: (prompt: string, compiler: ProviderName) => void;
  disabled: boolean;
  readOnly?: boolean;
  externalPrompt?: string;
  onNewRequest?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  providers?: ProviderInfo[];
}

export function PromptForm({ onSubmit, disabled, readOnly, externalPrompt, onNewRequest, onCancel, loading, providers = [] }: Props) {
  const t = useT();
  const [prompt, setPrompt] = useState('');
  const [compiler, setCompiler] = useState<ProviderName>('');

  useEffect(() => {
    if (providers.length > 0 && !compiler) {
      setCompiler(providers[0].name);
    }
  }, [providers, compiler]);

  useEffect(() => {
    setPrompt(externalPrompt ?? '');
  }, [externalPrompt]);

  const handleSubmit = () => {
    if (!prompt.trim() || disabled || readOnly || !compiler) return;
    onSubmit(prompt.trim(), compiler);
    setPrompt('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div class="prompt-form">
      <textarea
        value={prompt}
        onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        placeholder={t.promptPlaceholder}
        disabled={disabled || readOnly}
        class={readOnly ? 'prompt-form__textarea--readonly' : ''}
      />
      <div class="prompt-form__controls">
        {readOnly ? (
          <>
            <div class="prompt-form__new-btn-wrapper">
              <button
                onClick={onNewRequest}
                class="prompt-form__new-btn"
                disabled={loading}
              >
                {t.newRequest}
              </button>
              {loading && <span class="prompt-form__tooltip">{t.waitForCompletion}</span>}
            </div>
            {loading && (
              <button onClick={onCancel} class="prompt-form__cancel-btn">
                {t.cancel}
              </button>
            )}
          </>
        ) : loading ? (
          <button onClick={onCancel} class="prompt-form__cancel-btn">
            {t.cancel}
          </button>
        ) : (
          <>
            <select
              value={compiler}
              onChange={(e) => setCompiler((e.target as HTMLSelectElement).value)}
              disabled={disabled}
            >
              {providers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label} ({t.compiler})
                </option>
              ))}
            </select>
            <button onClick={handleSubmit} disabled={disabled || !prompt.trim() || !compiler}>
              {t.submit}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
