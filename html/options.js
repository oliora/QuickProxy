const ProxyType = {
    none: "none",
    AutoDetect: "autoDetect",
    System: "system",
    Manual: "manual",
    AutoConfig: "autoConfig",
};

function makeSettingsBlockHtml(vals) {
return `
    <fieldset id="${vals.settingsName}SettingsBlock">
        <legend>${vals.settingsTitle}</legend>

        <div class="nice-form-group">
            <label for="${vals.settingsName}ProxyType">Proxy type</label>
            <select id="${vals.settingsName}ProxyType" name="${vals.settingsName}ProxyType">
                <option value="none">No proxy</option>
                <option value="autoDetect">Auto-detect proxy settings for this network</option>
                <option value="system">Use system proxy settings</option>
                <option value="manual">Manual proxy configuration</option>
                <option value="autoConfig">Automatic proxy configuration URL</option>
            </select>
        </div>

        <div class="proxy-type-section nice-form-group" id="${vals.settingsName}SectionProxyType-manual">
            <div class="nice-form-group">
                <label for="${vals.settingsName}Http">HTTP proxy</label>
                <input type="text" id="${vals.settingsName}Http" name="${vals.settingsName}Http" />
            </div>
            <div class="nice-form-group">
                <input type="checkbox" id="${vals.settingsName}HttpProxyAll" name="${vals.settingsName}HttpProxyAll" />
                <label for="${vals.settingsName}HttpProxyAll">Also use this proxy for HTTPS</label>
            </div>
            <div class="nice-form-group">
                <label for="${vals.settingsName}Ssl">HTTPS proxy</label>
                <input type="text" id="${vals.settingsName}Ssl" name="${vals.settingsName}Ssl" />
            </div>
            <div class="nice-form-group">
                <label for="${vals.settingsName}Socks">SOCKS proxy</label>
                <input type="text" id="${vals.settingsName}Socks" name="${vals.settingsName}Socks" />
            </div>
            <div class="nice-form-group">
                <input type="radio" id="${vals.settingsName}SocksVersion4" name="${vals.settingsName}SocksVersion" value="4" />
                <label for="${vals.settingsName}SocksVersion4">SOCKS v4</label>
            </div>
            <div class="nice-form-group">
                <input type="radio" id="${vals.settingsName}SocksVersion5" name="${vals.settingsName}SocksVersion" value="5" />
                <label for="${vals.settingsName}SocksVersion5">SOCKS v5</label>
            </div>
        </div>

        <div class="proxy-type-section nice-form-group" id="${vals.settingsName}SectionProxyType-autoConfig">
            <label for="${vals.settingsName}AutoConfigUrl">URL</label>
            <input type="text" placeholder="file:///home/user/proxy.pac" id="${vals.settingsName}AutoConfigUrl" name="${vals.settingsName}AutoConfigUrl" />
        </div>

        <div class="proxy-type-section nice-form-group" id="${vals.settingsName}SectionProxyType-notNone">
            <div class="nice-form-group">
                <label for="${vals.settingsName}Passthrough">No proxy for</label>
                <textarea id="${vals.settingsName}Passthrough" name="${vals.settingsName}Passthrough" rows="5" VALUE=""></textarea>
                <small>
                    A comma-separated list of hosts that shouldn't be proxied.<br />
                    Example: .mozilla.org, .net.nz, example.com:1234, 192.168.1.0/24<br />
                    Connections to localhost, 127.0.0.1, and ::1 are never proxied.
                </small>
            </div>
            <div class="nice-form-group">
                <input type="checkbox" id="${vals.settingsName}AutoLogin" name="${vals.settingsName}AutoLogin" />
                <label for="${vals.settingsName}AutoLogin">Do not prompt for authentication if password is saved</label>
            </div>
            <div class="nice-form-group">
                <input type="checkbox" id="${vals.settingsName}ProxyDNS" name="${vals.settingsName}ProxyDNS" />
                <label for="${vals.settingsName}ProxyDNS">Proxy DNS when using SOCKS</label>
            </div>
        </div>
    </fieldset>`;
}

const settingsBlocks = [
    {
        settingsTitle: "Default proxy settings",
        settingsName: "default"
    },
    {
        settingsTitle: "QuickProxy proxy settings",
        settingsName: "quick-proxy"
    }
]

const settingsTarget = document.querySelector("#proxy-settings");
let settingsHtml = "";
for (const settingsBlock of settingsBlocks) {
    settingsHtml += makeSettingsBlockHtml(settingsBlock);
}
settingsTarget.innerHTML = settingsHtml;

////////////////////////////////////////////////////////////////

