/*
    Proxy settings
    ==============

    https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/proxy/settings

    autoConfigUrl
        string. A URL to use to configure the proxy.

    autoLogin
        boolean. Don't prompt for authentication if the password is saved. Defaults to false.

    http
        string. The address of the HTTP proxy. Can include a port.

    httpProxyAll
        boolean. Use the HTTP proxy server for all protocols. Defaults to false.

    passthrough
        string. A comma-separated list of hosts that shouldn't be proxied. Can be defined as:

            HOST_NAME[:PORT], for example: example.com or example.com:1234
            IP_LITERAL[:PORT]
            IP_LITERAL/PREFIX_LENGTH_IN_BITS, using CIDR notation
            <local>, to bypass proxying for all hostnames that don't contain periods.

        You can use IPv6 addresses. For example, [::123].

        Hosts localhost, 127.0.0.1, and [::1] are never proxied.

    proxyDNS
        boolean. Whether to proxy DNS when using a SOCKS proxy. Defaults to true when using SOCKS5 and false when using SOCKS4. Prior to Firefox 128, it defaulted to false for SOCKS4 and SOCKS5.

    proxyType
        string. The type of proxy to use. This may take: "none", "autoDetect", "system", "manual", "autoConfig". Defaults to "system".

    socks
        string. The address of the SOCKS proxy. Can include a port.

    socksVersion
        integer. The version of the SOCKS proxy. May be 4 or 5. Defaults to 5.

    ssl
        string. The address of the TLS/SSL proxy. Can include a port.
*/

const defaultSettingsName = "default";
const quickProxySettingsName = "quick-proxy";

// Global state
const quickProxy = {
    proxySettings: undefined,
    currentSettingsName: undefined,
    isAllowedIncognitoAccess: true,
    canControlSettings: true,
};

async function disableBrowserAction(title) {
    browser.action.disable();
    browser.action.setTitle({
        title: title,
    });
    await browser.action.setIcon({});
}

async function setBrowserActionError(title) {
    browser.action.setTitle({
        title: title,
    });
    await browser.action.setIcon({
        path: {
            48: "icons/app-error.svg"
        }
    });
    browser.action.enable();
}

async function setBrowserAction(active) {
    if (active) {
        browser.action.setTitle({
            title: `QuickProxy active (using QuickProxy proxy configuration)`
        });
        await browser.action.setIcon({
            path: {
                48: "icons/app-active.svg"
            }
        });
    } else {
        browser.action.setTitle({
            title: `QuickProxy inactive (using Default proxy configuration)`
        });
        await browser.action.setIcon({});
    }
    browser.action.enable();
}

async function updateBrowserAction() {
    if (!quickProxy.isAllowedIncognitoAccess) {
        await setBrowserActionError("QuickProxy is not allowed to run in private windows, click to open settings");
        return;
    }

    if (!quickProxy.canControlSettings) {
        await disableBrowserAction("Quick proxy is disabled because another extension controls proxy settings");
        return;
    }

    await setBrowserAction(!(quickProxy.currentSettingsName === defaultSettingsName));
}

function setIsAllowedIncognitoAccess(allowed) {
    if (!allowed && quickProxy.isAllowedIncognitoAccess) {
        console.error("Extension is not allowed to run in private windows");
    }
    quickProxy.isAllowedIncognitoAccess = allowed;
}

function setLevelOfControl(levelOfControl) {
    const newCanControlSettings = (levelOfControl === "controllable_by_this_extension") || (levelOfControl === "controlled_by_this_extension");
    if (quickProxy.canControlSettings && !newCanControlSettings) {
        console.error(`Extension cannot control proxy settings, levelOfControl=${levelOfControl}`);
    }
    quickProxy.canControlSettings = newCanControlSettings;
}

