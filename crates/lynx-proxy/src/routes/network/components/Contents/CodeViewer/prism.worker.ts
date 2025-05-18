// prism.worker.ts
// @ts-ignore
global.Prism = { disableWorkerMessageHandler: true };
const Prism = require('prismjs');

self.onmessage = function (e) {
  const { code, language } = e.data;
  if (typeof Prism !== 'undefined') {
    try {
      // @ts-ignore
      const html = Prism.highlight(
        code,
        // @ts-ignore
        Prism.languages[language] || Prism.languages.plain,
        language,
      );
      self.postMessage({ html });
    } catch (err) {
      self.postMessage({ html: code });
    }
  } else {
    self.postMessage({ html: code });
  }
};
