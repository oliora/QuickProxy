// TODO:
// 1. Options page - load and save
// 2. Verify how setting a wrong browser proxy settings work, use red icon to indicate an error
// 3. Open settings page on button click extension is not allowed in private windows mode or config is wrong
//    or QuickProxy config was not set (proxy just initialized)
// 3. ? Verify edited settings
// 4. Release 0.1 version

// 3. If run in private windows is not allowed show a top badge with instruction in preferences
// 4. More than two proxy settings, organaise them in tabs and allow to save each one individually
// 5. Automatically enable quick proxy on VPN connection
//    May require communication with local scripts and "nativeMessaging" permission
//    See e.g. https://kod.ujo.moe/jadedctrl/shellfox

const defaultSettingsName = "default";
const quickProxySettingsName = "quick-proxy";

// Global state
const quickProxy = {
    proxySettings: undefined,
    currentSettingsName: undefined,
    isAllowedIncognitoAccess: true,
    canControlSettings: true,
    isConfigured: false,
};

async function disableBrowserAction(reason) {
    browser.action.disable();
    browser.action.setTitle({
        title: `QuickProxy error: ${reason}`
    });
    await browser.action.setIcon({});
}

async function setBrowserAction(active) {
    if (active) {
        browser.action.setTitle({
            title: `QuickProxy active (using QuickProxy proxy settings)`
        });
        await browser.action.setIcon({
            path: {
                48: "icons/app-active.svg"
            }
        });
    } else {
        browser.action.setTitle({
            title: `QuickProxy inactive (using Default proxy settings)`
        });
        await browser.action.setIcon({});
    }

    browser.action.enable();
}

async function updateBrowserAction() {
    if (!quickProxy.isAllowedIncognitoAccess) {
        await disableBrowserAction("QuickProxy extension is not allowed to run in private windows (enable in QuickProxy extension details)");
        return;
    }

    if (!quickProxy.canControlSettings) {
        await disableBrowserAction("Extension other than QuickProxy controls proxy settings");
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
    console.info(`Proxy settings changed: ${JSON.stringify(details.value)}`);

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
            console.warn("QuickProxy storage was wiped or corrupted");
        }
        console.info(`Initializing QuickProxy settings from the browser proxy settings: ${JSON.stringify(browserSettings)}`);

        storedState = {
            currentSettingsName: defaultSettingsName,
            proxySettings: {
                [defaultSettingsName]: Object.assign({}, browserSettings.value),
                [quickProxySettingsName]: Object.assign({}, browserSettings.value),
            },
            isConfigured: false,
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

browser.proxy.settings.onChange.addListener(onBrowserProxySettingsChanged);
browser.storage.local.onChanged.addListener(onStorageSettingsChanged);
browser.action.onClicked.addListener(onBrowserActionClicked);
browser.runtime.onInstalled.addListener(init);

console.info("QuickProxy started");