async function applyProxySettings(settingsName) {
    if (quickProxy.isAllowedIncognitoAccess && quickProxy.canControlSettings) {
        const settings = quickProxy.proxySettings[settingsName]
        console.debug(`Setting browser proxy settings '${settingsName}': ${JSON.stringify(settings)}`);

        try {
            const changed = await browser.proxy.settings.set({
                value: settings
            });

            if (!changed) {
                console.error("Cannot set proxy settings");
                return;
            }

            console.info(`Browser proxy settings set to '${settingsName}': ${JSON.stringify(settings)}`);
            quickProxy.currentSettingsName = settingsName;
            await browser.storage.local.set({
                currentSettingsName: settingsName,
            });
        } catch (error) {
            console.error(`Cannot set proxy settings. ${error}`);
            if (error.message.includes("private browsing")) {
                setIsAllowedIncognitoAccess(false);
            }
        }
    }
}

async function onBrowserProxySettingsChanged(browserSettings) {
    console.info(`Proxy settings changed. levelOfControl:${browserSettings.levelOfControl}, value: ${JSON.stringify(browserSettings.value)}`);

    if (quickProxy.proxySettings === undefined) {
        await restoreOrInitState();
    }

    setLevelOfControl(browserSettings.levelOfControl);
    await updateBrowserAction();
}

async function onStorageSettingsChanged(changes) {
    const proxySettingsChange = changes.proxySettings;
    if (proxySettingsChange == undefined) {
        return;
    }

    const proxySettings = proxySettingsChange.newValue;
    console.debug(`Settings changed: ${JSON.stringify(proxySettings)}`);

    if (quickProxy.proxySettings === undefined || proxySettings === undefined) {
        await restoreOrInitState();
    } else {
        quickProxy.proxySettings = proxySettings;
    }

    await applyProxySettings(quickProxy.currentSettingsName);
    await updateBrowserAction();
}

async function onBrowserActionClicked() {
	console.debug("Browser action clicked");

    if (quickProxy.proxySettings === undefined) {
        await restoreOrInitState();
    }

    if (!quickProxy.isAllowedIncognitoAccess) {
        browser.runtime.openOptionsPage();
        return;
    }

    const settingsName = !(quickProxy.currentSettingsName === defaultSettingsName) ? defaultSettingsName : quickProxySettingsName;
    await applyProxySettings(settingsName);
    await updateBrowserAction();
}

async function restoreOrInitState(isInit = false) {
    console.debug("RestoreOrInitState");

    const browserSettings = await browser.proxy.settings.get({});
    let storedState = await browser.storage.local.get();

    if (storedState.proxySettings === undefined) {
        if (!isInit) {
            console.warn("QuickProxy storage was wiped");
        }
        console.info(`Initializing QuickProxy settings from the browser proxy settings: ${JSON.stringify(browserSettings)}`);

        storedState = {
            currentSettingsName: defaultSettingsName,
            proxySettings: {
                [defaultSettingsName]: Object.assign({}, browserSettings.value),
                [quickProxySettingsName]: Object.assign({}, browserSettings.value),
            },
        }
        await browser.storage.local.set(storedState);
    } else {
        console.info(`Loaded state: ${JSON.stringify(storedState)}`);
    }

    Object.assign(quickProxy, storedState);
    setLevelOfControl(browserSettings.levelOfControl);
    setIsAllowedIncognitoAccess(await browser.extension.isAllowedIncognitoAccess());
}

async function init() {
    console.debug("Init");

    await restoreOrInitState(true);
    await applyProxySettings(quickProxy.currentSettingsName); // Takes control over proxy settings
    await updateBrowserAction();
}

browser.proxy.settings.onChange.addListener((browserSettings) => {
    onBrowserProxySettingsChanged(browserSettings);
});
browser.storage.local.onChanged.addListener((changes) => {
    onStorageSettingsChanged(changes);
});
browser.action.onClicked.addListener(() => {
    onBrowserActionClicked();
});
browser.runtime.onInstalled.addListener(() => {
    init();
});

console.info("QuickProxy started");
