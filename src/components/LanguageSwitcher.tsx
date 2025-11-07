'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  if (!mounted) {
    return null;
  }

  const languages = [
    { code: 'en', name: 'EN', flag: '🇬🇧' },
    { code: 'no', name: 'NO', flag: '🇳🇴' },
    { code: 'de', name: 'DE', flag: '🇩🇪' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        aria-label={t('language.select_language')}
        aria-expanded={isOpen}
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline font-semibold">
          {currentLanguage.name}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  i18n.language === language.code 
                    ? 'bg-blue-50 text-blue-600 font-medium' 
                    : 'text-gray-700'
                }`}
              >
                <span className="text-base">{language.flag}</span>
                <span className="font-semibold">{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
