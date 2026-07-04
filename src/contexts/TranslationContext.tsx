import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { dbClient } from '../lib/supabaseClient';

interface TranslationContextType {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: any;
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  const [localTrans, setLocalTrans] = useState<Record<string, string>>({});

  const translatingKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (currentLanguage === 'en') {
      setLocalTrans({});
      translatingKeys.current.clear();
      return;
    }

    translatingKeys.current.clear();
    dbClient.getTranslationsForLanguage(currentLanguage, TRANSLATIONS[currentLanguage] || {})
      .then((existingTranslations) => {
        if (existingTranslations) {
          TRANSLATIONS[currentLanguage] = {
            ...TRANSLATIONS[currentLanguage],
            ...existingTranslations
          };
          setLocalTrans(existingTranslations);
        }
      })
      .catch((err) => {
        console.warn("Firestore pre-load translations failed:", err);
      });
  }, [currentLanguage]);

  const triggerAsyncTranslation = async (englishText: string) => {
    if (currentLanguage === 'en') return;
    if (translatingKeys.current.has(englishText)) return;
    translatingKeys.current.add(englishText);

    try {
      const translated = await dbClient.translateTextDynamically(englishText, currentLanguage);
      if (translated && translated !== englishText) {
        const updatedDict = {
          ...(TRANSLATIONS[currentLanguage] || {}),
          [englishText]: translated
        };
        TRANSLATIONS[currentLanguage] = updatedDict;
        setLocalTrans(prev => ({ ...prev, [englishText]: translated }));

        // Save back to Firestore
        await dbClient.saveTranslationsForLanguage(currentLanguage, updatedDict);
      }
    } catch (err) {
      console.error("Failed dynamic translation:", err);
    }
  };

  const tBase = (englishText: string): string => {
    if (!englishText) return englishText;
    if (currentLanguage === 'en') return englishText;
    
    const trimmed = englishText.trim();
    if (!trimmed) return englishText;

    if (localTrans[trimmed]) {
      return englishText.replace(trimmed, localTrans[trimmed]);
    }
    
    // Check if the trimmed text is a key in the current language dictionary
    const glob = TRANSLATIONS[currentLanguage] || {};
    if (glob[trimmed]) {
      return englishText.replace(trimmed, glob[trimmed]);
    }

    // Check if the trimmed text matches the VALUE of a key in the English dictionary
    const englishDict = TRANSLATIONS['en'] || {};
    const matchingKey = Object.keys(englishDict).find(key => englishDict[key] === trimmed);
    if (matchingKey && glob[matchingKey]) {
      return englishText.replace(trimmed, glob[matchingKey]);
    }

    // Trigger translate in background
    triggerAsyncTranslation(trimmed);
    return englishText;
  };

  // Create a Proxy around tBase so it can be called as a function (t("text"))
  // or accessed as a dictionary (t.welcome, t.slogan, etc.)
  const t = new Proxy(tBase, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === 'prototype' || prop === 'name') {
        return Reflect.get(target, prop);
      }
      
      const key = String(prop);
      
      // If the property exists on the function itself (e.g. toString), return it
      if (key in target) {
        return (target as any)[key];
      }

      // Check current language dictionary
      const currentDict = TRANSLATIONS[currentLanguage] || {};
      if (currentLanguage !== 'en' && currentDict[key]) {
        return currentDict[key];
      }

      // Fallback to English dictionary
      const englishDict = TRANSLATIONS['en'] || {};
      if (englishDict[key]) {
        return englishDict[key];
      }

      return key;
    }
  });

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage: setCurrentLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
