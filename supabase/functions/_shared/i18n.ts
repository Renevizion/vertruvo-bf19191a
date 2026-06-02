// ============================================
// FIX #12: MULTI-LANGUAGE SUPPORT IN SCOPES
// ============================================

export type SupportedLocale = 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP' | 'zh-CN';

export interface LocalizedString {
  [locale: string]: string;
}

export interface I18nConfig {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
}

const DEFAULT_I18N_CONFIG: I18nConfig = {
  defaultLocale: 'en-US',
  supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
};

// Translation dictionary
const translations: Record<string, Record<SupportedLocale, string>> = {
  'workflow.created': {
    'en-US': 'Workflow created',
    'es-ES': 'Flujo de trabajo creado',
    'fr-FR': 'Flux de travail créé',
    'de-DE': 'Workflow erstellt',
    'ja-JP': 'ワークフロー作成済み',
    'zh-CN': '工作流已创建',
  },
  'lead.created': {
    'en-US': 'Lead created',
    'es-ES': 'Prospecto creado',
    'fr-FR': 'Prospect créé',
    'de-DE': 'Lead erstellt',
    'ja-JP': 'リード作成済み',
    'zh-CN': '潜在客户已创建',
  },
  'task.assigned': {
    'en-US': 'Task assigned',
    'es-ES': 'Tarea asignada',
    'fr-FR': 'Tâche assignée',
    'de-DE': 'Aufgabe zugewiesen',
    'ja-JP': 'タスク割り当て済み',
    'zh-CN': '任务已分配',
  },
  'notification.sent': {
    'en-US': 'Notification sent',
    'es-ES': 'Notificación enviada',
    'fr-FR': 'Notification envoyée',
    'de-DE': 'Benachrichtigung gesendet',
    'ja-JP': '通知送信済み',
    'zh-CN': '通知已发送',
  },
};

class I18nManager {
  private config: I18nConfig;
  
  constructor(config: Partial<I18nConfig> = {}) {
    this.config = { ...DEFAULT_I18N_CONFIG, ...config };
  }
  
  translate(key: string, locale: SupportedLocale = this.config.defaultLocale): string {
    const translation = translations[key];
    
    if (!translation) {
      console.warn(`[I18n] Missing translation for key: ${key}`);
      return key;
    }
    
    // Try exact locale match
    if (translation[locale]) {
      return translation[locale];
    }
    
    // Try language-only match (e.g., 'en' from 'en-US')
    const language = locale.split('-')[0];
    const fallback = Object.keys(translation).find(l => l.startsWith(language));
    
    if (fallback && translation[fallback as SupportedLocale]) {
      return translation[fallback as SupportedLocale];
    }
    
    // Fall back to default locale
    return translation[this.config.defaultLocale] || key;
  }
  
  detectLocale(acceptLanguage?: string): SupportedLocale {
    if (!acceptLanguage) {
      return this.config.defaultLocale;
    }
    
    // Parse Accept-Language header
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, q = '1'] = lang.trim().split(';q=');
        return { locale: locale.trim(), quality: parseFloat(q) };
      })
      .sort((a, b) => b.quality - a.quality);
    
    // Find first supported locale
    for (const { locale } of languages) {
      const supported = this.config.supportedLocales.find(
        l => l.toLowerCase() === locale.toLowerCase()
      );
      
      if (supported) {
        return supported;
      }
      
      // Try language-only match
      const language = locale.split('-')[0];
      const languageMatch = this.config.supportedLocales.find(
        l => l.split('-')[0].toLowerCase() === language.toLowerCase()
      );
      
      if (languageMatch) {
        return languageMatch;
      }
    }
    
    return this.config.defaultLocale;
  }
  
  formatDate(date: Date, locale: SupportedLocale = this.config.defaultLocale): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  
  formatNumber(value: number, locale: SupportedLocale = this.config.defaultLocale): string {
    return new Intl.NumberFormat(locale).format(value);
  }
  
  formatCurrency(
    value: number,
    currency: string = 'USD',
    locale: SupportedLocale = this.config.defaultLocale
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  }
}

// Global i18n manager
export const i18n = new I18nManager();

// I18n helpers
export function t(key: string, locale?: SupportedLocale): string {
  return i18n.translate(key, locale);
}

export function detectUserLocale(acceptLanguage?: string): SupportedLocale {
  return i18n.detectLocale(acceptLanguage);
}

export function localizeTemplate(
  template: string,
  locale: SupportedLocale,
  variables?: Record<string, any>
): string {
  let result = template;
  
  // Replace translation keys like {{t:key}}
  const keyRegex = /\{\{t:([^}]+)\}\}/g;
  result = result.replace(keyRegex, (match, key) => {
    return i18n.translate(key.trim(), locale);
  });
  
  // Replace variables like {{variable}}
  if (variables) {
    const varRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(varRegex, (match, key) => {
      const value = variables[key.trim()];
      return value !== undefined ? String(value) : match;
    });
  }
  
  return result;
}

export function addTranslation(key: string, localeTranslations: Partial<Record<SupportedLocale, string>>): void {
  if (!(translations as any)[key]) {
    (translations as any)[key] = {};
  }
  
  Object.assign((translations as any)[key], localeTranslations);
}
