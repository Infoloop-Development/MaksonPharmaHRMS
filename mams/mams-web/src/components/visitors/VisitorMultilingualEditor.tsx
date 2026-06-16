import {
  VISITOR_FORM_EXTRA_LOCALES,
  VISITOR_FORM_LOCALE_LABELS,
  normalizeVisitorLanguages,
  type VisitorFormLocale,
  type VisitorMultilingual,
} from '@mams/types';

export function VisitorMultilingualEditor({
  value,
  onChange,
}: {
  value: VisitorMultilingual;
  onChange: (value: VisitorMultilingual) => void;
}) {
  const normalized = normalizeVisitorLanguages(value);

  const toggleEnabled = (enabled: boolean) => {
    if (!enabled) {
      onChange({ enabled: false, languages: ['en'] });
      return;
    }
    onChange({ enabled: true, languages: normalized.languages.length > 1 ? normalized.languages : ['en', 'gu'] });
  };

  const toggleExtra = (locale: (typeof VISITOR_FORM_EXTRA_LOCALES)[number], checked: boolean) => {
    const set = new Set(normalized.languages);
    set.add('en');
    if (checked) set.add(locale);
    else set.delete(locale);
    onChange({ enabled: true, languages: Array.from(set) as VisitorFormLocale[] });
  };

  return (
    <div className="mt-4 p-4 rounded-md border border-border bg-surface2/40 space-y-3">
      <p className="text-sm font-semibold">Multilingual form</p>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={normalized.enabled}
          onChange={(e) => toggleEnabled(e.target.checked)}
        />
        This is a multilingual form
      </label>

      {normalized.enabled && (
        <div className="ml-6 space-y-2">
          <p className="text-xs text-text-muted">
            English is always included. Visitors pick a language tab on the public form; labels and questions are
            translated automatically. You can set a different intro video per language below.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 opacity-80">
              <input type="checkbox" checked disabled />
              {VISITOR_FORM_LOCALE_LABELS.en} (required)
            </label>
            {VISITOR_FORM_EXTRA_LOCALES.map((locale) => (
              <label key={locale} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalized.languages.includes(locale)}
                  onChange={(e) => toggleExtra(locale, e.target.checked)}
                />
                {VISITOR_FORM_LOCALE_LABELS[locale]}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
