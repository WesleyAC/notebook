/*
 * emergency removal of a mis-configured service worker
 * 
 * this file will un-register the service worker, attempting this both from client-side
 * and by way of installing a self-destructing service worker script.
 * 
 * use this file to replace these two LibResilient files as deployed on your site,
 * keeping their names, then publish your site as normal:
 * 
 * - service-worker.js
 * - libresilient.js
 * 
 * these files are normally distributed in the directory that is parent to the one
 * this file is in.
 */

// are we running client-side?
if ('serviceWorker' in navigator) {
    // we are. unregister all relevant service workers 
    console.log('LibResilient [COMMIT_UNKNOWN, client-side] :: emergency service worker removal code started')
    navigator.serviceWorker.getRegistrations().then( async (registrations)=>{
        console.log(`LibResilient [COMMIT_UNKNOWN, client-side] :: removing ${registrations.length} registrations...`)
        for (let registration of registrations) {
            let result = await registration.unregister();
            if (result === true) {
                console.log('LibResilient [COMMIT_UNKNOWN, client-side] :: +-- unregistered a registration')
            } else {
                console.log('LibResilient [COMMIT_UNKNOWN, client-side] :: +-- failed to unregister a registration')
            }
        }
    });
    
// otherwise, are we running as a service worker already?
} else if ('registration' in self) {

    self.addEventListener('install', () => {
        console.log('LibResilient [COMMIT_UNKNOWN, service-worker] :: emergency service worker removal code installed')
        // we want this activated immediately;
        // this means that we become the service worker immediately
        self.skipWaiting();
    });

    self.addEventListener('activate', () => {
        // since we are the service worker, we can just... unregister ourselves
        console.log('LibResilient [COMMIT_UNKNOWN, service-worker] :: unregistering the service worker...')
        self.registration
                    .unregister()
                    .then((unresult)=>{
                        // was the unregistration a success?
                        if (unresult) {
                            // indeed
                            console.log('LibResilient [COMMIT_UNKNOWN, service-worker] :: successfully unregistered the service worker')
                            // return the list of clients to reload in order to remove the last remnants of the service worker
                            return self.clients.matchAll({
                                type: 'window'
                            })
                        } else {
                            // failed unregistration
                            console.log('LibResilient [COMMIT_UNKNOWN, service-worker] :: failed to unregister the service worker')
                            // return an empty array, as it's unclear if the service worker was unregistered
                            return []
                        }
                    })
                    // reload all clients (if any) 
                    .then(wclients => {
                        console.log(`LibResilient [COMMIT_UNKNOWN, service-worker] :: reloading ${wclients.length} clients`)
                        wclients.forEach((wclient) => {
                            console.log('LibResilient [COMMIT_UNKNOWN, service-worker] :: +-- client:', wclient)
                            wclient.navigate(wclient.url);
                        });
                    })
    });
    
} else {
    console.warn("unable to load LibResilient: ServiceWorker API not available in the browser")
}
