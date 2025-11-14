// TODO:
// 0. Rename to Quick Proxy and pack as a proper extension
// 1. Remember proxy state between Firefox restarts
// 2. Set proxySettings in extension settings
// 3. Release 0.1 version
// 4. More than two proxy settings
// 5. Auto pickup VPN changes.
//    May require communication with local scripts and "nativeMessaging" permission
//    See e.g. https://kod.ujo.moe/jadedctrl/shellfox

const defaultSettingsName = "default";
const proxyEnabledSettingsName = "auto-config";

const allSettings = {
    "default": {
        "proxyType": "none",
    },
    "auto-config": {
        "proxyType": "autoConfig",
        "autoConfigUrl": "file:///Users/oliora/davinci/firefox-proxy.js"
    },
};

let currentSettingsName;
let settingsControlDisabled = false;
let canControlSettings = false;

function disableBrowserButton(reason) {
    browser.browserAction.disable();
    browser.browserAction.setIcon({});
    browser.browserAction.setTitle({
        title: `QuickProxy deactivated: ${reason}`
    });
}

function updateBrowserButton() {
    if (settingsControlDisabled) {
        disableBrowserButton("Open QuickProxy extension settings and allow 'Run in Private Windows'");
        return;
    }

    if (!canControlSettings) {
        disableBrowserButton("Extension other than QuickProxy controls proxy settings");
        return;
    }

    const isProxyEnabled = currentSettingsName !== defaultSettingsName;
    if (isProxyEnabled) {
        browser.browserAction.setIcon({
            path: {
                48: "icons/app-active.svg" // TODO: support dark theme
            }
        });
        browser.browserAction.setTitle({
            title: `QuickProxy: proxy enabled`
        });
    } else {
        browser.browserAction.setIcon({});
        browser.browserAction.setTitle({
            title: `QuickProxy: proxy disabled`
        });
    }

    browser.browserAction.enable();
}

function onProxySettingsChanged(details) {
    console.debug(`Get proxy settings: ${JSON.stringify(details.value)}`);

    canControlSettings = (details.levelOfControl === "controllable_by_this_extension") || (details.levelOfControl === "controlled_by_this_extension");
    if (!canControlSettings) { 
        console.error(`Extension cannot control proxy settings, levelOfControl=${details.levelOfControl}`);
    }
    updateBrowserButton();
}

function setProxySettings(settingsName) {
    if (settingsControlDisabled) {
        console.error("Cannot set proxy settings: extension is not allowed to run in private windows");
        return;
    }
    if (!canControlSettings) {
        console.error("Cannot set proxy settings: another extension is controlling proxy settings");
        return;
    }

    const settings = allSettings[settingsName];
    console.debug(`Set proxy settings '${settingsName}': ${JSON.stringify(settings)}`);

    browser.proxy.settings.set({
        value: settings
    }).then((changed) => {
        if (changed) {
            console.info(`Proxy settings '${settingsName}' set`);
            currentSettingsName = settingsName;
        } else {
            console.error("Cannot set proxy settings");
            canControlSettings = false;
        }
        updateBrowserButton();
    }).catch((error) => {
        console.error(`Cannot set proxy settings. ${error}`);
        settingsControlDisabled = true;
        updateBrowserButton();
    });
}

browser.proxy.settings.onChange.addListener((details) => {
    console.info("Proxy settings changed");
    onProxySettingsChanged(details);
});

browser.proxy.settings.get({}).then((details) => {
    onProxySettingsChanged(details);
    setProxySettings(defaultSettingsName); // To take control over proxy settings
});

browser.browserAction.onClicked.addListener(() => {
	console.debug("Browser button clicked");    
    const settingsName = (currentSettingsName === defaultSettingsName) ? proxyEnabledSettingsName : defaultSettingsName;
    setProxySettings(settingsName);
});

console.info("Quick Proxy started");
