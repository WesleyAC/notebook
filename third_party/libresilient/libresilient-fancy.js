/* ========================================================================= *\
|* === Basic utils useful only in browser window                         === *|
\* ========================================================================= */

// create an object to hold everything that needs to be held globally
var libresilient = {
    info: {},
    status: false,
    contentUnavailable: false,
    cacheStale: false,
    clientId: null
}

// some basic method stats
libresilient.methodStats = {}
// UI elements displaying the status for each local resource URL
libresilient.resourceDisplays = {}


/**
 * creating a safe CSS class name from a string
 */
libresilient.safeClassName = (name) => {
    return encodeURIComponent(name.toLowerCase()).replace(/%[0-9A-F]{2}/gi,'-')
}


/**
 * creating the standalone LibResilient UI
 */
libresilient.addUI = () => {
    var uiTemplate = document.createElement('template')
    uiTemplate.innerHTML = `<div id="libresilient-ui">
    <div class="libresilient-message-container"></div>
    <div id="libresilient-ui-container" class="libresilient-status-service-worker">
        <input type="checkbox" id="libresilient-ui-toggle"/>
        <div class="libresilient-description">
            <p><a href="https://resilient.is/">LibResilient</a> is a tool that helps keep websites up without centralized CDNs.<br/>If you are seeing this it means some content is unavailable.<br/>LibResilient will attempt to get it for you anyway.</p>
            <div class="libresilient-status-display"></div>
        </div>
        <label for="libresilient-ui-toggle" class="libresilient-toggle"><div></div></label>
    </div></div>`
    var uiStyle = document.createElement('style')
    uiStyle.innerHTML = `#libresilient-ui {
            display:flex;
            align-items: flex-end;
            flex-direction:column-reverse;
            flex-wrap:nowrap;
            position:fixed;
            top:0px;
            right:0px;
            visibility:hidden;
            z-index: 1000;
        }
        #libresilient-ui.content-unavailable,
        #libresilient-ui:target {
            visibility:visible;
        }
        #libresilient-ui .libresilient-message-container {
        }
        #libresilient-ui .libresilient-message {
            font-size:90%;
            text-align:center;
            background:#dfd;
            border-radius:1em;
            box-shadow:0px 0px 3px #dfd;
            padding:0.5em 2em 0.5em 1em;
            transition: ease-in 0.5s opacity;
            opacity: 1;
            position: relative;
            top:16px;
            right:5px;
            color: #060;
            text-shadow: 0px 0px 2px white;
            font-family: sans;
        }
        #libresilient-ui .libresilient-message::after {
            display: block;
            content: "x";
            position: absolute;
            right: 0.5em;
            top: 0.7em;
            font-size:90%;
            border-radius: 100%;
            width: 1em;
            height: 1em;
            line-height: 0.8em;
            padding-left: 0.01em;
            box-shadow: inset 0px 0px 2px #080;
            transition: ease-in 0.5s color, ease-in 0.5s background-color, ease-in 0.5s box-shadow-color;
            color: #080;
            background:white;
        }
        #libresilient-ui .libresilient-message:hover::after {
            background: #080;
            color: white;
            box-shadow: inset 0px 0px 2px black;
        }
        #libresilient-ui .libresilient-message:first-child::before {
            display:block;
            content:" ";
            width:1em;
            height:1em;
            position:absolute;
            right:1em;
            top:-0.5em;
            background:#dfd;
            box-shadow:0px 0px 3px #dfd;
            transform: rotate(45deg);
            z-index:-1;
        }
        #libresilient-ui-container {
            background:#ddd;
            box-shadow:0px 0px 3px black;
            border-bottom-left-radius:30px;
            padding: 4px 4px 8px 8px;
            display:flex;
            flex-wrap:nowrap;
        }
        #libresilient-ui-container .libresilient-toggle {
            width:32px;
            height:32px;
            background:url('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5MCA5MCIgeD0iMHB4IiB5PSIwcHgiPjx0aXRsZT5iYWxsMjwvdGl0bGU+PGcgZGF0YS1uYW1lPSJMYXllciAyIj48cGF0aCBkPSJNOTIuMTQsMzkuMjZhNDEuOCw0MS44LDAsMCwwLTEuMjktNUE0NSw0NSwwLDEsMCw0Ny40Nyw5M0g0OGE0NC4zNSw0NC4zNSwwLDAsMCw0LjY0LS4yNEE0NS4wNyw0NS4wNywwLDAsMCw5Myw0OCw0NC4yMSw0NC4yMSwwLDAsMCw5Mi4xNCwzOS4yNlpNMjksMjQuMTZBMzAuMzgsMzAuMzgsMCwwLDAsMTcuNTEsNDhhMi40MSwyLjQxLDAsMSwxLTQuODEsMEEzNS4xNCwzNS4xNCwwLDAsMSwyNiwyMC40MWEyLjQsMi40LDAsMSwxLDMsMy43NVptMTktNi42NWEzMC40NiwzMC40NiwwLDAsMC0xMC4yOSwxLjc3LDIuMjgsMi4yOCwwLDAsMS0uODEuMTUsMi40MSwyLjQxLDAsMCwxLS44MS00LjY4QTM1LjM4LDM1LjM4LDAsMCwxLDQ4LDEyLjdhMi40MSwyLjQxLDAsMSwxLDAsNC44MVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC0zIC0zKSI+PC9wYXRoPjwvZz48L3N2Zz4=') center center no-repeat;
            display: block;
            background-size:contain;
        }
        #libresilient-ui-container .libresilient-toggle > div {
            width:100%;
            height:100%;
            background:url('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjRjk3OTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNTIgNTIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDUyIDUyIiB4bWw6c3BhY2U9InByZXNlcnZlIj48Zz48Zz48cGF0aCBkPSJNMzYsMTEuMDI5NzU0Nmg3LjM2MjYwOTljLTAuMDc3ODgwOS0wLjEwMDIxOTctMC4xNTExODQxLTAuMjAzMzA4MS0wLjI0MjYxNDctMC4yOTQ3Mzg4bC03LjgyOTk1NjEtNy44MzAwMTcxICAgIEMzNS4yMDA4MDU3LDIuODE1NzY1NCwzNS4wOTg3NTQ5LDIuNzQzNDM4NywzNSwyLjY2NjcxNzV2Ny4zNjMwMzcxQzM1LDEwLjU4MTAyNDIsMzUuNDQ4NzMwNSwxMS4wMjk3NTQ2LDM2LDExLjAyOTc1NDZ6Ij48L3BhdGg+PC9nPjxnPjxwYXRoIGQ9Ik0zNiwxMy4wMjk3NTQ2Yy0xLjY1NDI5NjksMC0zLTEuMzQ1NzAzMS0zLTNWMi4wMjQ5OTM5SDExYy0xLjY0OTk2MzQsMC0zLDEuMzUwMDM2Ni0zLDN2NDEuOTUwMDEyMiAgICBjMCwxLjY2MDAzNDIsMS4zNTAwMzY2LDMsMywzaDMwYzEuNjUwMDI0NCwwLDMtMS4zMzk5NjU4LDMtM1YxMy4wMjk3NTQ2SDM2eiBNMjEsMTkuMDAyODk5MmgxMHYySDIxVjE5LjAwMjg5OTJ6IE0zMSw0My4wMDMzODc1ICAgIEgyMXYtMmgxMFY0My4wMDMzODc1eiBNMzcsMzYuMDAzMzg3NUgxNXYtMmgyMlYzNi4wMDMzODc1eiBNMzcsMjguMDAyODk5MkgxNXYtMmgyMlYyOC4wMDI4OTkyeiI+PC9wYXRoPjwvZz48L2c+PC9zdmc+') center center no-repeat;
            display: block;
            background-size:50% 50%;
        }
        #libresilient-ui-container.active .libresilient-toggle {
            animation-name: libresilient-ball-rolling;
            animation-duration:10s;
            animation-iteration-count: infinite;
            animation-timing-function: linear;
        }
        #libresilient-ui-container #libresilient-ui-toggle {
            display:none;
        }
        #libresilient-ui-container > div {
            display:none;
        }
        #libresilient-ui-container > #libresilient-ui-toggle:checked ~ div {
            display:block;
        }
        #libresilient-ui-container .libresilient-description > p {
            font-size:80%;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
            margin-right: 1em;
            text-align: right;
            text-shadow: -1px -1px 0px #ccc, 1px 1px 0px #eee;
            color: #666;
            font-family: sans-serif;
        }
        #libresilient-ui-container .libresilient-description > p a {
            color: #d70;
        }
        #libresilient-ui-container .libresilient-status-display {
            justify-content: right;
            display: flex;
            padding-right: 0.5em;
        }
        /*
         * these will be useful also outside the #libresilient-ui
         * for example, if there is a .libresilient-status-display in the page's HTML
         */
        .libresilient-status-display > li {
            display:inline-block;
            font-size:80%;
            font-family: Monospace;
        }
        .libresilient-status-element {
            font-weight: bold;
            display: inline-block;
            text-align: center;
            text-decoration:none;
            background:#bbb;
            padding:0.4em 1em;
            border-radius:0.6em;
            color:#777;
            box-shadow: inset 0px 0px 3px #777;
            margin: 0.5em;
            transition: background-color 1s ease, color 1s ease, box-shadow 1s ease;
        }
        .libresilient-status-element.active {
            box-shadow: 0px 0px 3px #f80, 0px 0px 3px #a60;
            color: #fff;
            background: #e70;
        }
        @keyframes libresilient-ball-rolling {
            from {transform:rotate(0deg)}
            to {transform:rotate(359deg)}
        }`
    document.head.insertAdjacentElement('afterbegin', uiStyle)
    document.body.insertAdjacentElement('afterbegin', uiTemplate.content.firstChild)
}


