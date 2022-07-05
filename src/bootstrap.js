"use strict";

var { ExpressionSearchChrome } = ChromeUtils.import("resource://expressionsearch/modules/ExpressionSearchChrome.jsm");

const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
const userCSS = Services.io.newURI("resource://expressionsearch/skin/overlay.css", null, null);
const targetWindows = ["mail:3pane", "mailnews:virtualFolderList"];
const observeEvent = "xul-window-registered";


async function loadIntoWindow(window) {
  if (!window) return; // windows is the global host context

  let document = window.document; // XULDocument
  let type = document.documentElement.getAttribute('windowtype'); // documentElement maybe 'messengerWindow' / 'addressbookWindow'
  if (targetWindows.indexOf(type) < 0) return;
  if (!window.es_loaded) {
    window.es_loaded = true;
  };

  ExpressionSearchChrome.Load(window);
}

var windowListener = {
  onOpenWindow: function (aWindow) {
    let onLoadWindow = function () {
      aWindow.removeEventListener("DOMContentLoaded", onLoadWindow, false);
      loadIntoWindow(aWindow);
    };
    aWindow.addEventListener("DOMContentLoaded", onLoadWindow, false);
  },
  observe: function (subject, topic, data) {
    if (topic == observeEvent) {
      windowListener.onOpenWindow(subject.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow));
    }
  }
};

function startup(aData, aReason) {
  console.log("Expression Search / Google Mail UI startup...");
  ExpressionSearchChrome.init(); // will and add my filter, and TB want the domID exists when filter registered, so only called when have window ready

  let windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext();
    if (domWindow.document.readyState == "complete" && targetWindows.indexOf(domWindow.document.documentElement.getAttribute('windowtype')) >= 0) {
      loadIntoWindow(domWindow);
    } else {
      windowListener.onOpenWindow(domWindow);
    }
  }
  Services.obs.addObserver(windowListener, observeEvent, false);
  if (!sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.loadAndRegisterSheet(userCSS, sss.USER_SHEET); // will be unregister when shutdown
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN) return;

  try {
    if (sss.sheetRegistered(userCSS, sss.USER_SHEET)) sss.unregisterSheet(userCSS, sss.USER_SHEET);
  } catch (err) { Cu.reportError(err); }

  try {
    Services.obs.removeObserver(windowListener, observeEvent);
  } catch (err) { Cu.reportError(err); }


  try {
    let windows = Services.wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let winInterface = windows.getNext();//.QueryInterface(Ci.nsIInterfaceRequestor);
      let domWindow = winInterface.getInterface(Ci.nsIDOMWindow);
      ExpressionSearchChrome.unLoad(domWindow); // won't check windowtype as unload will check
    }
    ExpressionSearchChrome.cleanupPrefs();
  } catch (err) { Cu.reportError(err); }
  
  // Unload JSMs of this add-on
  for (let module of Cu.loadedModules) {
    let [schema, , namespace] = module.split("/");
    if (schema == "resource:" && namespace == "expressionsearch") {
      console.log("Unloading module", module);
      Cu.unload(module);
    }
  } 

  try {
    ExpressionSearchChrome = null;
  } catch (err) { Cu.reportError(err); }
  
  Services.obs.notifyObservers(null, "startupcache-invalidate", null); //ADDON_DISABLE ADDON_UNINSTALL ADDON_UPGRADE ADDON_DOWNGRADE
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
  Services.console.logStringMessage("Expression Search / Google Mail UI shutdown");
}

function install(aData, aReason) { }
function uninstall(aData, aReason) { }
