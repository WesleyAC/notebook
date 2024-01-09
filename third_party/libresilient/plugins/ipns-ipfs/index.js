/**
 * this is the default IPNS+IPFS strategy plugin
 * for LibResilient.
 * 
 * it uses IPNS for content address resolution
 * and IPFS for delivery
 */


/*
 * THIS PLUGIN IS A WORK IN PROGRESS AND IS NOT FUNCTIONAL YET
 */


/* ========================================================================= *\
|* === General stuff and setup                                           === *|
\* ========================================================================= */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "ipns-ipfs"
    LRPC.set(pluginName, (LR, init={})=>{

        var ipfs;

        // sane defaults
        let defaultConfig = {
            // the pubkey of the preconfigured IPNS node; always needs to be set in config.json
            ipnsPubkey: null,
            // the IPFS gateway we're using for verification when publishing; default is usually ok
            ipfsGateway: 'https://gateway.ipfs.io'
        }

        // merge the defaults with settings from init
        let config = {...defaultConfig, ...init}

        // reality check: Gun pubkey needs to be set to a non-empty string
        if (typeof(config.ipnsPubkey) !== "string" || config.ipnsPubkey === "") {
            let err = new Error("ipnsPubkey not confgured")
            console.error(err)
            throw err
        }

        /**
        * importing stuff works differently between a browser window context
        * and a ServiceWorker context, because things just can't be easy and sane
        */
        function doImport() {
            var args = Array.prototype.slice.call(arguments);
            if (typeof self.importScripts !== 'undefined') {
                self.importScripts.apply(self, args)
            } else {
                console.log('(COMMIT_UNKNOWN) assuming these scripts are already included:')
                args.forEach(function(src){
                    console.log('+--', src)
                })
            }
        }

        async function setup_ipfs() {
            if (ipfs === undefined) {
                ipfs = false // we don't want to start a few times over
                console.log('(COMMIT_UNKNOWN) Importing IPFS-related libraries...');
                doImport(
                    "./lib/ipfs.js");
                console.log('(COMMIT_UNKNOWN) Setting up IPFS...')
                try {
                    ipfs = await self.Ipfs.create({
                        config: {
                            dht: {
                                enabled: true,
                                clientMode: true
                            }
                        },
                        libp2p: {
                            config: {
                                dht: {
                                    enabled: true,
                                    clientMode: true
                                }
                            }
                        }
                    });
                    console.log('+-- IPFS loaded       :: ipfs is   : ' + typeof ipfs)
                } catch(e) {
                    console.error('+-- Error loading IPFS: ' + e)
                }
            }
        }

        /* ========================================================================= *\
        |* === Main functionality                                                === *|
        \* ========================================================================= */

        /**
        * the workhorse of this plugin
        */
        async function getContentFromIPNSAndIPFS(url, init={}) {
            return new Error("Not implemented yet.")
            
            var urlArray = url.replace(/https?:\/\//, '').split('/')
            var gunaddr = [urlArray[0], '/' + urlArray.slice(1).join('/')]

            /*
            * if the gunaddr[1] ends in '/', append 'index.html' to it
            */
            if (gunaddr[1].charAt(gunaddr[1].length - 1) === '/') {
                console.log("NOTICE: address ends in '/', assuming '/index.html' should be appended.");    
                gunaddr[1] += 'index.html';
            }

            console.log("2. Starting Gun lookup of: '" + gunaddr.join(', ') + "'");
            console.log("   +-- gun     : " + typeof gun);
            console.log("   +-- gunUser : " + typeof gunUser);

            return getGunData(gunaddr).then(ipfsaddr => {
                console.log("3. Starting IPFS lookup of: '" + ipfsaddr + "'");
                return ipfs.get(ipfsaddr).next();
            }).then(file => {
                // we only need one
                if (file.value.content) {
                    async function getContent(source) {
                        var content = new Uint8Array()
                        var data = await source.next()
                        while (! data.done) {
                            var newContent = new Uint8Array(content.length + data.value.length);
                            newContent.set(content)
                            newContent.set(data.value, content.length)
                            content = newContent
                            data = await source.next()
                        }
                        return content
                    }
                    return getContent(file.value.content).then(async (content)=>{
                        console.log('4. Got a Gun-addressed IPFS-stored file: ' + file.value.path + '; content is: ' + typeof content);
                        // let's guess the content type
                        let contentType = await LR.guessMimeType(
                                                gunaddr.slice(-1)[0].split('.', -1)[1].toLowerCase(),
                                                content
                                            )
                            
                        // creating and populating the blob
                        var blob = new Blob(
                            [content],
                            {'type': contentType}
                        );

                        return new Response(
                            blob,
                            {
                                'status': 200,
                                'statusText': 'OK',
                                'headers': {
                                    'Content-Type': contentType,
                                    'ETag': file.value.path,
                                    'X-LibResilient-Method': pluginName,
                                    'X-LibResilient-ETag': file.value.path
                                }
                            }
                        );
                    })
                };
            });
        }


        /* ========================================================================= *\
        |* === Publishing stuff                                                  === *|
        \* ========================================================================= */
        /*
        * these are used for adding content to IPFS and Gun
        */


        /**
        * adding stuff to IPFS
        * accepts an array of URLs
        * 
        * returns a Promise that resolves to an object mapping URLs to IPFS hashes
        */
        let addToIPFS = (resources) => {
            return new Error("Not implemented yet.")
            
            return new Promise((resolve, reject) => {
                
                console.log("Adding to IPFS...")
                console.log("+-- number of resources:", resources.length)
                var ipfs_addresses = new Map();

                resources.forEach(function(res){
                    console.log("    +-- handling internal resource:", res)
                    
                    ipfs.add(Ipfs.urlSource(res))
                        .then((result) => {
                            // add to the list -- this is needed to add stuff to Gun
                            // result.path is just the filename stored in IPFS, not the actual path!
                            // res holds the full URL
                            // what we need in ipfs_addresses is in fact the absolute path (no domain, no scheme)
                            var abs_path = res.replace(window.location.origin, '')
                            ipfs_addresses.set(abs_path, '/ipfs/' + result.cid.string)
                            console.log("Added to IPFS: " + abs_path + ' as ' + ipfs_addresses.get(abs_path))
                            // if we seem to have all we need, resolve!
                            if (ipfs_addresses.size === resources.length) resolve(ipfs_addresses);
                        })
                
                });
            })
        }

        /**
        * verification that content pushed to IPFS
        * is, in fact, available in IPFS
        * 
        * a nice side-effect is that this will pre-load the content on
        * a gateway, which tends to be a large (and fast) IPFS node
        * 
        * this is prety naïve, in that it pulls the content from an ipfs gateway
        * and assumes all is well if it get a HTTP 200 and any content
        * 
        * that is, it does *not* check that the content matches what was pushed
        * we trust IPFS here, I guess
        * 
        * finally, we're using a regular fetch() instead of just going through our
        * ipfs object because our IPFS object might have things cached and we want
        * to test a completey independent route
        * 
        * takes a object mapping paths to IPFS addresses
        * and returns a Promise that resolves to true 
        */
        let verifyInIPFS = (ipfs_addresses) => {
            return new Error("Not implemented yet.")
            
            return new Promise((resolve, reject) => {
                console.log('Checking IPFS content against a gateway...')
                console.log('+-- gateway in use: ' + config.ipfsGateway)
                // get the list of IPFS addresses
                var updatedPaths = Array.from(ipfs_addresses.values())
                for (const path of ipfs_addresses.keys()) {
                    // start the fetch
                    fetch(config.ipfsGateway + ipfs_addresses.get(path))
                        .then((response) => {
                            ipfsaddr = response.url.replace(config.ipfsGateway, '')
                            if (response.ok) {
                                console.log('+-- verified: ' + ipfsaddr)
                                var pathIndex = updatedPaths.indexOf(ipfsaddr)
                                if (pathIndex > -1) {
                                    updatedPaths.splice(pathIndex, 1)
                                }
                                if (updatedPaths.length === 0) {
                                    console.log('All updates confirmed successful!')
                                    resolve(ipfs_addresses);
                                }
                            } else {
                                reject(new Error('HTTP error (' + response.status + ' ' + response.statusText + ' for: ' + ipfsaddr))
                            }
                        })
                        .catch((err) => {
                            // it would be nice to have the failed path here somehow
                            // alternatively, updating updatedPaths with info on failed
                            // requests might work
                            reject(err)
                        })
                }
            })
        }


        /**
        * example code for of adding content to IPFS, verifying it was successfully added,
        * and adding the new addresses to Gun (and verifying changes propagated) 
        * 
        * TODO: this should accept a URL, a Response, or a list of URLs,
        *       and handle stuff appropriately
        */
        let publishContent = (resource, user, password) => {
            return new Error("Not implemented yet.")
            
            if (typeof resource === 'string') {
                // we need this as an array of strings
                resource = [resource]
            } else if (typeof resource === 'object') {
                if (!Array.isArray(resource)) {
                    // TODO: this needs to be implemented such that the Response is used directly
                    //       but that would require all called functions to also accept a Response
                    //       and act accordingly; #ThisIsComplicated
                    throw new Error("Handling a Response: not implemented yet")
                }
            } else {
                // everything else -- that's a paddlin'!
                throw new TypeError("Only accepts: string, Array of string, Response.")
            }
                
            // add to IPFS
            var ipfsPromise = addToIPFS(resource)
            return Promise.all([
                // verify stuff ended up in IPFS
                ipfsPromise.then(verifyInIPFS),
                // add to Gun and verify Gun updates propagation
                ipfsPromise.then((hashes) => {
                    addToGun(user, password, hashes)
                })
            ])
        }

        /* ========================================================================= *\
        |* === Initialization                                                    === *|
        \* ========================================================================= */

        // we probably need to handle this better
        setup_ipfs();


        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: 'Decentralized resource fetching using IPNS for address resolution and IPFS for content delivery.',
            version: 'COMMIT_UNKNOWN',
            fetch: getContentFromIPNSAndIPFS,
            publish: publishContent
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
