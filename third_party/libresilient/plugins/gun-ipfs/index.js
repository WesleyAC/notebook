/**
 * this is the default Gun+IPFS strategy plugin
 * for LibResilient.
 * 
 * it uses Gun for content address resolution
 * and IPFS for delivery
 */


/**
 * this is apparently needed by Gun
 * `window` does not exist in ServiceWorker context
 */
if (typeof window === 'undefined') {
    var window = self;
}


/* ========================================================================= *\
|* === General stuff and setup                                           === *|
\* ========================================================================= */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "gun-ipfs"
    LRPC.set(pluginName, (LR, init={})=>{

        var ipfs;
        var gun;
        var gunUser;

        // sane defaults
        let defaultConfig = {
            // Gun nodes to use
            gunNodes: ['https://gunjs.herokuapp.com/gun'],
            // the pubkey of the preconfigured Gun user; always needs to be set in config.json
            gunPubkey: null,
            // the IPFS gateway we're using for verification when publishing; default is usually ok
            ipfsGateway: 'https://gateway.ipfs.io'
        }

        // merge the defaults with settings from init
        let config = {...defaultConfig, ...init}

        // reality check: Gun pubkey needs to be set to a non-empty string
        if (typeof(config.gunPubkey) !== "string" || config.gunPubkey === "") {
            let err = new Error("gunPubkey not confgured")
            console.error(err)
            throw err
        }

        /**
        * importing stuff works differently between a browser window context
        * and a ServiceWorker context, because things just can't be easy and sane
        */
        function doImport() {
            var args = Array.prototype.slice.call(arguments);
            LR.log(pluginName, `doImport()\n+-- ${args.join('\n+-- ')}`)
            if (typeof self.importScripts !== 'undefined') {
                LR.log(pluginName, `+-- self.importScripts.apply()`)
                self.importScripts.apply(self, args)
            } else {
                LR.log(
                    pluginName,
                    'assuming these scripts are already included:\n',
                    args.join('\n+-- ')
                )
            }
        }

        async function setup_ipfs() {
            if (ipfs === undefined) {
                ipfs = false // we don't want to start a few times over
                LR.log(pluginName, 'importing IPFS-related libraries...');
                doImport(
                    "./lib/ipfs.js");
                LR.log(pluginName, 'setting up IPFS...')
                try {
                    ipfs = await self.Ipfs.create();
                    LR.log(pluginName, '+-- IPFS loaded       :: ipfs is   : ' + typeof ipfs)
                } catch(e) {
                    console.error('+-- Error loading IPFS: ' + e)
                }
            }
        }

        async function setup_gun() {
            LR.log(pluginName, 'setup_gun()')
            if (gun === undefined) {
                gun = false // we don't want to start a few times over
                LR.log(pluginName, 'importing Gun-related libraries...');
                try {
                    doImport(
                        "./lib/gun.js",
                        "./lib/sea.js",
                        "./lib/webrtc.js");
                } catch(e) {
                    console.error(e)
                }
                LR.log(pluginName, 'setting up Gun...')
                try {
                    gun = Gun(config.gunNodes);
                    LR.log(pluginName, '+-- gun loaded        :: gun is    : ' + typeof gun);
                } catch(e) {
                    LR.log(pluginName, 'Error setting up Gun: ' + e);
                }
            }
            if ( (gun !== false) && (gun !== undefined) ) {
                if (gunUser === undefined) {
                    gunUser = false // we don't want to start a few times over
                    LR.log(pluginName, 'setting up gunUser...')
                    gunUser = gun.user(config.gunPubkey)
                    LR.log(pluginName, '+-- gun init complete :: gunUser is: ' + typeof gunUser);
                }
            } else {
                console.error("at this point Gun should have been set up already, but isn't!")
            }
        }

        async function setup_gun_ipfs() {
            LR.log(pluginName, 'setup_gun_ipfs()')
            if (ipfs === undefined || gun === undefined) {
                LR.log(pluginName, 'setting up...')
                await setup_ipfs();
                await setup_gun();
            } else {
                LR.log(pluginName, 'setup already underway (ipfs: ' + ( (ipfs) ? 'done' : 'loading' ) + ', gun: ' + ( (gun) ? 'done' : 'loading' ) + ')')
            }
        }


        /* ========================================================================= *\
        |* === Main functionality                                                === *|
        \* ========================================================================= */

        let getGunData = (gunaddr) => {
            return new Promise(
                (resolve, reject) => {
                    LR.log(
                        pluginName,
                        'getGunData()\n',
                        `+-- gunUser   : ${typeof gunUser}\n`,
                        `+-- gunaddr[] : ${gunaddr}`
                    );

                    // get the data
                    gunUser
                        .get(gunaddr[0])
                        .get(gunaddr[1])
                        .once(function(addr){
                            if (typeof addr !== 'undefined') {
                                LR.log(pluginName, `IPFS address: "${addr}"`);
                                resolve(addr);
                            } else {
                                // looks like we didn't get anything
                                reject(new Error('IPFS address is undefined for: ' + gunaddr[1]))
                            }
                        // ToDo: what happens when we hit the timeout here?
                        }, {wait: 5000});
                }
            );
        };

        /**
        * the workhorse of this plugin
        */
        async function getContentFromGunAndIPFS(url, init={}) {
            
            await setup_gun_ipfs();
            
            var urlArray = url.replace(/https?:\/\//, '').split('/')
            var gunaddr = [urlArray[0], '/' + urlArray.slice(1).join('/')]

            /*
            * if the gunaddr[1] ends in '/', append 'index.html' to it
            */
            if (gunaddr[1].charAt(gunaddr[1].length - 1) === '/') {
                LR.log(pluginName, "path ends in '/', assuming 'index.html' should be appended.");    
                gunaddr[1] += 'index.html';
            }
            
            // inform
            LR.log(
                pluginName,
                `starting Gun lookup of: ${gunaddr.join(', ')}\n`,
                `+-- gun       : ${typeof gun}\n`,
                `+-- gunUser   : ${typeof gunUser}`
            );

            const ipfsaddr = await getGunData(gunaddr)
            LR.log(pluginName, `starting IPFS lookup of: '${ipfsaddr}'`);
            LR.log(pluginName, `ipfs is: '${ipfs}'`);
            const file = await ipfs.get(ipfsaddr).next()

            if(file.value.content) {
                let source = file.value.content
                
                let chunks = []
                let contentLength = 0;
                let data = await source.next()
                
                while(!data.done) {
                    chunks.push(data.value)
                    contentLength += data.value.length
                    data = await source.next()
                }

                LR.log(pluginName, `Chunks: ${chunks}`)
                let content = new Uint8Array(contentLength)
                let currentLength = 0;
                for(let i = 0; i < chunks.length; i++) {
                    content.set(chunks[i], currentLength)
                    currentLength += chunks[i].length;
                }

                LR.log(pluginName, `got a Gun-addressed IPFS-stored file: ${file.value.path}\n+-- content is: ${typeof content}`);

                // let's guess the content type
                let contentType = await LR.guessMimeType(
                                            gunaddr.slice(-1)[0].split('.', -1)[1].toLowerCase(),
                                            content
                                        )
                    
                // creating and populating the blob
                let blob = new Blob(
                    [content],
                    { type: contentType }
                )

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
                        )
                
            } else {
                LR.log(pluginName, `Gun-addressed IPFS-stored file could not be resolved on IPFS:\nGun: ${gunaddr}\nIPFS: ${ipfsaddr}`)
                return null
            }
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
      let addToIPFS = async resources => {
        LR.log(pluginName, "adding to IPFS...")
        LR.log(pluginName, "+-- number of resources:", resources.length)

        let ipfsAddresses = new Map()

        for(let res of resources) {
          LR.log(pluginName, "    +-- handling internal resource:", res)

          let result = await ipfs.add(Ipfs.urlSource(res))


          // add to the list -- this is needed to add stuff to Gun
          // result.path is just the filename stored in IPFS, not the actual path!
          // res holds the full URL
          // what we need in ipfsAddresses is in fact the absolute path (no domain, no scheme)

          let absPath = res.replace(window.location.origin, '')
          ipfsAddresses.set(absPath, "/ipfs/" + result.cid.toString())
          LR.log(pluginName, "added to IPFS: " + absPath + " as " + ipfsAddresses.get(absPath))
        }

        return ipfsAddresses
        
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
            return new Promise((resolve, reject) => {
                LR.log(pluginName, 'checking IPFS content against a gateway...')
                LR.log(pluginName, '+-- gateway in use: ' + config.ipfsGateway)
                // get the list of IPFS addresses
                var updatedPaths = Array.from(ipfs_addresses.values())
                for (const path of ipfs_addresses.keys()) {
                    // start the fetch
                    fetch(config.ipfsGateway + ipfs_addresses.get(path))
                        .then((response) => {
                            ipfsaddr = response.url.replace(config.ipfsGateway, '')
                            if (response.ok) {
                                LR.log(pluginName, '+-- verified: ' + ipfsaddr)
                                var pathIndex = updatedPaths.indexOf(ipfsaddr)
                                if (pathIndex > -1) {
                                    updatedPaths.splice(pathIndex, 1)
                                }
                                if (updatedPaths.length === 0) {
                                    LR.log(pluginName, 'all updates confirmed successful!')
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
        * auth a Gun admin user
        * (and verify it's the correct one with regards to the configured config.gunPubkey)
        */
        let authGunAdmin = (user, pass) => {
            return new Promise((resolve, reject) => {
                // we need a separate Gun instance, otherwise gu will get merged with gunUser
                // and we want these to be separate
                var g = Gun(config.gunNodes)
                var gu = g.user()
                gu.auth(user, pass, (userReference) => {
                    if (userReference.err) {
                        reject(new Error(userReference.err))
                    // reality check -- does it match our preconfigured pubkey?
                    } else if (gu._.soul.slice(1) === config.gunPubkey) {
                        LR.log(pluginName, 'Gun admin user authenticated using password.');
                        // we need to keep the reference to g, otherwise gu becomes unusable
                        var gApi = {
                            user: gu,
                            gun: g
                        } 
                        resolve(gApi)
                    } else {
                        reject(new Error('Password-authenticated user does not match preconfigured pubkey!'))
                    }
                })
            })
        }

        /**
        * add IPFS addresses to Gun
        */
        let addToGun = (user, pass, ipfs_addresses) => {
            // we need an authenticated Gun user
            return authGunAdmin(user, pass)
                .then((gunAPI) => {
                    LR.log(pluginName, '+-- adding new IPFS addresses to Gun...')
                    // TODO BUG: this will probably fail, or cause failures down the line
                    // TODO BUG: we're setting a Map() object here; it's unclear how GunDB
                    // TODO BUG: will handle this
                    gunAPI.user.get(window.location.host).put(ipfs_addresses /*, function(ack) {...}*/);
                    return gunAPI;
                })
                /**
                * regular confirmations don't seem to work
                * 
                * so instead we're using the regular read-only Gun user
                * to .get() the data that we've .put() just a minute ago
                * 
                * we then subscribe to the .on() events and once we notice the correct
                * addresseswe consider our job done and quit.
                */
                .then((gunAPI) => {
                    // get the paths
                    LR.log(pluginName, '+-- starting verification of updated Gun data...')
                    var updatedPaths = Array.from(ipfs_addresses.values())
                    for (const path of ipfs_addresses) {
                        LR.log(pluginName, '    +-- watching: ' + path)
                        //debuglog('watching path for updates:', path)
                        // using the global gunUser to check if updates propagated
                        gunUser.get(window.location.host).get(path).on(function(updaddr, updpath){
                            /*debuglog('+--', updpath)
                            debuglog('    updated  :', ipfs_addresses[updpath])
                            debuglog('    received :', updaddr)*/
                            if (ipfs_addresses.get(updpath) == updaddr) {
                                // update worked!
                                gunUser.get(window.location.host).get(updpath).off()
                                LR.log(pluginName, '+-- update confirmed for:', updpath, '[' + updaddr + ']')
                                var pathIndex = updatedPaths.indexOf(updpath)
                                if (pathIndex > -1) {
                                    updatedPaths.splice(pathIndex, 1)
                                }
                                if (updatedPaths.length === 0) {
                                    LR.log(pluginName, 'all updates confirmed successful!')
                                    return true;
                                }
                            }
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
            
            if (typeof resource === 'string') {
                // we need this as an array of strings
                resource = [resource]
            } else if (typeof resource === 'object') {
                if (!Array.isArray(resource)) {
                    // TODO: this needs to be implemented such that the Response is used directly
                    //       but that would require all called functions to also accept a Response
                    //       and act accordingly; #ThisIsComplicated
                    throw new Error("Handling a Response: not implemented yet")
                } else {
                    resource.forEach((res)=>{
                        if (typeof res !== 'string') {
                            throw new TypeError("Only accepts: string, Array of string, Response.")
                        }
                    })
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

        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: 'Decentralized resource fetching using Gun for address resolution and IPFS for content delivery.',
            version: 'COMMIT_UNKNOWN',
            fetch: getContentFromGunAndIPFS,
            publish: publishContent
        }
    
    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)