/**
 * internal logging facility
 * 
 * component - name of the component being logged about
 * items     - the rest of arguments will be passed to console.debug()
 */
self.log = function(component, ...items) {
    console.debug(`LibResilient [COMMIT_UNKNOWN, ${component}] ::`, ...items)
}


/**
 * fetched resource display element
 */
libresilient.addFetchedResourceElements = (url, fetchedResourcesDisplays) => {
    // make sure we have the container element to work with
    if (typeof fetchedResourcesDisplays !== 'object') {
        fetchedResourcesDisplays = document.getElementsByClassName("libresilient-fetched-resources-list")
    }
    var itemHTML = `<li class="libresilient-fetched-resources-item"><label>`
    var foundSuccess = false
    var pluginsHTML = ''
    Object.keys(libresilient.methodStats).forEach((plugin)=>{
        var pclass = libresilient.safeClassName(plugin)
        if (typeof libresilient.info[url] !== "undefined" && typeof libresilient.info[url][plugin] !== "undefined") {
            pclass = pclass + ' ' + libresilient.info[url][plugin].state;
            foundSuccess = foundSuccess || (libresilient.info[url][plugin].state === "success")
        }
        pluginsHTML += `<span class="libresilient-fetched-resource-method ${pclass}">${plugin}</span>`
    })
    itemHTML += `<input type="checkbox" ${ foundSuccess ? 'checked="checked"' : 'disabled="disabled"' }/><span class="libresilient-fetched-resource-url"><span>${url}</span></span>${pluginsHTML}</label></li>`;
    var item = document.createElement('template')
    item.innerHTML = itemHTML;
    libresilient.resourceDisplays[url] = new Array()
    for (let frd of fetchedResourcesDisplays) {
        libresilient.resourceDisplays[url].push( 
            frd.insertAdjacentElement('beforeend', item.content.firstChild.cloneNode(true))
        )
    }
}


