/*
 * minimal LibResilient service worker loading script
 * include it in your HTML files to deploy LibResilient
 * 
 * for a more complete and fancy implementation of browser-side
 * see `libresilient-fancy.js`
 */

// check if the browser implements ServiceWorkers API
if ('serviceWorker' in navigator) {
    
    if (navigator.serviceWorker.controller) {
        // Service worker already registered.
        console.log('A Service Worker is already registered.')
    } else {
        // NOTICE: Assumptions made here:
        // 1. the Service Worker script is called service-worker.js
        // 2. ...and is located in the same directory as this file
        var scriptPath = document.currentScript.src
        var scriptFolder = scriptPath.substr(0, scriptPath.lastIndexOf( '/' )+1 )
        var serviceWorkerPath = scriptFolder + 'service-worker.js'
        console.log('LibResilient: using Service Worker script at: ' + serviceWorkerPath)
        // this code actually finally registers the Service Worker
        navigator.serviceWorker.register(serviceWorkerPath, {
            // NOTICE: "There is frequent confusion surrounding the meaning and use of scope.
            // NOTICE:  Since a service worker can't have a scope broader than its own location,
            // NOTICE:  only use the scope option when you need a scope that is narrower than the default."
            // 
            // so, "./" is the broadest scope, also the default. but the ServiceWorker can be registered
            // for a narrower scope, for example "./subdir/".
            scope: './'
        }).then(function(reg) {
            // Success.
            console.log('LibResilient: Service Worker registered.')
        }).catch(error => {
            console.error("LibResilient: Error while registering a service worker!", error)
        })
    }
} else {
    console.warn("unable to load LibResilient: ServiceWorker API not available in the browser")
}
