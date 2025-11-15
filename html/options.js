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

// defaults, note differences in proxyDNS depending on socks version

const ProxyType = {
    None: "None",
    AutoDetect: "AutoDetect",
    System: "System",
    Manual: "Manual",
    AutoConfig: "AutoConfig",
};

function makeSettingsBlockHtml(vals) {
return `
    <fieldset id="${vals.settingsName}SettingsBlock">
        <legend>${vals.settingsTitle}</legend>

        <div class="nice-form-group">
            <label for="${vals.settingsName}ProxyType">Proxy type</label>
            <select id="${vals.settingsName}ProxyType" name="${vals.settingsName}ProxyType">
                <option value="None">No proxy</option>
                <option value="AutoDetect">Auto-detect proxy settings for this network</option>
                <option value="System">Use system proxy settings</option>
                <option value="Manual">Manual proxy configuration</option>
                <option value="AutoConfig">Automatic proxy configuration URL</option>
            </select>
        </div>

        <div class="proxy-type-section nice-form-group" id="${vals.settingsName}SectionProxyTypeManual">
            <div class="nice-form-group">
                <label for="${vals.settingsName}Http">HTTP proxy</label>
                <input type="text" id="${vals.settingsName}Http" name="${vals.settingsName}Http" />
            </div>
            <div class="nice-form-group">
                <input type="checkbox" id="${vals.settingsName}HttpProxyAll" name="${vals.settingsName}HttpProxyAll" />
                <label for="${vals.settingsName}HttpProxyAll">Also use this proxy for HTTPS</label>
            </div>
            <div class="nice-form-group">
                <label for="${vals.settingsName}Http">HTTPS proxy</label>
                <input type="text" id="${vals.settingsName}Ssl" name="${vals.settingsName}Ssl" />
            </div>
            <div class="nice-form-group">
                <label for="${vals.settingsName}Http">SOCKS proxy</label>
                <input type="text" id="${vals.settingsName}Socks" name="${vals.settingsName}Socks" />
            </div>
            <div class="nice-form-group">
                <input type="radio" id="${vals.settingsName}SocksVersion4" name="${vals.settingsName}SocksVersion" value="none" />
                <label for="${vals.settingsName}SocksVersion4">SOCKS v4</label>
            </div>
            <div class="nice-form-group">
                <input type="radio" id="${vals.settingsName}SocksVersion5" name="${vals.settingsName}SocksVersion" value="none" />
                <label for="${vals.settingsName}SocksVersion5">SOCKS v5</label>
            </div>
        </div>

        <div class="proxy-type-section nice-form-group" id="${vals.settingsName}SectionProxyTypeAutoConfig">
            <label for="${vals.settingsName}AutoConfigUrl">URL</label>
            <input type="text" placeholder="file:///home/user/proxy.pac" id="${vals.settingsName}AutoConfigUrl" name="${vals.settingsName}AutoConfigUrl" />
        </div>

        <div class="proxy-type-section nice-form-group" id="${vals.settingsName}SectionProxyTypeNotNone">
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
        settingsName: "quickProxy"
    }
]

const settingsTarget = document.querySelector("#proxy-settings");
let settingsHtml = "";
for (const settingsBlock of settingsBlocks) {
    settingsHtml += makeSettingsBlockHtml(settingsBlock);
}
settingsTarget.innerHTML = settingsHtml;

function restoreOptions() {
    console.debug('restoreOptions');
    //alert("restore");
}

function saveOptions(e) {
    console.debug('saveOptions');
    e.preventDefault();
    alert("save");
}

function updateUiOnProxyTypeChanged(settingsName, proxyType) {
    console.log(`Update sections, settingsName=${settingsName}, proxyType=${proxyType}`);
    const sections = document.querySelectorAll(`#${settingsName}SettingsBlock > .proxy-type-section`);
    sections.forEach((e) => {
        const sectionId = e.id;
        const visible = (sectionId === `${settingsName}SectionProxyType${proxyType}`
            || (proxyType !== "None" && sectionId === `${settingsName}SectionProxyTypeNotNone`));
        e.hidden = !visible;
    });
}

function onProxyTypeChanged(event, settingsName) {
    const proxyType = event.target.value;
    updateUiOnProxyTypeChanged(settingsName, proxyType);
}

function init() {
    console.debug("init");

    for (const block of settingsBlocks) {
        document.getElementById(`${block.settingsName}ProxyType`).addEventListener("change", (e) => onProxyTypeChanged(e, block.settingsName));
        updateUiOnProxyTypeChanged(block.settingsName, "None");
    }
    document.querySelector("form").addEventListener("submit", saveOptions);

    restoreOptions();
}

document.addEventListener("DOMContentLoaded", init);