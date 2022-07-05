// Original by Ken Mixter for GMailUI, which is "GMailUI is completely free to use as you wish."
// Opera Wang, 2010/1/15
//  MPL 2.0
//Changes for TB 78+ (c) by Klaus Buecher/opto 2020-2021
"use strict";
//debugger;

var EXPORTED_SYMBOLS = ["ExpressionSearchChrome"];

//Cu.import("resource://gre/modules/Timer.jsm");
var { clearTimeout, setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


let console = {

  log: function (...a) {
    //console.log(a);
  }
}

var ExperssionSearchFilter = {};

/* https://bugzilla.mozilla.org/show_bug.cgi?id=1383215#c24
There are two ways that we currently support packaging omnijar:
1) Separate JAR files for toolkit (GRE) content and app-specific content.
2) One JAR file containing both app-specific and toolkit content.
 
Firefox uses the former (but used to use the latter), and Thunderbird uses the latter.
In case 2, resource:/// and resource://gre/ point to the same place, so it's technically possible to refer to app or toolkit content by two separate URLs,
and it's easy to carelessly use the wrong one. We had a bunch of these issues (especially with add-ons) when we switched layouts.
 
But the code that's using resource://gre/ URLs for app content, or vice versa, is still technically wrong. */


//.import("chrome://expressionsearch/content/aop.jsm");
//  //Cu.import("chrome://expressionsearch/content/common.js");
//   var {ExpressionSearchCommon} = ChromeUtils.import("chrome://expressionsearch/content/common.js");

// for hook functions for attachment search
var { SearchSpec } = ChromeUtils.import("resource:///modules/SearchSpec.jsm");
// general services
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
// for create quick search folder
//Cu.import("resource:///modules/virtualFolderWrapper.js"); // for VirtualFolderHelper
var { VirtualFolderHelper } = ChromeUtils.import(
  "resource:///modules/VirtualFolderWrapper.jsm"
);


// Cu.import("resource:///modules/iteratorUtils.jsm");
//  Cu.import("resource:///modules/gloda/utils.js"); // for GlodaUtils.parseMailAddresses
//  var {GlodaUtils} = ChromeUtils.import("resource:///modules/gloda/glodautils.jsm");
var { GlodaUtils } = ChromeUtils.import(
  "resource:///modules/gloda/GlodaUtils.jsm"
);
//Cu.import("resource://gre/modules/AddonManager.jsm");
var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
// need to know whether gloda enabled
//!!!
//   Cu.import("resource:///modules/gloda/indexer.js");


// XXX we need to know whether the gloda indexer is enabled for upsell reasons,
// but this should really just be exposed on the main Gloda public interface.
var { GlodaIndexer } = ChromeUtils.import(
  "resource:///modules/gloda/GlodaIndexer.jsm"
);


var {
  MessageTextFilter,
  QuickFilterManager,
  QuickFilterSearchListener,
  QuickFilterState,
} = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");


// to call gloda search, actually no need
//Cu.import("resource:///modules/gloda/msg_search.js");
//if (!ExperssionSearchFilter  )     
//   console.log("vor  import ExperssionSearchFilter", ExperssionSearchFilter);
//  var {ExperssionSearchFilter} = ChromeUtils.import("chrome://expressionsearch/content/ExpressionSearchFilter1.js");
//   console.log("end importModulesit", ExperssionSearchFilter);


//Cu.import("chrome://expressionsearch/content/gmailuiParse.js");
//  var { ExpressionSearchComputeExpression, ExpressionSearchExprToStringInfix, ExpressionSearchTokens } = ChromeUtils.import("chrome://expressionsearch/content/gmailuiParse.js");


console.log("vor import ExpressionSearchLog");
var { ExpressionSearchLog } = ChromeUtils.import("chrome://expressionsearch/content/log.jsm"); // load log first
console.log("nach import ExpressionSearchLog", ExpressionSearchLog);


console.log("nochmal GMAILUIParse in ");
var { ExpressionSearchComputeExpression, ExpressionSearchExprToStringInfix, ExpressionSearchTokens } = ChromeUtils.import("chrome://expressionsearch/content/gmailuiParse.js");
console.log("fertig GMAILUIParse in ");


console.log("vor ExpressionSearchaop");
var { ExpressionSearchaop } = ChromeUtils.import("chrome://expressionsearch/content/aop.jsm");
console.log("nach ExpressionSearchaop", ExpressionSearchaop);
console.log("vor ExpressionSearchCommon");

var { ExpressionSearchCommon } = ChromeUtils.import("chrome://expressionsearch/content/common.js");
console.log("nach ExpressionSearchCommon");


const XULNS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
const statusbarIconID = "expression-search-status-bar";
const statusbarIconSrc = 'resource://expressionsearch/skin/statusbar_icon.png';
const popupsetID = "expressionSearch-statusbar-popup";
const contextMenuID = "expression-search-context-menu";
const tooltipId = "expression-search-tooltip";
const oldAPI_61 = Services.vc.compare(Services.appinfo.platformVersion, '61.0a1') < 0;
const oldAPI_65 = Services.vc.compare(Services.appinfo.platformVersion, '65.0a1') < 0;
const oldAPI_67 = Services.vc.compare(Services.appinfo.platformVersion, '67.0a1') < 0;

//var EXPORTED_SYMBOLS = ["ExpressionSearchChrome"];
let opstrings = Services.strings.createBundle('chrome://expressionsearch/locale/ExpressionSearch.properties');
var ExpressionSearchChrome = {
  // if last key is Enter
  isEnter: 0,
  hookedGlobalFunctions: [],
  three_panes: [], // 3pane windows

  needMoveId: "quick-filter-bar-main-bar",
  originalFilterId: "qfb-qs-textbox",
  textBoxDomId: "expression-search-textbox",
  strBundle: opstrings,//Services.strings.createBundle('chrome://expressionsearch/locale/ExpressionSearch.properties'),

  prefs: null, // preference object
  options: {}, // preference strings

  loaded: 0,
  init: function () {
    //debugger;
    console.log("ExpressionSearchChrome init", "loaded", this.loaded);
    //  var  {ExpressionSearchLog} =  ChromeUtils.import("chrome://expressionsearch/content/log.jsm"); // load log first
    try {
      console.log("Expression Search: init..importmodules.");//, false, true);
      this.importModules();
      ExpressionSearchLog.log("ExpressionSearchChrome int: end..importmodules.", false, true);

    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
    //debugger;
    console.log("loaded", this.loaded);
    if (!this.loaded) {
      if (!this.prefs && ExpressionSearchLog) {
      //  ExpressionSearchLog.log("Expression Search is now restartless! ", 1);
      } else return;
    }
    this.loaded = 1;
    try {
      ExpressionSearchLog.log("Expression Search: init...", false, true);
      //      this.importModules();
      this.initPerf();
    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  importModules: function () {
    console.log("ExpressionSearchChrome importModules");
    /* https://bugzilla.mozilla.org/show_bug.cgi?id=1383215#c24
    There are two ways that we currently support packaging omnijar:
    1) Separate JAR files for toolkit (GRE) content and app-specific content.
    2) One JAR file containing both app-specific and toolkit content.
    
    Firefox uses the former (but used to use the latter), and Thunderbird uses the latter.
    In case 2, resource:/// and resource://gre/ point to the same place, so it's technically possible to refer to app or toolkit content by two separate URLs,
    and it's easy to carelessly use the wrong one. We had a bunch of these issues (especially with add-ons) when we switched layouts.
    
    But the code that's using resource://gre/ URLs for app content, or vice versa, is still technically wrong. */

    //Cu.import("chrome://expressionsearch/content/gmailuiParse.js");
    //var {ExpressionSearchComputeExpression, ExpressionSearchExprToStringInfix, ExpressionSearchTokens} = ChromeUtils.import("chrome://expressionsearch/content/gmailuiParse.js");

    //.import("chrome://expressionsearch/content/aop.jsm");
    //  //Cu.import("chrome://expressionsearch/content/common.js");
    //  var {ExpressionSearchCommon} = ChromeUtils.import("chrome://expressionsearch/content/common.js");
    // too late var  {ExpressionSearchLog} =  ChromeUtils.import("chrome://expressionsearch/content/log.jsm"); // load log first
    //console.log("nach import ExpressionSearchLog", ExpressionSearchLog);


    /*
      console.log("vor import ExpressionSearchLog in importmodules");
      if (!ExpressionSearchLog ) {
        console.log("ExpressionSearchLog  undefined");
    //    {ExpressionSearchLog} =  ChromeUtils.import("chrome://expressionsearch/content/log.jsm"); // load log first
      var  { ExpressionSearchLog } =  ChromeUtils.import("chrome://expressionsearch/content/log.jsm"); // load log first
    };
      console.log("nach import ExpressionSearchLog in importmodules", ExpressionSearchLog);
    */
    /*
    console.log("vor ExpressionSearchaop");
    var { ExpressionSearchaop } = ChromeUtils.import("chrome://expressionsearch/content/aop.jsm");
    console.log("nach ExpressionSearchaop", ExpressionSearchaop); 
    */

    /*
    var { ExpressionSearchCommon } = ChromeUtils.import("chrome://expressionsearch/content/common.js");
    
    if (!ExpressionSearchComputeExpression ) {
      console.log("nochmal GMAILUIParse in importmodules");
      var { ExpressionSearchComputeExpression, ExpressionSearchExprToStringInfix, ExpressionSearchTokens } = ChromeUtils.import("chrome://expressionsearch/content/gmailuiParse.js");
      console.log("fertig GMAILUIParse in importmodules");
    
    }
    
    */
    //console.log(this.loaded);
    //if (this.loaded==0) ExpressionSearchLog.log("Expression Search is NOT restartless! Please restart Thunderbird!", 1);
    //this.loaded=1;
    //  var { ExperssionSearchFilter } = ChromeUtils.import("chrome://expressionsearch/content/ExpressionSearchFilter.js");
    console.log(" vor ExperssionSearchFilter");
    ExperssionSearchFilter = ChromeUtils.import("chrome://expressionsearch/content/ExpressionSearchFilter.js").ExperssionSearchFilter;
    console.log("ExperssionSearchFilter");
    console.log(ExperssionSearchFilter);

    /*  
      // for hook functions for attachment search
      var { SearchSpec } = ChromeUtils.import("resource:///modules/SearchSpec.jsm");
        // general services
        var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
        var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
           // for create quick search folder
  //Cu.import("resource:///modules/virtualFolderWrapper.js"); // for VirtualFolderHelper
      var { VirtualFolderHelper } = ChromeUtils.import(
        "resource:///modules/VirtualFolderWrapper.jsm"
      );
      
     
     // Cu.import("resource:///modules/iteratorUtils.jsm");
    //  Cu.import("resource:///modules/gloda/utils.js"); // for GlodaUtils.parseMailAddresses
    var {GlodaUtils} = ChromeUtils.import("resource:///modules/gloda/glodautils.jsm");
      //Cu.import("resource://gre/modules/AddonManager.jsm");
      var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
      // need to know whether gloda enabled
    //!!!
   //   Cu.import("resource:///modules/gloda/indexer.js");
    
   
  // XXX we need to know whether the gloda indexer is enabled for upsell reasons,
  // but this should really just be exposed on the main Gloda public interface.
  var { GlodaIndexer } = ChromeUtils.import(
    "resource:///modules/gloda/GlodaIndexer.jsm"
  );
  
   
   
   
   // to call gloda search, actually no need
      //Cu.import("resource:///modules/gloda/msg_search.js");
      var {ExperssionSearchFilter} = ChromeUtils.import("chrome://expressionsearch/content/ExpressionSearchFilter.js");
      console.log("end importModulesit");
  
  
    */
  },

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1415567 Remove {get,set}ComplexValue use of nsISupportsString in Thunderbird
  oldAPI_58: Services.vc.compare(Services.appinfo.platformVersion, '58') < 0,
  complexPrefs: ["c2s_regexpMatch", "c2s_regexpReplace", "installed_version", "virtual_folder_path"],
  //mozIJSSubScriptLoader: Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader),

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1413413 Remove support for extensions having their own prefs file
  setDefaultPrefs: function () {
    let branch = Services.prefs.getDefaultBranch("");
    let prefLoaderScope = {
      pref: function (key, val) {
        switch (typeof val) {
          case "boolean":
            branch.setBoolPref(key, val);
            break;
          case "number":
            branch.setIntPref(key, val);
            break;
          case "string": // default don't have complex values, only empty or simple strings
            branch.setStringPref(key, val);
            break;
        }
      }
    };
    let uri = Services.io.newURI("chrome://expressionsearch/content/defaults.js");
    try {
      //! not working      this.mozIJSSubScriptLoader.loadSubScript(uri.spec, prefLoaderScope);  setCharPref
      //debugger;
      Services.scriptloader.loadSubScript(uri.spec, prefLoaderScope, "UTF-8");

    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  initPerf: function () {
    this.setDefaultPrefs();
    this.prefs = Services.prefs.getBranch("extensions.expressionsearch.");
    this.prefs.addObserver("", this, false);
    ["hide_normal_filer", "act_as_normal_filter", "reuse_existing_folder", "load_virtual_folder_in_tab", "select_msg_on_enter", "move2bar", "search_timeout",
      "results_label_size", "showbuttonlabel", "statusbar_info_showtime", "statusbar_info_hidetime", "c2s_enableCtrl", "c2s_enableShift", "c2s_enableCtrlReplace",
      "c2s_enableShiftReplace", "c2s_regexpMatch", "c2s_regexpReplace", "c2s_removeDomainName", "installed_version", "enable_statusbar_info", "enable_verbose_info"].forEach(function (key) {
        try {
          ExpressionSearchChrome.observe('', 'nsPref:changed', key); // we fake one
        } catch (err) {
          ExpressionSearchLog.logException(err);
        }
      });
  },

  // get called when event occurs with our perf branch
  observe: function (subject, topic, data) {
    if (topic != "nsPref:changed") {
      return;
    }
    switch (data) {
      case "hide_normal_filer":
      case "act_as_normal_filter":
      case "reuse_existing_folder":
      case "load_virtual_folder_in_tab":
      case "select_msg_on_enter":
      case "c2s_enableCtrl":
      case "c2s_enableShift":
      case "c2s_enableCtrlReplace":
      case "c2s_enableShiftReplace":
      case "c2s_removeDomainName":
      case "enable_statusbar_info":
      case "enable_verbose_info":
        this.options[data] = this.prefs.getBoolPref(data);
        break;
      case "move2bar": // 0:keep, 1:toolbar, 2:menubar 3: tabbar
      case "showbuttonlabel": // 0:auto 1:force show 2:force hide 3:hide label & button
      case "statusbar_info_showtime":
      case "statusbar_info_hidetime":
      case "results_label_size": // 0: hide when on filter bar and vertical layout , 1: show 2: hide
      case "search_timeout":
        this.options[data] = this.prefs.getIntPref(data);
        break;
      default:
        if (this.complexPrefs.indexOf(data) >= 0) {
          this.options[data] = this.oldAPI_58 ? this.prefs.getComplexValue(data, Ci.nsISupportsString).data : this.prefs.getStringPref(data);
        } else {
          ExpressionSearchLog.log("Unknown perf key:" + data, "Error", 1);
        }
        break;
    }
    if (data == 'enable_verbose_info') ExpressionSearchLog.setVerbose(this.options.enable_verbose_info);
    if (['hide_normal_filer', 'move2bar', 'showbuttonlabel', 'enable_verbose_info', "results_label_size"].indexOf(data) >= 0)
      this.three_panes.forEach(win => this.refreshFilterBar(win));
    if (data == 'search_timeout')
      this.three_panes.forEach(win => this.setSearchTimeout(win));
  },

  initFunctionHook: function (win) {
    //    if (!ExpressionSearchaop)  var { ExpressionSearchaop } = ChromeUtils.import("chrome://expressionsearch/content/aop.jsm");
    if (typeof (win.QuickFilterBarMuxer) == 'undefined' || typeof (win.QuickFilterBarMuxer.reflectFiltererState) == 'undefined') return;

    win._expression_search.hookedFunctions.push(ExpressionSearchaop.around({ target: win.QuickFilterBarMuxer, method: 'reflectFiltererState' }, function (invocation) {
      let show = (ExpressionSearchChrome.options.move2bar == 0 || !ExpressionSearchChrome.options.hide_normal_filer);
      let hasFilter = typeof (this.maybeActiveFilterer) == 'object';
      let aFilterer = invocation.arguments[0];
      // filter bar not need show, so hide mainbar(in refreshFilterBar) and show quick filter bar
      if (!show && !aFilterer.visible && hasFilter) aFilterer.visible = true;
      return invocation.proceed();
    })[0]);

    // onMakeActive && onTabSwitched: show or hide the buttons & search box
    win._expression_search.hookedFunctions.push(ExpressionSearchaop.around({ target: win.QuickFilterBarMuxer, method: 'onMakeActive' }, function (invocation) {
      let aFolderDisplay = invocation.arguments[0];
      let tab = aFolderDisplay._tabInfo;
      let appropriate = ("quickFilter" in tab._ext) && aFolderDisplay.displayedFolder && !aFolderDisplay.displayedFolder.isServer;
      win.document.getElementById(ExpressionSearchChrome.needMoveId).style.visibility = appropriate ? 'visible' : 'hidden';
      win.document.getElementById("qfb-results-label").style.visibility = appropriate ? 'visible' : 'hidden';
      return invocation.proceed();
    })[0]);

    win._expression_search.hookedFunctions.push(ExpressionSearchaop.before({ target: win.QuickFilterBarMuxer, method: 'onTabSwitched' }, function () {
      let filterer = this.maybeActiveFilterer;
      // filterer means if the tab can use quick filter
      // filterer.visible means if the quick search bar is visible
      win.document.getElementById(ExpressionSearchChrome.needMoveId).style.visibility = filterer /*&& filterer.visible*/ ? 'visible' : 'hidden';
      win.document.getElementById("qfb-results-label").style.visibility = filterer /*&& filterer.visible*/ ? 'visible' : 'hidden';
    })[0]);

    // hook _flattenGroupifyTerms to avoid being flatten
    if (!ExpressionSearchChrome.hookedGlobalFunctions.length) {
      ExpressionSearchChrome.hookedGlobalFunctions.push(ExpressionSearchaop.around({ target: SearchSpec.prototype, method: '_flattenGroupifyTerms' }, function (invocation) {
        let aTerms = invocation.arguments[0];
        let aCloneTerms = invocation.arguments[1];
        let topWin = Services.wm.getMostRecentWindow("mail:3pane");
        let aNode = topWin.document.getElementById(ExpressionSearchChrome.textBoxDomId);
        if (!aNode || !aNode.value) return invocation.proceed();
        let outTerms = aCloneTerms ? [] : aTerms;
        let term;
        if (aCloneTerms) {
          for (term of fixIterator(aTerms, Ci.nsIMsgSearchTerm)) {
            let cloneTerm = this.session.createTerm();
            cloneTerm.attrib = term.attrib;
            cloneTerm.value = term.value;
            cloneTerm.arbitraryHeader = term.arbitraryHeader;
            cloneTerm.hdrProperty = term.hdrProperty;
            cloneTerm.customId = term.customId;
            cloneTerm.op = term.op;
            cloneTerm.booleanAnd = term.booleanAnd;
            cloneTerm.matchAll = term.matchAll;
            cloneTerm.beginsGrouping = term.beginsGrouping;
            cloneTerm.endsGrouping = term.endsGrouping;
            term = cloneTerm;
            outTerms.push(term);
          }
        }
        return outTerms;
      })[0]);
    }

    // for results label to show correct colour by copy filterActive attribute from quick-filter-bar to qfb-results-label, and set colour in overlay.css
    win._expression_search.hookedFunctions.push(ExpressionSearchaop.after({ target: win.QuickFilterBarMuxer, method: 'reflectFiltererResults' }, function (result) {
      let qfb = win.document.getElementById("quick-filter-bar");
      let resultsLabel = win.document.getElementById("qfb-results-label");
      if (qfb && resultsLabel) {
        resultsLabel.setAttribute("filterActive", qfb.getAttribute("filterActive") || '');
      }
      return result;
    })[0]);

  },

  registerCallback(win) {
    this.three_panes.push(win);
  },

  unLoad: function (win) {
    console.log("ExpressionSearchChrome unLoad");

    if (typeof (win._expression_search) == 'undefined') return;
    ExpressionSearchLog.info("Expression Search: unload...");
    let me = ExpressionSearchChrome;
    if (me.helpTimer > 0) {
      clearTimeout(me.helpTimer);
      me.helpTimer = 0;
    }
    let index = me.three_panes.indexOf(win); // using ===
    if (index >= 0) me.three_panes.splice(index, 1);
    let threadPane = win.document.getElementById("threadTree");
    if (threadPane && threadPane.RemoveEventListener)
      threadPane.RemoveEventListener("contextmenu", me.onContextMenu, true);
    win._expression_search.hookedFunctions.forEach(hooked => hooked.unweave());
    let doc = win.document;
    for (let node of win._expression_search.createdElements) {
      if (typeof (node) == 'string') node = doc.getElementById(node);
      if (node && node.parentNode) {
        ExpressionSearchLog.info("removed node " + (node.id ? node.id : node));
        node.parentNode.removeChild(node);
      }
    }
    delete win._expression_search;
    delete win.ExpressionSearchChrome;
  },

  cleanup: function () {
    console.log("ExpressionSearchChrome cleanup");
    this.prefs.removeObserver("", ExpressionSearchChrome);
    delete this.prefs;
    this.hookedGlobalFunctions.forEach(hooked => hooked.unweave());
    ExpressionSearchLog.info("Expression Search: cleanup done");
  },

  refreshFilterBar: function (win) {
    let document = win.document;
    let QuickFilterBarMuxer = win.QuickFilterBarMuxer;
    //thunderbird-private-tabmail-buttons
    //  qfb-show-filter-bar  : document.getElementById("qfb-show-filter-bar").checked = aFilterer.visible;

    //quick-filter-bar
    //  quick-filter-bar-main-bar
    //    qfb-sticky qfb-filter-label [quick-filter-bar-collapsible-buttons] [100 results] [search filter]
    //  quick-filter-bar-expando
    //    quick-filter-bar-tab-bar : it's taG bar
    //    quick-filter-bar-filter-text-bar.collapsed=(aFilterValue.text == null);
    //QuickFilterState.visible

    //QuickFilterBarMuxer
    //  onMakeActive for qfb-show-filter-bar visiable
    //  reflectFiltererState for qfb-show-filter-bar checked
    let filterNode = document.getElementById(this.originalFilterId);
    if (filterNode && filterNode.style) {
      filterNode.style.display = this.options.hide_normal_filer ? 'none' : '';
      filterNode.setAttribute('width', this.options.move2bar == 0 ? 100 : 320);
      filterNode.setAttribute('minwidth', this.options.move2bar == 0 ? 80 : 280);
    }
    if (filterNode && ExpressionSearchChrome.options.hide_normal_filer) // hide normal filter, so reset it
      filterNode.value = '';

    // move expression search box along with other buttons to dest position
    if (this.options.move2bar != win._expression_search.savedPosition) {
      win._expression_search.savedPosition = this.options.move2bar;
      let dest = 'quick-filter-bar';
      let qfb = document.getElementById(dest);
      if (this.options.move2bar) qfb.classList.add('resetHeight'); // hide the qfb bar when move the elements to other places
      else qfb.classList.remove('resetHeight');
      let reference = null;
      if (this.options.move2bar == 0)
        reference = document.getElementById("quick-filter-bar-expando");
      else if (this.options.move2bar == 1) {
        dest = 'mail-bar3';
        reference = document.getElementById('qfb-show-filter-bar');
      } else if (this.options.move2bar == 2)
        dest = 'mail-toolbar-menubar2';
      else if (this.options.move2bar == 3) {
        dest = 'tabs-toolbar';
        reference = document.getElementById('tabbar-toolbar');
      }
      let toolbar = document.getElementById(dest);
      let needMove = document.getElementById(ExpressionSearchChrome.needMoveId);
      toolbar.insertBefore(needMove.parentNode.removeChild(needMove), reference);
    }

    let spacer = document.getElementById('qfb-filter-bar-spacer');
    if (spacer) {
      spacer.setAttribute('minwidth', 0);
      if (this.options.move2bar == 0) {
        spacer.setAttribute('flex', '2000');
        spacer.style.flex = '2000 1';
      } else {
        spacer.removeAttribute('flex');
        spacer.style.flex = '1 2000 auto';
      }
    }

    let resultsLabel = document.getElementById("qfb-results-label");
    if (resultsLabel) {
      if (typeof (resultsLabel._saved_minWidth) == 'undefined') resultsLabel._saved_minWidth = resultsLabel.getAttribute('minwidth') || 1;
      let layout = Services.prefs.getIntPref("mail.pane_config.dynamic");
      let minWidth = (this.options.results_label_size == 2 || (this.options.results_label_size == 0 && this.options.move2bar == 0 && layout == win.kVerticalMailLayout)) ? 0 : resultsLabel._saved_minWidth;
      resultsLabel.setAttribute('minwidth', minWidth);
      if (minWidth == 0) delete resultsLabel.style.width;
      if (spacer) {
        if (minWidth == 0) spacer.style.width = "1px";
        else spacer.style.width = "15px";
      }
    }

    let collapsible = document.getElementById('quick-filter-bar-collapsible-buttons');
    if (collapsible && collapsible.classList) {
      collapsible.classList.remove("hidelabel");
      collapsible.classList.remove("showlabel");
      collapsible.classList.remove("hideall");
      if (spacer) spacer.classList.remove("hideall");
      if (this.options.showbuttonlabel == 1) {
        collapsible.classList.add("showlabel");
      } else if (this.options.showbuttonlabel == 2) {
        collapsible.classList.add("hidelabel");
      } else if (this.options.showbuttonlabel == 3) {
        collapsible.classList.add("hideall");
        if (spacer) spacer.classList.add("hideall");
      } else if (this.options.showbuttonlabel == 0) {
        // auto show/hide collapsible buttons
        if (QuickFilterBarMuxer._buttonLabelsCollapsed) {
          QuickFilterBarMuxer._minExpandedBarWidth = 0; // let it re-calculate the min expanded bar width because we changed the layout
          QuickFilterBarMuxer.onWindowResize.apply(QuickFilterBarMuxer);
        } else {
          let quickFilterBarBox = document.getElementById("quick-filter-bar-main-bar");
          if (quickFilterBarBox && quickFilterBarBox.clientWidth < quickFilterBarBox.scrollWidth) {
            QuickFilterBarMuxer.onOverflow.apply(QuickFilterBarMuxer);
          }
        }
      }
    }

    let menu = document.getElementById(contextMenuID);
    if (menu) {
      for (let i = 0; i < menu.childNodes.length; i++) {
        let menuitem = menu.childNodes[i];
        menuitem.style.display = (this.options['enable_verbose_info']) ? "" : "none";
        if (menuitem.tagName == "menuseparator") break;
      };
    }
  },

  hideUpsellPanel: function (win) {
    let panel = win.document.getElementById("qfb-text-search-upsell");
    if (panel.state == "open")
      panel.hidePopup();
  },

  helpTimer: 0,

  showHideHelp: function (win, show, line1, line2, line3, line4) {
    let document = win.document;
    if (typeof (document) == 'undefined' || typeof (document.defaultView) == 'undefined') return;
    let tooltip = document.getElementById(tooltipId);
    let tooltip1 = document.getElementById("expression-search-tooltip-line1");
    let tooltip2 = document.getElementById("expression-search-tooltip-line2");
    let tooltip3 = document.getElementById("expression-search-tooltip-line3");
    let tooltip4 = document.getElementById("expression-search-tooltip-line4");
    let statusbaricon = document.getElementById(statusbarIconID);
    if (tooltip && tooltip1 && tooltip2 && tooltip3 && tooltip4 && statusbaricon) {
      if (typeof (line1) != 'undefined') tooltip1.textContent = line1;
      if (typeof (line2) != 'undefined') tooltip2.textContent = line2;
      if (typeof (line3) != 'undefined') tooltip3.textContent = line3;
      if (typeof (line4) != 'undefined') tooltip4.textContent = line4;
      if (!this.options.enable_statusbar_info) return;
      if (this.helpTimer > 0) {
        clearTimeout(this.helpTimer);
        this.helpTimer = 0;
      }
      let time2hide = this.options['statusbar_info_hidetime'] * 1000;
      if (show) {
        tooltip.openPopup(statusbaricon, "before_start", 0, 0, false, true, null);
        time2hide = this.options['statusbar_info_showtime'] * 1000;
        //if ( this.isFocus ) time2hide *= 2;
      }
      this.helpTimer = setTimeout(function () { tooltip.hidePopup(); }, time2hide);
    }
  },

  onTokenChange: function (event) {
    let searchValue = this.value;
    let start = searchValue.lastIndexOf(' ', this.selectionEnd > 0 ? this.selectionEnd - 1 : 0); // selectionEnd is index of the character after the selection
    //let currentString = searchValue.substring(start+1, this.selectionEnd).replace(/:.*/,'');
    let currentString = searchValue.substring(start + 1).replace(/[ :].*/, '');
    let help = ExpressionSearchTokens.mostFit(currentString);
    let term = undefined;
    if (searchValue == '') term = ' ';
    let win = ExpressionSearchChrome.getWinFromEvent(event);
    ExpressionSearchChrome.showHideHelp(win, 1, help.alias, help.info, help.matchString, term);
  },

  delayedOnSearchKeyPress: function (event) {
    let me = ExpressionSearchChrome;
    let win = ExpressionSearchChrome.getWinFromEvent(event);
    me.isEnter = 0;
    let searchValue = this.value; // this is aNode/my search text box, updated with event.char
    if (event && ((event.code == "return") || (event.code == "enter"))) {
      //      if ( event && ( ( event.DOM_VK_RETURN && event.keyCode==event.DOM_VK_RETURN ) || ( event.DOM_VK_ENTER && event.keyCode==event.DOM_VK_ENTER ) ) ) {
      me.isEnter = 1;
      let panel = win.document.getElementById("qfb-text-search-upsell");
      if (typeof (searchValue) != 'undefined' && searchValue != '') {
        if (event.ctrlKey || event.metaKey) { // create quick search folder
          ExperssionSearchFilter.latchQSFolderReq = me;
          this._fireCommand(this);
        } else if (GlodaIndexer.enabled && (panel.state == "open" || event.shiftKey || searchValue.toLowerCase().indexOf('g:') == 0)) { // gloda
          searchValue = ExperssionSearchFilter.expression2gloda(searchValue);
          if (searchValue != '') {
            //this._fireCommand(this); // just for selection, but no use as TB will unselect it
            let tabmail = win.document.getElementById("tabmail");
            tabmail.openTab("glodaFacet", {
              searcher: new win.GlodaMsgSearcher(null, searchValue)
            });
          }
        } else {
          let expression = ExpressionSearchComputeExpression(searchValue);
          if (expression.kind == 'spec' && expression.tok == 'calc') {
            me.isEnter = 0; // showCalculationResult also will select the result.
            me.showCalculationResult(win, expression);
          }
        }
      }
    } // end of IsEnter
    me.hideUpsellPanel(win); // hide the panel when key press
    // -- Keypresses for focus transferral
    if (event && (event.code == "ArrowDown") && !event.altKey)
      //    if ( event && event.DOM_VK_DOWN && ( event.keyCode == event.DOM_VK_DOWN ) && !event.altKey )
      me.selectFirstMessage(win, true);
    else if ((typeof (searchValue) == 'undefined' || searchValue == '') && event && (event.code == "Escape") && !event.altKey && !event.ctrlKey)
      //    else if ( ( typeof(searchValue) == 'undefined' || searchValue == '' ) && event && event.DOM_VK_ESCAPE && ( event.keyCode == event.DOM_VK_ESCAPE ) && !event.altKey && !event.ctrlKey )
      me.selectFirstMessage(win); // no select message, but select pane
    //else if (  event.altKey && ( event.ctrlKey || event.metaKey ) && event.keyCode == event.DOM_VK_LEFT ) // Ctrl + <-- not works when focus in textbox
    //  me.back2OriginalFolder(win);
    else me.onTokenChange.apply(this, [event]);
  },

  onSearchKeyPress: function (event) {
    //debugger;
    let self = this;
    // defer the call or this.value is still the old value, not updated with event.char yet
    setTimeout(function () { ExpressionSearchChrome.delayedOnSearchKeyPress.call(self, event); }, 0);
  },

  onSearchBarBlur: function (event) {
    let win = ExpressionSearchChrome.getWinFromEvent(event);
    ExpressionSearchChrome.hideUpsellPanel(win);
    ExpressionSearchChrome.isFocus = false;
    ExpressionSearchChrome.showHideHelp(win, false);
  },

  getWinFromEvent: function (event) {
    try {
      return event.view || event.currentTarget.ownerDocument.defaultView;
    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  onSearchBarFocus: function (event) {
    let win = ExpressionSearchChrome.getWinFromEvent(event);
    let aNode = win.document.getElementById(ExpressionSearchChrome.textBoxDomId);
    if (!aNode) return;
    if (aNode.value == '' && win.QuickFilterBarMuxer) win.QuickFilterBarMuxer._showFilterBar(true);
    ExpressionSearchChrome.isFocus = true;
    ExpressionSearchChrome.onTokenChange.apply(aNode, [event]);
  },

  initSearchInput: function (win) {
    console.log("initSearchInput");
    let doc = win.document;
    let mainBar = doc.getElementById(this.needMoveId);
    let oldTextbox = doc.getElementById(this.originalFilterId);
    if (!mainBar || !oldTextbox) {
      ExpressionSearchLog.log("Expression Search: Can't find quick filter main bar", "Error");
      return;
    }

    // TB69, for    customElements.define("search-textbox", MozSearchTextbox, { extends: "textbox" });
    //   let aNode = doc.createElementNS(XULNS, "search-textbox", {is: "search-textbox"});
    //  let aNode = doc.createElementNS(XULNS, "search-textbox", {is: "search-textbox"});

    //code in moz-central has this without the {is: ...}
    let aNode = doc.createXULElement("search-textbox");//, {is: "search-textbox"});
    // let aNode = oldTextbox.cloneNode();
    aNode.id = this.textBoxDomId;
    aNode.setAttribute("class", "searchBox");
    aNode.setAttribute("type", "search");
    aNode.setAttribute("emptytextbase", this.strBundle.GetStringFromName("textbox.emptyText.base"));
    aNode.setAttribute("timeout", 1000);
    aNode.setAttribute("maxlength", 2048);
    aNode.setAttribute("width", 320);
    aNode.setAttribute("maxwidth", 500);
    aNode.setAttribute("minwidth", 280);
    console.log("create box, command", aNode, oldTextbox, oldTextbox._commandHandler)
    //  aNode.onCommand = oldTextbox.onCommand;
    //is the following needed??
    //?    aNode.setAttribute("keyLabelNonMac", "<Strg-Umschalt-L>");
    //?    aNode.setAttribute("keyLabelMac", "<L>");
    //because of the #1 in emptytextbase??
    oldTextbox.parentNode.insertBefore(aNode, oldTextbox.nextSibling);
    win._expression_search.createdElements.push(aNode);

    aNode.addEventListener("keypress", this.onSearchKeyPress, true); // false will be after onComand, too late
    //aNode.addEventListener("keypress", this.onSearchKeyPress, false); // false will be after onComand, too late
    //aNode.addEventListener("input", this.onSearchKeyPress, true); // false will be after onComand, too late
    //aNode.addEventListener("input", this.onTokenChange, true); // input can't get arrow key change but can get update when click2search
    aNode.addEventListener("click", this.onTokenChange, true); // to track selectEnd change
    aNode.addEventListener("blur", this.onSearchBarBlur, true);
    aNode.addEventListener("focus", this.onSearchBarFocus, true);

    //not needed explicitly
    function handler(aEvent) {
      let filterValues = QuickFilterBarMuxer.activeFilterer.filterValues;
      let preValue =
        latchedFilterDef.name in filterValues
          ? filterValues[latchedFilterDef.name]
          : null;
      let [postValue, update] = latchedFilterDef.onCommand(
        preValue,
        domNode,
        aEvent,
        document
      );
      QuickFilterBarMuxer.activeFilterer.setFilterValue(
        latchedFilterDef.name,
        postValue,
        !update
      );
      if (update) {
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
    };

    //aNode.addEventListener("command", handler);


    this.setSearchTimeout(win);
  },

  setSearchTimeout: function (win) {
    let doc = win.document;
    let aNode = doc.getElementById(this.textBoxDomId);
    if (!aNode) return;
    aNode.timeout = this.options.search_timeout || 1000000000;
  },

  back2OriginalFolder: function (win) {
    try {
      if (typeof (win._expression_search.originalURI) == 'undefined') return;
      win.SelectFolder(win._expression_search.originalURI);
    } catch (err) {
    }
  },

  // not works well for complex searchTerms. But it's for all folders.
  createQuickFolder: function (win, searchTerms) {
    const nsMsgFolderFlags = Ci.nsMsgFolderFlags;
    let gFolderDisplay = win.gFolderDisplay;
    let currFolder = gFolderDisplay.displayedFolder;
    win._expression_search.originalURI = currFolder.URI;
    let rootFolder = currFolder.rootFolder; // nsIMsgFolder
    let QSFolderName = "ExpressionSearch";
    let uriSearchString = "";
    if (!rootFolder) {
      alert('Expression Search: Cannot determine root folder of search');
      return;
    }
    let virtual_folder_path = this.prefs.getStringPref('virtual_folder_path'); // '' or 'mailbox://nobody@Local%20Folders/Archive'
    let targetFolderParent = rootFolder;
    if (virtual_folder_path != '') targetFolderParent = ExpressionSearchCommon.getFolder(virtual_folder_path);
    if (!targetFolderParent) {
      alert('Expression Search: Cannot determine virtual folder path:' + virtual_folder_path);
      return;
    }
    let QSFolderURI = targetFolderParent.URI + "/" + QSFolderName;

    if (!targetFolderParent.containsChildNamed(QSFolderName) || !this.options.reuse_existing_folder) {
      for (let folder of rootFolder.descendants) {
        // only add non-virtual non-news folders
        if (!folder.isSpecialFolder(nsMsgFolderFlags.Newsgroup, false) && !folder.isSpecialFolder(nsMsgFolderFlags.Virtual, false)) {
          if (uriSearchString != "") {
            uriSearchString += "|";
          }
          uriSearchString += folder.URI;
        }
      }
    }

    if (this.options.load_virtual_folder_in_tab) {
      // select folders to clear the search box
      win.SelectFolder(QSFolderURI);
      win.SelectFolder(win._expression_search.originalURI);
      // if openTab later, will get 'Error: There is no active filterer but we want one.'
      ExpressionSearchCommon.openTab({ folder: rootFolder, type: 'folder' });
    }
    //Check if folder exists already
    if (targetFolderParent.containsChildNamed(QSFolderName)) {
      // modify existing folder
      let msgFolder = ExpressionSearchCommon.getFolder(QSFolderURI);
      if (!msgFolder.isSpecialFolder(nsMsgFolderFlags.Virtual, false)) {
        alert('Expression Search: Non search folder ' + QSFolderName + ' is in the way');
        return;
      }
      // save the settings
      let virtualFolderWrapper = VirtualFolderHelper.wrapVirtualFolder(msgFolder);
      virtualFolderWrapper.searchTerms = searchTerms;
      if (!this.options.reuse_existing_folder) {
        virtualFolderWrapper.searchFolders = uriSearchString;
      }
      virtualFolderWrapper.onlineSearch = false;
      virtualFolderWrapper.cleanUpMessageDatabase();
      MailServices.accounts.saveVirtualFolders();
    } else {
      VirtualFolderHelper.createNewVirtualFolder(QSFolderName, targetFolderParent, uriSearchString, searchTerms, false);
    }

    if (win._expression_search.originalURI == QSFolderURI) {
      // select another folder to force reload of our virtual folder
      win.SelectFolder(rootFolder.getFolderWithFlags(nsMsgFolderFlags.Inbox).URI);
    }
    win.SelectFolder(QSFolderURI);
  },

  // select first message, expand first container if closed
  selectFirstMessage: function (win, needSelect) { // needSelect: false:no foucus change, undefined:focus pan, true: focus to pan and select message
    if (!win || !win.document) return;
    let doc = win.document;
    let aNode = doc.getElementById(this.textBoxDomId);
    let gFolderDisplay = win.gFolderDisplay;
    if (!aNode || !gFolderDisplay) return;
    if (gFolderDisplay.tree && gFolderDisplay.tree.treeBoxObject && gFolderDisplay.tree.treeBoxObject.view) {
      let treeBox = gFolderDisplay.tree.treeBoxObject; //nsITreeBox_Object <= addon validator warning with comments
      let treeView = treeBox.view; //nsITreeView
      let dbViewWrapper = gFolderDisplay.view; // DBViewWrapper
      if (treeView && dbViewWrapper && treeView.rowCount > 0) {
        if (treeView.isContainer(0) && !treeView.isContainerOpen(0))
          treeView.toggleOpenState(0);
        if (typeof (needSelect) == 'undefined' || needSelect) {
          let threadPane = doc.getElementById("threadTree");
          // focusing does not actually select the row...
          threadPane.focus();
          if (needSelect) {
            // ...so explicitly select the currentIndex if available or the 1st one
            //threadPane.view.selection.select(threadPane.currentIndex);
            var row = treeView.isContainer(0) && dbViewWrapper.showGroupedBySort ? 1 : 0;
            treeView.selection.select(row);
            treeBox.ensureRowIsVisible(row);
          } // needSelect
        } // undefined or needSelect
      } // rowCount > 0
    }
    this.isEnter = false;
  },

  calculateResult: function (e) {
    if (e.kind == 'op') {
      if (e.tok == '+' || (e.right != undefined && e.tok == '-') || e.tok == '*' || e.tok == '/') {
        var r1 = this.calculateResult(e.left);
        var r2 = this.calculateResult(e.right);
        if (r1.kind == 'error')
          return r1;
        else if (r2.kind == 'error')
          return r2;
        else {
          if (e.tok == '+')
            return { kind: 'num', tok: r1.tok + r2.tok };
          else if (e.tok == '-')
            return { kind: 'num', tok: r1.tok - r2.tok };
          else if (e.tok == '*')
            return { kind: 'num', tok: r1.tok * r2.tok };
          else if (e.tok == '/') {
            // divide by zero is okay, it just results in infinity
            return { kind: 'num', tok: r1.tok / r2.tok };
          }
        }
      } else if (e.tok == '-') {
        var r1 = calculateResult(e.left);
        if (r1.kind == 'error')
          return r1;
        else
          return { kind: 'num', tok: -r1.tok };
      }
    } else if (e.kind == 'num') {
      return e;
    }
    ExpressionSearchLog.log('Expression Search: unexpected expression tree when calculating result', 1);
    return { kind: 'error', tok: 'internal' };
  },

  showCalculationResult: function (win, expression) {
    let aNode = win.document.getElementById(this.textBoxDomId);
    if (!aNode) return;
    expression = expression.left; // skip the calc: specifier
    // compute the result of this calculation
    var r = this.calculateResult(expression);
    // print the expression,
    var lhs = ExpressionSearchExprToStringInfix(expression);
    var rhs = '' + ((r.kind == 'num') ? r.tok : "<<ERROR: " + r.tok + ">>");
    aNode.value = lhs + " = " + rhs;
    aNode.setSelectionRange(lhs.length, lhs.length + rhs.length + 3); // TODO: not work?
  },

  //Check conditions for search: corresponding modifier is hold on or middle button is pressed
  CheckClickSearchEvent: function (event) {
    // event.button: 0:left, 1:middle, 2:right
    if (event.button != 2) return false;
    if (ExpressionSearchChrome.options.c2s_enableCtrl && event.ctrlKey) return true;
    if (ExpressionSearchChrome.options.c2s_enableShift && event.shiftKey) return true;
    return false;
  },

  //Replace string using user-defined regexp. If not match, return original strings. 
  //If multiple matches, return all replaces, concatinated with OR operator
  RegexpReplaceString: function (str) {
    if (ExpressionSearchChrome.options.c2s_regexpMatch.length == 0) return str;
    try {
      let regexp = new RegExp(ExpressionSearchChrome.options.c2s_regexpMatch, "gi"); // with g modifier, r_match[0] is the first match intead of whole match string
      let r_match = str.match(regexp);
      if (!r_match) return str;
      let res = r_match.map(function (match) {
        return match.replace(regexp, ExpressionSearchChrome.options.c2s_regexpReplace);
      });
      let out = res.join(" or ");
      if (res.length > 1)
        out = "(" + out + ")";
      return out;
    } catch (err) {
      ExpressionSearchLog.log("Expression Search Caught Exception " + err.name + ":" + err.message + " with regex '" + ExpressionSearchChrome.options.c2s_regexpMatch + "'", 1);
      return str;
    }
  },

  onContextMenu: function (event) {
    let me = ExpressionSearchChrome;
    let target = oldAPI_67 ? event.currentTarget : event.composedTarget;
    if (!target) return;
    let box = oldAPI_67 ? target.treeBoxObject : target.parentNode;
    if (!box) return;
    let win = ExpressionSearchChrome.getWinFromEvent(event);
    let aNode = win.document.getElementById(ExpressionSearchChrome.textBoxDomId);
    if (!aNode || !win.gDBView || !win.gFolderDisplay) return;
    if (!me.CheckClickSearchEvent(event)) return;
    let gFolderDisplay = win.gFolderDisplay;
    let row = {}; let col = {};
    if (oldAPI_67) {
      let childElt = {};
      box.getCellAt(event.clientX, event.clientY, row, col, childElt);
      if (!row || !col || typeof (row.value) == 'undefined' || typeof (col.value) == 'undefined' || row.value < 0 || col.value == null) return;
      // col.value.id: subjectCol, senderCol, recipientCol (may contains multi recipient, Comma Seprated), tagsCol, sio_inoutaddressCol (ShowInOut)
      row = row.value; col = col.value;
    } else {
      let cell = box.getCellAt(event.clientX, event.clientY); // row => 1755, col => { id : 'sizeCol', columns : array }
      row = cell.row; col = cell.col;
    }
    let token = "";
    let msgHdr = win.gDBView.getMsgHdrAt(row);
    let sCellText = box.view.getCellText(row, col);
    switch (col.id) {
      case "subjectCol":
        if ((me.options.c2s_enableCtrlReplace && event.ctrlKey) || (me.options.c2s_enableShiftReplace && event.shiftKey)) {
          sCellText = me.RegexpReplaceString(sCellText);
        }
        token = "simple";
        if (sCellText.indexOf("(") == 0)
          token = "s";
        let oldValue = "";
        while (oldValue != sCellText) {
          oldValue = sCellText;
          // \uFF1A is Chinese colon
          [/^\s*\S{2,3}(?::|\uFF1A)\s*(.*)$/, /^\s*\[.+\]:*\s*(.*)$/, /^\s+(.*)$/].forEach(function (element, index, array) {
            let newTxt = sCellText.replace(element, '$1');
            if (newTxt != '') sCellText = newTxt;
          });
        }
        break;
      case "senderCol":
        token = "f";
      //no break;
      case "recipientCol":
        if (token == "") token = "t";
      //no break;
      case "sio_inoutaddressCol": //showInOut support
      case "correspondentCol": // https://bugzilla.mozilla.org/show_bug.cgi?id=36489
        if (token == "") { // not recipientCol
          let properties = box.view.getCellProperties(row, col).split(/ +/); // ['incoming', 'imap', 'read', 'replied', 'offline']
          token = (properties.indexOf("in") >= 0 || properties.indexOf("incoming") >= 0) ? "f" : "t";
        }
        // parseMailAddresses needed undecoded option, so can't use mime2DecodedAuthor & mime2DecodedRecipients
        let addressesFromHdr = GlodaUtils.parseMailAddresses(token == 'f' ? msgHdr.author : msgHdr.recipients);
        // sCellText is already decoded, so can't use parseMailAddresses
        let addressesFromCell = MailServices.headerParser.parseDecodedHeader(sCellText);
        sCellText = addressesFromHdr.addresses.map(function (address, index) {
          let ret = address;
          let display = addressesFromCell[index].name;
          if (addressesFromHdr.fullAddresses[index] && display) {
            display = display.replace(/['"<>]/g, '');
            if (addressesFromHdr.fullAddresses[index].toLowerCase().indexOf(display.toLowerCase()) != -1)
              ret = display; // if display name is part of full address, then use display name
          }
          if (!me.options.c2s_removeDomainName) return ret;
          return ret.replace(/(.*)@.*/, '$1'); // use mail ID only if it's an email address and c2s_removeDomainName.
        }).join(' and ');
        if (addressesFromHdr.count > 1) sCellText = "(" + sCellText + ")";
        break;
      case "tagsCol":
        token = "tag";
        sCellText = sCellText.replace(/\s+/g, ' and '); //maybe not correct for "To Do"
        sCellText = "(" + sCellText + ")";
        break;
      case "dateCol":
        token = "date";
        // 5/20/2019, 6:00 PM => 5/20/2019
        // 6:00 PM => 6:00
        sCellText = sCellText.replace(/[,\s]+.*/g, '');
        break;
      default:
        return;
    }
    if (sCellText == "") return;
    win.QuickFilterBarMuxer._showFilterBar(true);
    aNode.value = token + ":" + sCellText;
    aNode.selectionEnd = aNode.selectionStart = 1;
    me.onTokenChange.apply(aNode, [event]);
    me.isEnter = true; // So the email can be selected
    // Stop event bubbling
    event.preventDefault();
    event.stopPropagation();
    aNode._fireCommand(aNode);
    return;
  },

  firstRunAction: function () {
    //! not working
    let anchor = '';
    if (this.options.installed_version != "0.1") anchor = '#version_history'; // this is an update
    let firstRun = Services.vc.compare(this.options.current_version, this.options.installed_version);
    // must before openTab
    this.prefs.setStringPref('installed_version', this.options.current_version);

    if (firstRun > 0) { // first for this version
      //      ExpressionSearchCommon.showHelpFile('expressionsearch.helpfile', anchor);
    }
  },

  createKeyset: function (win) {
    let doc = win.document;
    let mailKeys = doc.getElementById('mailKeys');
    if (!mailKeys) return;
    let keyset = doc.createElementNS(XULNS, "keyset");
    keyset.id = 'expression-search-keyset';
    let key1 = doc.createElementNS(XULNS, "key");
    key1.setAttribute("key", this.strBundle.GetStringFromName("focusSearch.key"));
    key1.setAttribute("modifiers", this.strBundle.GetStringFromName("focusSearch.mod"));
    key1.setAttribute('oncommand', "ExpressionSearchChrome.setFocus(window)");
    let key2 = doc.createElementNS(XULNS, "key");
    key2.setAttribute("keycode", this.strBundle.GetStringFromName("back2folder.keycode"));
    key2.setAttribute("modifiers", this.strBundle.GetStringFromName("back2folder.mod"));
    key2.setAttribute('oncommand', "ExpressionSearchChrome.back2OriginalFolder(window)");
    keyset.insertBefore(key1, null);
    keyset.insertBefore(key2, null);
    mailKeys.insertBefore(keyset, null);
    win._expression_search.createdElements.push(keyset);
  },

  createTooltip: function (win, status_bar) {
    let doc = win.document;
    console.log("tooltipdoc", doc);
    let tooltip = doc.createElementNS(XULNS, "tooltip");
    tooltip.id = tooltipId;
    tooltip.setAttribute('orient', 'vertical');
    tooltip.setAttribute('style', "white-space: pre-wrap; word-wrap:break-word; max-width: none; overflow: auto; ");
    let classes = ['token', 'info', 'match', 'term'];
    for (let i = 1; i <= 4; i++) {
      let description = doc.createElementNS(XULNS, "description");
      description.id = tooltipId + "-line" + i;
      description.setAttribute('class', 'tooltip-' + classes[i - 1]);
      ////debugger;
      if (i == 1 || i == 2) {
        description.textContent = this.strBundle.GetStringFromName("info.helpLine" + i);
      } else {
        description.textContent = ' ';
      }
      if (i == 2) {
        let hbox = doc.createElementNS(XULNS, "hbox");
        let label = doc.createElementNS(XULNS, "label");
        label.value = "    ";
        description.addEventListener('click', function () { ExpressionSearchCommon.showHelpFile('expressionsearch.helpfile'); });
        hbox.insertBefore(label, null);
        hbox.insertBefore(description, null);
        tooltip.insertBefore(hbox, null);
      } else {
        tooltip.insertBefore(description, null);
      }
    }
    status_bar.insertBefore(tooltip, null);
    win._expression_search.createdElements.push(tooltip);

    // Fix tooltip background color issue on Ubuntu
    if (tooltip && tooltip.classList) {
      let color = win.getComputedStyle(tooltip, null).getPropertyValue("background-color"); // string: rgb(255, 255, 225)
      if (color == 'transparent') tooltip.classList.add("forceInfo");
    }
  },

  initStatusBar: function (win) {
    debugger;
    let doc = win.document;
    let status_bar = doc.getElementById('status-bar');
    if (status_bar) { // add status bar icon
      this.createTooltip(win, status_bar);
      this.createKeyset(win);
      this.createPopup(win); // simple menu popup may can be in statusbarpanel by set that to 'statusbarpanel-menu-iconic', but better not
      let statusbarPanel;
      if (oldAPI_65) {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1491660 [de-xbl] Migrate statusbar and statusbarpanel to custom element.
        statusbarPanel = doc.createElementNS(XULNS, "statusbarpanel");
      } else {
        statusbarPanel = doc.createElementNS(XULNS, "hbox");
        statusbarPanel.classList.add('statusbarpanel');
      }
      let statusbarIcon = doc.createElementNS(XULNS, "image");
      statusbarIcon.id = statusbarIconID;
      statusbarIcon.setAttribute('src', statusbarIconSrc);
      statusbarIcon.setAttribute('tooltip', tooltipId);
      statusbarIcon.setAttribute('popup', contextMenuID);
      statusbarIcon.setAttribute('context', contextMenuID);
      statusbarPanel.insertBefore(statusbarIcon, null);
      status_bar.insertBefore(statusbarPanel, null);
      win._expression_search.createdElements.push(statusbarPanel);
    }
  },

  loadInto3pane: function (win) {
    console.log("loadInto3pane");
    let me = ExpressionSearchChrome;
    try {
      me.initFunctionHook(win);
      me.initStatusBar.apply(me, [win]);
      me.initSearchInput.apply(me, [win]);
      console.log("after initSearchInput");
      me.refreshFilterBar(win);
      console.log("after refreshFilterBar");
      me.registerCallback(win);
      console.log("after registerCallback");
      let threadPane = win.document.getElementById("threadTree");
      console.log("threadPane", threadPane);
      if (threadPane) {
        // On Mac, contextmenu is fired before onclick, thus even break onclick  still has context menu
        threadPane.addEventListener("contextmenu", me.onContextMenu, true);
      };
      console.log("ExperssionSearchFilter  in  loadInto3pane");
      console.log(ExperssionSearchFilter);
      QuickFilterManager.defineFilter(ExperssionSearchFilter);
      QuickFilterManager.textBoxDomId = ExperssionSearchFilter.domId;
      console.log("after defineFilter in loadinto3pane");
      let topWin = Services.wm.getMostRecentWindow("mail:3pane");
      topWin.QuickFilterBarMuxer._bindUI();
      console.log("after _bindUI in loadinto3pane");
      /**/
      //     ExperssionSearchFilter.initTest();
    } catch (ex) {
      ExpressionSearchLog.logException(ex);
    }
  },

  loadIntoVirtualFolderList(win) {
    let me = ExpressionSearchChrome;
    try {
      me.initFolderSelect(win);
      me.initFunctionHook4VirtualFolder(win);
    } catch (ex) {
      ExpressionSearchLog.logException(ex);
    }
  },

  Load: function (win) {
    console.log("start Load");
    let me = ExpressionSearchChrome;
    //window.removeEventListener("load", me.Load, false);
    if (typeof (win._expression_search) != 'undefined') return ExpressionSearchLog.log("expression search already loaded, return");
    win._expression_search = { createdElements: [], hookedFunctions: [], savedPosition: 0, timer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer), originalURI: undefined };
    win.ExpressionSearchChrome = ExpressionSearchChrome; // export ExpressionSearchChrome to windows name space

    let type = win.document.documentElement.getAttribute('windowtype');
    if (type == 'mail:3pane') {
      me.loadInto3pane(win);
    } else if (type == 'mailnews:virtualFolderList') {
      me.loadIntoVirtualFolderList(win);
    }

    // first get my own version
    me.options.current_version = "0.0"; // in default.js, it's 0.1, so first installed users also have help loaded
    try {
      if (oldAPI_61) {
        AddonManager.getAddonByID("expressionsearch@opto.one", function (addon) {
          me.options.current_version = addon.version;
          me.firstRunAction.apply(me);
        });
      } else {
        AddonManager.getAddonByID("expressionsearch@opto.one").then(addon => {
          me.options.current_version = addon.version;
          me.firstRunAction.apply(me);
        });
      }
    } catch (ex) {
    }

    win.addEventListener("unload", me.onUnLoad, false);
  },

  onUnLoad: function (event) {
    ExpressionSearchLog.info('onUnLoad');
    let aWindow = event.currentTarget;
    if (!aWindow) return;
    aWindow.removeEventListener("unload", ExpressionSearchChrome.onUnLoad, false);
    ExpressionSearchChrome.unLoad(aWindow);
  },

  setFocus: function (win) {
    if (ExpressionSearchChrome.options.move2bar == 0 && !QuickFilterBarMuxer.activeFilterer.visible)
      QuickFilterBarMuxer._showFilterBar(true);
    let aNode = win.document.getElementById(this.textBoxDomId);
    if (aNode) aNode.focus();
  },

  addMenuItem: function (menu, doc, parent) {
    let isSubMenu = typeof (menu[2]) == 'object' && menu[2] instanceof Array;
    let item = doc.createElementNS(XULNS, menu[0] == '' ? "menuseparator" : isSubMenu ? 'menu' : "menuitem");
    if (menu[0] != '') {
      item.setAttribute('label', menu[0]);
      if (menu[1]) item.setAttribute('image', menu[1]);
      if (isSubMenu) {
        let menupopup = doc.createElementNS(XULNS, "menupopup");
        menu[2].forEach(function (submenu) {
          autoArchive.addMenuItem(submenu, doc, menupopup);
        });
        item.insertBefore(menupopup, null);
      } else if (typeof (menu[2]) == 'function') item.addEventListener('command', menu[2], false);
      if (menu[3]) {
        for (let attr in menu[3]) {
          item.setAttribute(attr, menu[3][attr]);
        }
      }
      item.setAttribute('class', isSubMenu ? "menu-iconic" : "menuitem-iconic");
    }
    parent.insertBefore(item, null);
  },

  createPopup: function (aWindow) {
    let doc = aWindow.document;
    let popupset = doc.createElementNS(XULNS, "popupset");
    popupset.id = popupsetID;
    let menupopup = doc.createElementNS(XULNS, "menupopup");
    let menuGroupName = 'expression_search-status_menu';
    menupopup.id = contextMenuID;
    [
      ["about:config", "", function () { ExpressionSearchCommon.openTab('about:config'); }],
      ["about:crashes", "", function () { ExpressionSearchCommon.openTab('about:crashes'); }],
      ["about:memory", "", function () { ExpressionSearchCommon.openTab('about:memory?verbose'); }],
      [''], // items before seprator and the seprator it self will only shown if verbose
      [this.strBundle.GetStringFromName("dialog.settings"), "chrome://messenger/skin/accountcentral/account-settings.png", function () { ExpressionSearchCommon.openWindow('chrome://expressionsearch/content/esPrefDialog.xhtml'); }],
      [this.strBundle.GetStringFromName("option.help"), "chrome://global/skin/icons/question-64.png", function () { ExpressionSearchCommon.showHelpFile('expressionsearch.helpfile'); }],
      [this.strBundle.GetStringFromName("donate.label"), this.strBundle.GetStringFromName("donate.image"), function () { ExpressionSearchCommon.openDonateLinkExternaly(ExpressionSearchChrome.strBundle.GetStringFromName("donate.pay")); }],
      //     ["Addon @ Mozilla", "chrome://mozapps/skin/extensions/extensionGeneric.png", function(){ ExpressionSearchCommon.openLinkExternally("https://addons.thunderbird.net/en-US/thunderbird/addon/gmailui"); }],
      //     ["Addon @ GitHub", "chrome://awsomeAutoArchive/content/github.png", function(){ ExpressionSearchCommon.openLinkExternally("https://github.com/opto/expression-search-NG"); }],
      //     ["Addon @ GitHub", "chrome://mozapps/skin/extensions/extensionGeneric.png", function(){ ExpressionSearchCommon.openLinkExternally("https://github.com/opto/expression-search-NG"); }],
      ["Report Bug", "chrome://global/skin/icons/information-32.png", function () { ExpressionSearchCommon.openLinkExternally("https://github.com/opto/expression-search-NG/issues"); }],
      [this.strBundle.GetStringFromName("about.about"), "resource://expressionsearch/skin/statusbar_icon.png", function () { ExpressionSearchCommon.openWindow('chrome://expressionsearch/content/about.xhtml'); }],
      //      [this.strBundle.GetStringFromName("about.about"), "resource://expressionsearch/skin/statusbar_icon.png", function(){ ExpressionSearchCommon.openWindow('chrome://messenger/content/SearchDialog.xhtml'); }],
    ].forEach(function (menu) {
      ExpressionSearchChrome.addMenuItem(menu, doc, menupopup);
    });
    popupset.insertBefore(menupopup, null);
    doc.documentElement.insertBefore(popupset, null);
    aWindow._expression_search.createdElements.push(popupsetID);
  },

  // for VirtualFolder select dialog
  initFolderSelect: function (win) {
    let doc = win.document;
    let folderPickerTree = doc.getElementById('folderPickerTree');
    if (!folderPickerTree) {
      ExpressionSearchLog.log("Expression Search: Can't find folderPickerTree", "Error");
      return;
    }

    let hbox = doc.createElementNS(XULNS, "hbox");
    hbox.setAttribute("align", "center");
    let selectall = doc.createElementNS(XULNS, "button");
    this.strBundle.GetStringFromName("textbox.emptyText.base");
    selectall.setAttribute("label", this.strBundle.GetStringFromName("virtualfolder.selectall"));
    selectall.setAttribute('oncommand', "ExpressionSearchChrome.changeAllFolder(window, true);");
    let clearall = doc.createElementNS(XULNS, "button");
    clearall.setAttribute("label", this.strBundle.GetStringFromName("virtualfolder.clearall"));
    clearall.setAttribute('oncommand', "ExpressionSearchChrome.changeAllFolder(window, false);");
    let mode = doc.createElementNS(XULNS, "label");
    mode.setAttribute("value", this.strBundle.GetStringFromName('virtualfolder.modelabel'));
    let menulist = doc.createElementNS(XULNS, "menulist");
    menulist.id = 'esFolderType';
    let menupopup = doc.createElementNS(XULNS, "menupopup");
    let modesingle = doc.createElementNS(XULNS, "menuitem");
    modesingle.setAttribute("label", this.strBundle.GetStringFromName("virtualfolder.modesingle"));
    modesingle.setAttribute("value", 0);
    let modechild = doc.createElementNS(XULNS, "menuitem");
    modechild.setAttribute("label", this.strBundle.GetStringFromName("virtualfolder.modechild"));
    modechild.setAttribute("value", 1);
    let modedescendants = doc.createElementNS(XULNS, "menuitem");
    modedescendants.setAttribute("label", this.strBundle.GetStringFromName("virtualfolder.modedescendants"));
    modedescendants.setAttribute("value", 2);
    menupopup.insertBefore(modesingle, null);
    menupopup.insertBefore(modechild, null);
    menupopup.insertBefore(modedescendants, null);
    menulist.insertBefore(menupopup, null);
    hbox.insertBefore(selectall, null);
    hbox.insertBefore(clearall, null);
    hbox.insertBefore(mode, null);
    hbox.insertBefore(menulist, null);

    folderPickerTree.parentNode.insertBefore(hbox, folderPickerTree);
    win._expression_search.createdElements.push(hbox);
  },

  initFunctionHook4VirtualFolder: function (win) {
    if (typeof (win.gSelectVirtual) == 'undefined' || typeof (win.gFolderTreeView) == 'undefined') return;
    try {
      // How to deal with multi select and reverse?
      win._expression_search.hookedFunctions.push(ExpressionSearchaop.around({ target: win.gSelectVirtual, method: '_toggle' }, function (invocation) {
        let result = invocation.proceed(); // change folder's state first
        let typeSel = win.document.getElementById('esFolderType');
        let aRow = invocation.arguments[0];
        let folder = win.gFolderTreeView._rowMap[aRow]._folder;
        if (!typeSel || typeSel.value == 0 || !folder) return result;
        ExpressionSearchChrome.changeSubFolder(win, typeSel.value, folder);
        win.gFolderTreeView._tree.invalidate();
        return result;
      })[0]);
    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  changeSubFolder: function (win, type, folder) {
    try {
      for (let child of folder.subFolders) {
        ExpressionSearchChrome.setFolderSelected(win, child, folder);
        if (type == 2 && child.hasSubFolders && child.numSubFolders > 0) {
          ExpressionSearchChrome.changeSubFolder(win, type, child);
        }
      }
    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  changeAllFolder: function (win, state) {
    try {
      let accounts = MailServices.accounts.accounts;
      for (let account of accounts) {
        ExpressionSearchChrome.setFolderSelected(win, account.incomingServer.rootFolder, 0, state);
        ExpressionSearchChrome.changeSubFolder(win, 2, account.incomingServer.rootFolder);
        win.gFolderTreeView._tree.invalidate();
      }
    } catch (err) {
      ExpressionSearchLog.logException(err);
    }
  },

  setFolderSelected: function (win, folder, refFolder, state) {
    if (typeof (state) == 'undefined') {
      state = refFolder.inVFEditSearchScope || win.gSelectVirtual._selectedList.has(refFolder);
    }
    if (folder.setInVFEditSearchScope) { // < TB59
      folder.setInVFEditSearchScope(state, false /* subscope, not implemented */);
    } else {
      let selectedList = win.gSelectVirtual._selectedList;
      let selected = selectedList.has(folder);
      if (selected != state) {
        if (selectedList.has(folder))
          selectedList.delete(folder);
        else
          selectedList.add(folder);
      }
    }
  }

};
