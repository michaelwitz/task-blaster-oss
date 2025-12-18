import { useTranslation as useI18nTranslation } from 'react-i18next';

// Custom hook that wraps react-i18next's useTranslation
// Provides a simpler interface for common translation needs
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  
  // Helper function for common translations
  const translate = (key, options = {}) => {
    return t(key, options);
  };
  
  // Helper for translating status values
  const translateStatus = (status) => {
    return t(`tasks.statuses.${status}`, status);
  };
  
  // Helper for translating priority values
  const translatePriority = (priority) => {
    return t(`tasks.priorities.${priority}`, priority);
  };
  
  // Helper for translating status descriptions
  const translateStatusDescription = (status) => {
    return t(`tasks.statusDescriptions.${status}`, '');
  };
  
  // Helper for translating common actions
  const translateAction = (action) => {
    return t(`common.${action}`, action);
  };
  
  return {
    t: translate,
    translateStatus,
    translatePriority,
    translateStatusDescription,
    translateAction,
    i18n,
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
};
