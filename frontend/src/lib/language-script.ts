export const languageScript = `
(function() {
  try {
    var cookieMatch = document.cookie.match(/(?:^|; )language=([^;]+)/);
    var cookieLang = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    var validCookieLang = (cookieLang === 'zh-CN' || cookieLang === 'en') ? cookieLang : null;
    var storageRaw = localStorage.getItem('language-storage');
    var storageLang = null;
    if (storageRaw) {
      try {
        storageLang = JSON.parse(storageRaw || '{}').state?.language || null;
      } catch (e) {
        storageLang = null;
      }
    }
    var effectiveLang = (storageLang === 'zh-CN' || storageLang === 'en') ? storageLang : validCookieLang;
    if (!effectiveLang) {
      var browserLang = (navigator.language || 'en').toLowerCase();
      effectiveLang = browserLang.startsWith('zh') ? 'zh-CN' : 'en';
    }
    document.documentElement.lang = effectiveLang;
    if (!storageLang) {
      localStorage.setItem('language-storage', JSON.stringify({ state: { language: effectiveLang }, version: 0 }));
    }
  } catch (e) {
    document.documentElement.lang = 'en';
  }
})();
`