/**
 * creating/updating fetched resources data
 */
libresilient.updateFetchedResources = () => {
    // getting these elements once instead of once per URL...
    var fetchedResourcesDisplays = document.getElementsByClassName("libresilient-fetched-resources-list")
    Object.keys(libresilient.info).forEach((url)=>{
        
        // simplify
        var si = libresilient.info[url]
        
        // if there are no status display elements for this URL...
        if (typeof libresilient.resourceDisplays[url] === 'undefined') {
            // ...create the elements
            libresilient.addFetchedResourceElements(url, fetchedResourcesDisplays)
        
        // otherwise, if si.method evaluates to true (i.e. is not an empty string nor null in this case)
        } else {
            // libresilient.methodStats has the most comprehensive list of methods used
            Object.keys(libresilient.methodStats).forEach((method)=>{
                var pclass = libresilient.safeClassName(method);
                var foundSuccess = false

                // handle per-resource displays
                // TODO: this needs to be done in a more efficient and elegant way
                for (let rdisplay of libresilient.resourceDisplays[url]) {
                    // if we don't seem to have a display for this method in this resource displa...
                    if (rdisplay.getElementsByClassName(pclass).length == 0) {
                        var method_class = pclass
                        if (typeof libresilient.info[url] !== "undefined" && typeof libresilient.info[url][method] !== "undefined") {
                            method_class += ' ' + libresilient.info[url][method].state;
                        }
                        var method_item = document.createElement('template')
                        method_item.innerHTML = `<span class="libresilient-fetched-resource-method ${method_class}">${method}</span>`
                        rdisplay.childNodes[0].insertAdjacentElement('beforeend', method_item.content.firstChild.cloneNode(true))
                    }
                }

                // do we have the method even?
                if (typeof si[method] === "object") {
                    // is this a success?
                    if (si[method].state === "success") {
                        for (let rdisplay of libresilient.resourceDisplays[url]) {
                            if (! rdisplay.getElementsByClassName(pclass)[0].classList.contains('success')) {
                                // make sure the right classes are on
                                rdisplay.getElementsByClassName(pclass)[0].classList.remove('running')
                                rdisplay.getElementsByClassName(pclass)[0].classList.add('success')
                                // make sure the checkbox is checked
                                rdisplay.getElementsByTagName('input')[0].checked = true
                                rdisplay.getElementsByTagName('input')[0].disabled = false
                            }
                        }
                    // is this a running thing?
                    } else if (si[method].state === "running") {
                        for (let rdisplay of libresilient.resourceDisplays[url]) {
                            if (! rdisplay.getElementsByClassName(pclass)[0].classList.contains('running')) {
                                // make sure the right classes are on
                                rdisplay.getElementsByClassName(pclass)[0].classList.remove('success')
                                rdisplay.getElementsByClassName(pclass)[0].classList.add('running')
                            }
                        }
                    // nope, an error presumably
                    } else {
                        for (let rdisplay of libresilient.resourceDisplays[url]) {
                            // make sure the right classes are on
                            rdisplay.getElementsByClassName(pclass)[0].classList.remove('success')
                            rdisplay.getElementsByClassName(pclass)[0].classList.remove('running')
                        }
                    }
                // clarly this method has not even been used for the resource
                } else {
                    for (let rdisplay of libresilient.resourceDisplays[url]) {
                        // make sure the right classes are on
                        rdisplay.getElementsByClassName(pclass)[0].classList.remove('success')
                        rdisplay.getElementsByClassName(pclass)[0].classList.remove('running')
                    }
                }
            })
        }
    })
}


