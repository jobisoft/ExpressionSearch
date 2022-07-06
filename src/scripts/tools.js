function translateURL(url, anchor) {
    if (typeof (anchor) == 'undefined') anchor = '';
    let rv = browser.i18n.getMessage(url);
    return rv
        ? rv + anchor
        : url + anchor;
  }
