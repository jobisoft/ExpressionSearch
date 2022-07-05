var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionUtils } = ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");

var resProto = Cc[
  "@mozilla.org/network/protocol;1?name=resource"
].getService(Ci.nsISubstitutingProtocolHandler);

var resourceUrls = new Set();
var targetWindows = ["mail:3pane", "mailnews:virtualFolderList"];
var sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
var userCSS;
var ExpressionSearchChrome;

function registerResourceUrl(extension, namespace, folder) {
  const resProto = Cc[
    "@mozilla.org/network/protocol;1?name=resource"
  ].getService(Ci.nsISubstitutingProtocolHandler);

  if (resProto.hasSubstitution(namespace)) {
    throw new ExtensionError(`There is already a resource:// url for the namespace "${namespace}"`);
  }
  let uri = Services.io.newURI(
    folder || ".",
    null,
    extension.rootURI
  );
  resProto.setSubstitutionWithFlags(
    namespace,
    uri,
    resProto.ALLOW_CONTENT_ACCESS
  );
  resourceUrls.add(namespace);
}

var windowListener = {
  onDOMContentLoaded(domWindow) {
    domWindow.addEventListener(
      "DOMContentLoaded",
      function () {
        ExpressionSearchChrome.Load(domWindow);
      },
      { once: true }
    );
  },

  // nsIWindowMediatorListener implementation
  onOpenWindow(appWindow) {
    this.onDOMContentLoaded(appWindow.docShell.domWindow);
  },

  onCloseWindow(appWindow) {
  },
};

var ExpressionSearch = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
    console.log("Expression Search / Google Mail UI startup...");
    let { extension } = this;

    registerResourceUrl(extension, "expressionsearch");

    ExpressionSearchChrome = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm").ExpressionSearchChrome;
    userCSS = Services.io.newURI("resource://expressionsearch/skin/overlay.css", null, null);

    ExpressionSearchChrome.initPrefs();

    let windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext();
      if (!targetWindows.includes(domWindow.document.documentElement.getAttribute('windowtype'))) {
        continue;
      }

      if (domWindow.document.readyState == "complete") {
        ExpressionSearchChrome.Load(domWindow);
      } else {
        windowListener.onDOMContentLoaded(domWindow);
      }
    }
    Services.wm.addListener(windowListener);

    // install userCSS, works for all document like userChrome.css, see https://developer.mozilla.org/en/docs/Using_the_Stylesheet_Service
    // validator warnings on the below line, ignore it
    if (!sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.loadAndRegisterSheet(userCSS, sss.USER_SHEET); // will be unregister when shutdown
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return; // the application gets unloaded anyway
    }
    Services.wm.removeListener(windowListener);

    try {
      if (sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.unregisterSheet(userCSS, sss.USER_SHEET);
    } catch (err) {
      Cu.reportError(err);
    }

    try {
      // Unload from any existing windows
      let windows = Services.wm.getEnumerator(null);
      while (windows.hasMoreElements()) {
        let domWindow = windows.getNext();
        if (!targetWindows.includes(domWindow.document.documentElement.getAttribute('windowtype'))) {
          continue;
        }
        ExpressionSearchChrome.unLoad(domWindow);
      }
      ExpressionSearchChrome.cleanupPrefs();
    } catch (err) {
      Cu.reportError(err);
    }

    Services.strings.flushBundles();
    QuickFilterManager.killFilter("expression-search-filter");

    // Unload JSMs of this add-on
    for (let module of Cu.loadedModules) {
      let [schema, , namespace] = module.split("/");
      if (schema == "resource:" && resourceUrls.has(namespace)) {
        console.log("Unloading module", module);
        Cu.unload(module);
      }
    }

    resourceUrls.forEach(namespace => {
      console.log("Unloading namespace", namespace);
      resProto.setSubstitution(namespace, null);
    });

    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    Services.obs.notifyObservers(null, "chrome-flush-caches", null);
    Services.console.logStringMessage("Expression Search / Google Mail UI shutdown");
  }

  getAPI(context) {
    return {
      ExpressionSearch: {
      },
    };
  }
};