/**
 * adding status display per plugin
 *
 * plugin      - plugin name
 * description - plugin description (optional; default: empty string)
 * status      - status text (optional; default: number of resources fetched
 *               using this plugin, based on methodStats)
 */
libresilient.addPluginStatus = (plugin, description='', status=null) => {
    self.log('browser-side', 'addPluginStatus(' + plugin + ')')
    var statusDisplays = document.getElementsByClassName("libresilient-status-display");
    var pclass = libresilient.safeClassName(plugin);
    var pcount = 0;
    if (typeof libresilient.methodStats[plugin] !== 'undefined') {
        pcount = libresilient.methodStats[plugin];
    }
    // handle the status displays
    for (let sd of statusDisplays) {
        sd.insertAdjacentHTML('beforeend', `<li><abbr class="libresilient-status-element ${pcount ? 'active' : ''} libresilient-status-${pclass}" title="${description}">${plugin}: <span class="status">${status ? status : pcount}</span></abbr></li>`)
    }
}


/**
 * updating status display per plugin
 *
 * expects an object that contains at least `name` attribute
 */
libresilient.updatePluginStatus = (plugin) => {
    //self.log('browser-side', 'updatePluginStatus :: ' + plugin)
    var pclass = libresilient.safeClassName(plugin);
    //self.log('browser-side', 'updatePluginStatus :: pclass: ' + pclass)
    var statusDisplay = document.querySelectorAll(".libresilient-status-" + pclass + " > .status");
    //self.log('browser-side', 'updatePluginStatus :: statusDisplay: ' + typeof statusDisplay)
    var pcount = 0;
    if (typeof libresilient.methodStats[plugin] !== 'undefined') {
        pcount = libresilient.methodStats[plugin]
    }
    for (let statusDisplay of document.querySelectorAll(".libresilient-status-" + pclass + " > .status")) {
        statusDisplay.innerText = pcount
        if ( (pcount === 0) && statusDisplay.parentElement.classList.contains('active')) {
            statusDisplay.parentElement.classList.remove('active')
        } else if ( (pcount > 0) && ! statusDisplay.parentElement.classList.contains('active')) {
            statusDisplay.parentElement.classList.add('active')
        }
    }
}


/**
 * toggling resource checkboxes (only if not disabled)
 */
libresilient.toggleResourceCheckboxes = () => {
    document.querySelectorAll('.libresilient-fetched-resources-item input')
        .forEach((el)=>{ 
            el.checked = ! el.disabled && ! el.checked
        })
}


/**
 * stashing and unstashing resources
 * 
 * stash param means "stash" if set to true (the default), "unstash" otherwise
 */
