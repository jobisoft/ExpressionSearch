function translateURL(url, anchor) {
    if (typeof (anchor) == 'undefined') anchor = '';
    // built-in urls - about:config, about:crashes
    if (url.indexOf(':') != -1) {
      return url + anchor;
    }
    let rv = browser.i18n.getMessage(url);
    return rv
        ? rv + anchor
        : url + anchor;
  }
