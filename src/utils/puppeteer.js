const url = require('url');

const waitForRequest = (page, urlPattern = null, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for request'));
    }, timeoutMs);

    const requestHandler = request => {
      if (request.isNavigationRequest()) {
        if (urlPattern === null || request.url().includes(urlPattern)) {
          clearTimeout(timeoutId);
          page.off('request', requestHandler);

          const requestUrl = request.url();
          const urlParts = url.parse(requestUrl, true);

          resolve({
            url: requestUrl,
            query: urlParts.query,
            request: request
          });
        }
      }
    };

    page.on('request', requestHandler);
  });
};

module.exports = { waitForRequest };