libresilient.stashOrUnstashResources = (stash=true) => {
    // what are we doing?
    var operation = {
        clientId: libresilient.clientId
    }
    // get the resources
    var resources = []
    document
        .querySelectorAll('.libresilient-fetched-resources-item input:checked')
        .forEach((el)=>{
            resources.push(el.parentElement.querySelector('.libresilient-fetched-resource-url').innerText)
        })
    if (stash) {
        operation.stash = [resources]
        self.log('browser-side', 'Calling `stash()` on the service worker to stash the resources...')
    } else {
        operation.unstash = [resources]
        self.log('browser-side', 'Calling `unstash()` on the service worker to unstash the resources...')
    }
    // RPC call on the service worker
    return navigator
            .serviceWorker
            .controller
            .postMessage(operation)
}


/**
 * publishing certain resources to Gun and IPFS
 */
libresilient.publishResourcesToGunAndIPFS = () => {
    var user = document.getElementById('libresilient-gun-user').value
    var pass = document.getElementById('libresilient-gun-password').value
    if (! user || ! pass) {
        throw new Error("Gun user/password required!")
    }
    var resources = []
    document.querySelectorAll('.libresilient-fetched-resources-item input:checked')
        .forEach((el)=>{
            resources.push(el.parentElement.querySelector('.libresilient-fetched-resource-url').innerText)
        })
    // call it!
    self.log('browser-side', 'Calling `publish()` on the service worker to publish the resources...')
    return navigator
            .serviceWorker
            .controller
            .postMessage({
                clientId: libresilient.clientId,
                publish: [resources, user, pass]
            })
}


/**
 * display a LibResilient message
 */
libresilient.displayMessage = (msg) => {
    // prepare the template
    var messageBox = document.createElement('template')
    messageBox.innerHTML = `<div class="libresilient-message">${msg}</div>`
    // attach it to all libresilient-message-containers out there
    for (let smc of document.getElementsByClassName('libresilient-message-container')) {
        var msg_clone = messageBox.content.firstChild.cloneNode(true)
        msg_clone.onclick = (e) => {
            e.target.style.opacity=0
            setTimeout(()=>{e.target.remove()}, 1000)
        }
        smc.insertAdjacentElement('beforeend', msg_clone)
        setTimeout(()=>{
            msg_clone.style.opacity=0
            setTimeout(()=>{msg_clone.remove()}, 1000)
        }, 5000)
    }
    self.log('browser-side', '    +-- message shown!')
}

/**
 * onload handler just to mark stuff as loaded
 * for purposes of informing the user all is loaded
 * when service worker messages us about it
 */
window.addEventListener('load', function() {
    libresilient.status = "loaded";
    // was any content unavailable so far?
    if (libresilient.contentUnavailable) {
        libresilient.displayMessage('Some content seems unavailable. Attempting to retrieve it via LibResilient.')
    }
})

self.log('browser-side', 'DOMContentLoaded!')

// add the generic service worker "badge"
libresilient.addUI()
libresilient.addPluginStatus('service worker', 'A service worker is an event-driven worker that intercepts fetch events.', 'no')

/* ========================================================================= *\
|* === Service worker setup                                              === *|
\* ========================================================================= */

