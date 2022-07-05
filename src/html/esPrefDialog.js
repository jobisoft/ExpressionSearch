//Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021
//  MPL 2.0

"use strict";

async function onLoad() {
  /*let folderPicker = document.getElementById("esNewFolderPicker");
  if (folderPicker.value == '') return;
  let msgFolder = ExpressionSearchCommon.getFolder(folderPicker.value);
  if (!msgFolder) return;
  try {
    document.getElementById("esNewFolderPopup").selectFolder(msgFolder); // not a issue, validator will false alarm on this line
  } catch (e) {
    folderPicker.setAttribute("label", msgFolder.prettyName);
  }
  folderPicker.setAttribute('tooltiptext', showPrettyTooltip(msgFolder.ValueUTF8 || msgFolder.value, msgFolder.prettyName));*/
  await preferences.load();

  let links = {
    "c2s_replace_title_textlink": {
      type: "window",
      url: translateURL("expressionsearch.helpfile", "#c2s_Replace")
    },
    "expressionsearch-pane-help-paypal-link": {
      type: "external",
      url: "https://www.paypal.com/donate?hosted_button_id=EMVA9S5N54UEW"
    },
    "expressionsearch-pane-help-file-textlink": {
      type: "window",
      url: translateURL("expressionsearch.helpfile")
    },
    "expressionsearch-pane-help-github-textlink": {
      type: "external",
      url: "https://github.com/opto/expression-search-NG/issues"
    },
    "expressionsearch-pane-help-crash-textlink": {
      type: "tab",
      url: "chrome://about:crashes"
    },
    "reuse_existing_folder-textlink": {
      type: "window",
      url: translateURL("expressionsearch.helpfile", "#keep_saved_search")
    }
  }

  for (let [id, link] of Object.entries(links)) {
    let element = window.document.getElementById(id);
    if (!element) console.log(id);
    switch (link.type) {
      case "tab":
        element.addEventListener("click", () => browser.tabs.create({ url: link.url }));
        break;
      case "window":
        element.addEventListener("click", () => browser.windows.create({ url: link.url, type: "popup" }));
        break;
      case "external":
        element.addEventListener("click", () => browser.windows.openDefaultBrowser(link.url));
        break;
    }
  }
}

var preferences = {
  _preferences: [],
  _preferencesLoaded: false,

  _getElementsByAttribute: function (name, value) {
    // If we needed to defend against arbitrary values, we would escape
    // double quotes (") and escape characters (\) in them, i.e.:
    //   ${value.replace(/["\\]/g, '\\$&')}
    return value
      ? window.document.querySelectorAll(`[${name}="${value}"]`)
      : window.document.querySelectorAll(`[${name}]`);
  },


  _setElementValue: async function (preference) {
    let value = await browser.LegacyPrefs.getPref(preference);

    // One preference could have multiple elements, i.e radio buttons.
    let elements = this._getElementsByAttribute("data-preference", preference);
    for (let element of elements) {
      if (element.localName == "input" && ["radio", "checkbox"].includes(element.type)) {
        // Special condition for radio elements (only the one with matching value gets checked).
        element.checked = (element.type == "radio")
          ? (value == element.value)
          : !!value
      } else {
        this._setValue(element, "value", value);
      }
    }
  },

  _getElementValue: async function (preference) {
    // One preference could have multiple elements, i.e radio buttons.
    let elements = this._getElementsByAttribute("data-preference", preference);
    for (let element of elements) {
      let attribute = "value";
      if (element.localName == "input" && ["radio", "checkbox"].includes(element.type)) {
        // Special condition for radio elements (find the checked one).
        if (element.type == "radio") {
          if (element.checked) {
            return this._getValue(element, "value");
          }
          continue;
        } else {
          return this._getValue(element, "checked");
        }
      }
      return this._getValue(element, "value");
    }
  },

  // Set the value of an HTML element.
  _setValue: function (element, attribute, value) {
    if (element.dataset.splitChar) {
      value = value.split(element.dataset.splitChar).map(e => e.trim()).join("\n")
    }
    
    if (attribute in element) {
      element[attribute] = value;
    } else {
      element.setAttribute(attribute, value);
    }
  },
  
  // Get the value of an HTML element.
  _getValue: function (element, attribute) {
    let rv = element.getAttribute(attribute);
    if (attribute in element) {
      rv = element[attribute];
    }

    if (element.dataset.splitChar) {
      rv.split("\n").map(e => e.replaceAll(" ","")).join(element.dataset.splitChar)
    }
    return rv;
  },

  // Load preferences into elements.
  load: async function () {
    // Gather all preference elements in this document and load their values.
    const elements = this._getElementsByAttribute("data-preference");
    for (const element of elements) {
      const prefName = element.dataset.preference;
      if (!this._preferences.includes(prefName)) {
        this._preferences.push(prefName);
      }
    }

    for (let preference of this._preferences) {
      await this._setElementValue(preference);
    }

    this._preferencesLoaded = true;

    window.document.getElementById("save").addEventListener("click", () => {
      preferences.save();
    });
  },

  save: async function () {
    if (!this._preferencesLoaded) return;

    for (let preference of this._preferences) {
      let newValue = await this._getElementValue(preference);
      await browser.LegacyPrefs.setPref(preference, newValue);
    }
  },
}


function showPrettyTooltip(URI, pretty) {
  return decodeURIComponent(URI).replace(/(.*\/)[^/]*/, '$1') + pretty;
}

function onFolderPick(aEvent) {
  let gPickedFolder = aEvent.target._folder || aEvent.target;
  let label = gPickedFolder.prettyName || gPickedFolder.label;
  let value = gPickedFolder.URI || gPickedFolder.value;
  let folderPicker = document.getElementById("esNewFolderPicker");
  folderPicker.value = value; // must set value before set label, or next line may fail when previous value is empty
  folderPicker.setAttribute("label", label);
  folderPicker.setAttribute('tooltiptext', showPrettyTooltip(value, label));
}

window.addEventListener("DOMContentLoaded", onLoad);