function setFormProxyType(settingsName, proxyType) {
    const sections = document.querySelectorAll(`#${settingsName}SettingsBlock > .proxy-type-section`);
    sections.forEach((e) => {
        const sectionId = e.id;
        const visible = (sectionId === `${settingsName}SectionProxyType-${proxyType}`
            || (proxyType !== "none" && sectionId === `${settingsName}SectionProxyType-notNone`));
        e.hidden = !visible;
    });
}

function setFormValues(proxySettings) {
    for (const settingsBlock of settingsBlocks) {
        const settingsName = settingsBlock.settingsName;
        const settings = proxySettings[settingsName];

        console.debug(`Loading '${settingsName}': ${JSON.stringify(settings)}`);

        document.getElementById(`${settingsName}Http`).value = settings.http;
        document.getElementById(`${settingsName}HttpProxyAll`).checked = settings.httpProxyAll;
        document.getElementById(`${settingsName}Ssl`).value = settings.ssl;
        document.getElementById(`${settingsName}Socks`).value = settings.socks;
        document.querySelector(`#${settingsName}SettingsBlock input[name="${settingsName}SocksVersion"][value="${settings.socksVersion}"]`).checked = true;
        document.getElementById(`${settingsName}AutoConfigUrl`).value = settings.autoConfigUrl;
        document.getElementById(`${settingsName}Passthrough`).value = settings.passthrough;
        document.getElementById(`${settingsName}AutoLogin`).checked = settings.autoLogin;
        document.getElementById(`${settingsName}ProxyDNS`).checked = settings.proxyDNS;
        document.getElementById(`${settingsName}ProxyType`).value = settings.proxyType;

        setFormProxyType(settingsName, settings.proxyType);
    }    
}

function getFormValues() {
    const proxySettings = {};
    for (const settingsBlock of settingsBlocks) {
        const settingsName = settingsBlock.settingsName;
        const settings = {};

        settings.http = document.getElementById(`${settingsName}Http`).value;
        settings.httpProxyAll = document.getElementById(`${settingsName}HttpProxyAll`).checked;
        settings.ssl = document.getElementById(`${settingsName}Ssl`).value;
        settings.socks = document.getElementById(`${settingsName}Socks`).value;
        settings.socksVersion = Number(document.querySelector(`#${settingsName}SettingsBlock input[name="${settingsName}SocksVersion"]:checked`).value);
        settings.autoConfigUrl = document.getElementById(`${settingsName}AutoConfigUrl`).value;
        settings.passthrough = document.getElementById(`${settingsName}Passthrough`).value;
        settings.autoLogin = document.getElementById(`${settingsName}AutoLogin`).checked;
        settings.proxyDNS = document.getElementById(`${settingsName}ProxyDNS`).checked;
        settings.proxyType = document.getElementById(`${settingsName}ProxyType`).value;

        console.debug(`Saving '${settingsName}: ${JSON.stringify(settings)}'`);
        proxySettings[settingsName] = settings;
    }
    return proxySettings;
}

async function loadSettings() {
    console.debug('LoadSettings');
    const { proxySettings } = (await browser.storage.local.get(["proxySettings"]));
    if (proxySettings) {
        setFormValues(proxySettings);
    }
    document.getElementById("button-reset").disabled = true;
    document.getElementById("button-submit").disabled = true;
}

async function saveSettings() {
    console.debug('SaveSettings');
    const proxySettings = getFormValues();
    await browser.storage.local.set({
        proxySettings,
    });
    document.getElementById("button-reset").disabled = true;
    document.getElementById("button-submit").disabled = true;
}

async function onStorageSettingsChanged(changes) {
    const proxySettings = changes.proxySettings?.newValue;
    if (proxySettings) {
        console.debug('onStorageSettingsChanged');
        setFormValues(proxySettings);
    }
}

async function initPage() {
    console.debug("InitPage");

    for (const block of settingsBlocks) {
        document.getElementById(`${block.settingsName}ProxyType`).addEventListener("change", (event) => {
            setFormProxyType(block.settingsName, event.target.value);
        });
        setFormProxyType(block.settingsName, "none");
    }
    document.querySelector("form").addEventListener("submit", (event) => {
        event.preventDefault();
        saveSettings();
    });
    document.querySelector("form").addEventListener("reset", (event) => {
        event.preventDefault();
        loadSettings();
    });
    document.querySelector("form").addEventListener("input", (event) => {
        document.getElementById("button-reset").disabled = false;
        document.getElementById("button-submit").disabled = false;
    });

    const isAllowedIncognitoAccess = await browser.extension.isAllowedIncognitoAccess();
    document.getElementById("error").hidden = isAllowedIncognitoAccess;

    loadSettings();
}

document.addEventListener("DOMContentLoaded", () => {
    initPage();
});
browser.storage.local.onChanged.addListener((changes) => {
    onStorageSettingsChanged(changes);
});