if ('serviceWorker' in navigator) {
    
    if (navigator.serviceWorker.controller) {
        // Service worker already registered.
        self.log('browser-side', 'Service Worker already registered.')
    } else {
        var scriptPath = document.currentScript.src
        var scriptFolder = scriptPath.substr(0, scriptPath.lastIndexOf( '/' )+1 )
        var serviceWorkerPath = scriptFolder + 'service-worker.js'
        self.log('browser-side', 'Service Worker script at: ' + serviceWorkerPath)
        // TODO: is there a way to provide config params for the Service Worker here?
        // TODO: it would be good if the config.json file could reside outside of the libresilient directory
        // TODO: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
        navigator.serviceWorker.register(serviceWorkerPath, {
            // TODO: what is the scope relative to? is it the HTML file that included it, or this script?
            // TODO: "It is relative to the base URL of the application." ¯\_(ツ)_/¯
            // TODO: "There is frequent confusion surrounding the meaning and use of scope.
            // TODO:  Since a service worker can't have a scope broader than its own location,
            // TODO:  only use the scope option when you need a scope that is narrower than the default."
            scope: './'
        }).then(function(reg) {
            // Success.
            self.log('browser-side', 'Service Worker registered.')
        }).catch(error => {
            self.log('browser-side', "Error while registering a service worker: ", error)
        })
    }
    
    // handling the messages from ServiceWorker
    navigator.serviceWorker.addEventListener('message', event => {
        
        self.log('browser-side', 'LibResilientInfo received!')
        if (event.data.url) {
            self.log('browser-side', '+-- for:', event.data.url)
            if (event.data.method) {
                self.log('browser-side', '    +-- method:', event.data.method)
                self.log('browser-side', '    +-- state :', event.data.state)
                libresilient.info[event.data.url] = libresilient.info[event.data.url] || {}
                libresilient.info[event.data.url][event.data.method] = event.data
                // update method stats
                if (typeof libresilient.methodStats[event.data.method] === 'undefined') {
                    // setup the stats
                    libresilient.methodStats[event.data.method] = 0
                    // but also we now know this method has not been seen before
                    // so set-up the plugin status display
                    libresilient.addPluginStatus(event.data.method)
                }
                if (event.data.state === "success") {
                    libresilient.methodStats[event.data.method]++
                    self.log('browser-side', '        +-- methodStats incremented to:', libresilient.methodStats[event.data.method])
                    libresilient.updatePluginStatus(event.data.method)
                
                // if the method was `fetch`, and that was the first method, and the outcome is `error`, we *might* be down
                } else if ( event.data.state === "error"
                         && event.data.method === "fetch"
                         && Object.keys(libresilient.info[event.data.url]).length === 1
                         && Object.keys(libresilient.info[event.data.url])[0] === "fetch" ) {
                    // we seem to be down
                    document.getElementById('libresilient-ui').classList.add('content-unavailable')
                    // if contentUnavailable is false, that means this is the first time we hit a problem fetching
                    if (!libresilient.contentUnavailable) {
                        // mark it properly
                        libresilient.contentUnavailable = true
                        // if loaded, show the message to the user.
                        // if not, the message will be shown on `load` event anyway
                        if (libresilient.status === "loaded") {
                            libresilient.displayMessage('Some content seems unavailable. Attempting to retrieve it via LibResilient.')
                        }
                    }
                }
                // update the fetched resources display
                // TODO: this updates *all* resources on each received message,
                // TODO: and so is rather wasteful
                libresilient.updateFetchedResources()
            }
            // we only want to mark that new content is available, and handle the message
            // at allFetched event
            if (event.data.fetchedDiffers) {
                self.log('browser-side', '    +-- fetched version apparently differs from cached for:', event.data.url)
                // record fo the URL
                libresilient.info[event.data.url].cacheStale = true
                // record gloally
                libresilient.cacheStale = true
            }
        }
        if (event.data.allFetched) {
            if (libresilient.status === "loaded") {
                // set the status so that we don't get the message doubled
                libresilient.status = "complete"
                // inform the user
                if (libresilient.cacheStale) {
                    libresilient.displayMessage('Newer version of this page is available; please reload to see it.')
                } else {
                    self.log('browser-side', '+-- all fetched!..')
                    libresilient.displayMessage('Fetching via LibResilient finished; no new content found.')
                }
            }
        }
        if (event.data.clientId) {
            
            self.log('browser-side', '+-- got our clientId:', event.data.clientId)
            
            // if libresilient.clientId is null, this is the first time
            // we got wind that the service worker is running
            // service worker info
            if (libresilient.clientId === null) {
                for (let libresilient_sw of document.querySelectorAll(".libresilient-status-service-worker")) {
                    libresilient_sw.className += " active";
                    try {
                        libresilient_sw.querySelector('.status').innerHTML = "yes";
                    } catch(e) {
                        // nothing to do here, move along
                    }
                }
            }
            // set the clientId internally, we will need it
            libresilient.clientId = event.data.clientId
        }
        if (event.data.plugins) {
            var msg = '+-- got the plugin list:'
            event.data.plugins.forEach((p)=>{
                msg += '\n    +-- ' + p
                // initialize methodStats
                if (typeof libresilient.methodStats[p] === 'undefined') {
                    libresilient.methodStats[p] = 0
                    // set-up the plugin status display
                    libresilient.addPluginStatus(p)
                }
            })
            self.log('browser-side', msg)
        }
        if (event.data.serviceWorker) {
            self.log('browser-side', '+-- got the serviceWorker version:', event.data.serviceWorker)
            var libresilient_sws = document.getElementsByClassName("libresilient-commit-service-worker");
            for (let element of libresilient_sws) {
                element.innerHTML = event.data.serviceWorker;
            }
        }
    });
}
