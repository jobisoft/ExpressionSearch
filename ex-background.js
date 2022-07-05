/*
 *
 * Code for TB 78 or later: Creative Commons (CC BY-ND 4.0):
 *      Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) 
 *
 * Copyright: Klaus Buecher/opto 2021
 * Contributors:  see Changes.txt
 */

messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
  switch (info.command) {
    case "showHelp":
      console.log({info});
        // Since you use links in your html, create the page in a tab to have navigation.
        // I would suggest to reduce this page to help topics only.
        messenger.tabs.create({ url: info.url });
        //messenger.windows.create({ url: info.url, type: "popup", width: 910, height: 750, });
      return;
      break;
  }
});

messenger.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
  if (temporary) {
    // skip during development
    //   return; 
  }

  switch (reason) {
    case "install":
      {
        const url = messenger.runtime.getURL("html/installed.html");
        // Since you use links in your html, create the page in a tab to have navigation.
        await messenger.tabs.create({ url });
        // await messenger.windows.create({ url, type: "popup", height: 750, width: 1090, });
        // await messenger.windows.create({ url, type: "popup", width: 910, height: 750, });
      }
      break;

    case "update":
      {
        const url = messenger.runtime.getURL("html/update.html");
        // Since you use links in your html, create the page in a tab to have navigation.
        await messenger.tabs.create({ url });
        // await messenger.windows.create({ url, type: "popup", width: 910, height: 750, });
        // await messenger.windows.create({ url, type: "popup", height: 750, width: 1090, });
      }
      break;
  }
});

async function main() {
  await messenger.BootstrapLoader.registerChromeUrl([
    ["content", "expressionsearch", "content/"],
    ["resource", "expressionsearch", ""],
    ["locale", "expressionsearch", "en-US", "locale/en-US/"],
    ["locale", "expressionsearch", "de", "locale/de/"]
  ]);

  await messenger.BootstrapLoader.registerBootstrapScript("bootstrap.js");
};

main();
