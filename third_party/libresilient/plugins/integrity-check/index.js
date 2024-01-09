/* ========================================================================= *\
|* === integrity-check: subresource integrity checks for wrapped plugins === *|
\* ========================================================================= */

/**
 * this plugin does not implement any push method
 */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "integrity-check"
    LRPC.set(pluginName, (LR, init={})=>{
    
        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {
            
            // list of plugins to wrap
            // this should always contain exactly one element, but still needs to be an array
            // as this is what the Service Worker script expects
            uses: [{
                name: "alt-fetch"
            }],
            
            // if there is no integrity data available for an URL, should the request be allowed to proceed?
            requireIntegrity: false,
            
            // should *all* available hashes for the resource be checked and required?
            // 
            // by default, if the resource matches *any* of the hashes, it's considered good to go
            // this follows the spec; from the documentation:
            // 
            // Note: An integrity value may contain multiple hashes separated by whitespace.
            //       A resource will be loaded if it matches one of those hashes.
            // https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity#using_subresource_integrity
            // 
            // TODO: not implemented yet!
            // TODO: https://gitlab.com/rysiekpl/libresilient/-/issues/22
            //enforceAllHashes: false
        }
        
        // merge the defaults with settings from LibResilientConfig
        let config = {...defaultConfig, ...init}
        
        // reality check: if no wrapped plugin configured, complain
        if (config.uses.length != 1) {
            throw new Error(`Expected exactly one plugin to wrap, but ${config.uses.length} configured.`)
        }
        
        /**
         * helper function, converting binary to base64
         * this need not be extremely fast, since it will only be used on digests
         * 
         * binary_data - data to convert to base64
         */
        let binToBase64 = (binary_data) => {
            return btoa(
                        (new Uint8Array(binary_data))
                            .reduce((bin, byte)=>{
                                return bin += String.fromCharCode(byte)
                            }, '')
                    )
        }
        
        /**
         * helper function, getting the digest algo
         * from algorithm part of an integrity string
         * 
         * integrity_algo - the algorithm part of an integrity string
         */
        let getAlgo = (integrity_algo) => {
            switch (integrity_algo.toLowerCase()) {
                case 'sha256':
                    return 'SHA-256'; break;
                case 'sha384':
                    return 'SHA-384'; break;
                case 'sha512':
                    return 'SHA-512'; break;
                default:
                    throw new Error(`Unsupported integrity digest algorithm: ${nextIntegrityHash[0]}`)
            }
        }
        
        /**
         * getting content using regular HTTP(S) fetch()
         * 
         * url  - the url to fetch 
         * init - Request() init data
         * 
         * NOTICE: we have no way of knowing if the wrapped plugin performs any actual integrity check
         * NOTICE: if the wrapped plugin does check integrity, this will lead to checking it twice,
         * NOTICE: wasting resources
         */
        let fetchAndVerifyContent = (url, init={}) => {
            
            // integrity data
            var integrity = []
            
            // do we have integrity data in init?
            if ('integrity' in init && init.integrity != "") {
                // we need an array
                integrity = init.integrity.split(' ')
                LR.log(pluginName, `integrity for: ${url}\n- ${integrity}`)
                
            // no integrity data available, are we even allowed to proceed?
            } else if (config.requireIntegrity) {
                
                // bail if integrity data is not available
                throw new Error(`Integrity data required but not provided for: ${url}`)
            }
            
            // fetch data using the configured wrapped plugin
            var responsePromise = config.uses[0].fetch(url, init)
        
            // if we have no integrity data, we really do not have anything to do
            // apart from returning the response
            if (integrity.length == 0) {
                LR.log(pluginName, `no integrity data provided for: ${url}`)
                return responsePromise;
            }
            
            LR.log(pluginName, `preparing to check integrity of: ${url}`)
            
            // down the Promise slide we go
            // 
            // TODO: what if responsePromise got rejected?
            // TODO: how to handle split()-related artifacts (empty strings etc)?
            return responsePromise
                    // get the blob from a cloned response
                    .then(response=>response.clone().blob())
                    .then(blob=>blob.arrayBuffer())
                    .then((ab)=>{
                        // go sequentially, find the first match
                        return integrity
                                // c.f. https://css-tricks.com/why-using-reduce-to-sequentially-resolve-promises-works/
                                .reduce(
                                    (previousPromise, nextIntegrityHash)=>{
                                        return previousPromise
                                                .catch((err)=>{
                                                    // it's a string, we need an array
                                                    nextIntegrityHash = nextIntegrityHash.split('-')
                                                    // make sure the algo name is compatible with SubtleCrypto digest algo names
                                                    try {
                                                        nextIntegrityHash[0] = getAlgo(nextIntegrityHash[0])
                                                    } catch (e) {
                                                        return Promise.reject(e)
                                                    }
                                                    LR.log(pluginName, `verifying integrity for: ${url}\n- algo: ${nextIntegrityHash[0]}\n- hash: ${nextIntegrityHash[1]}`)
                                                    return crypto
                                                            .subtle
                                                            .digest(nextIntegrityHash[0], ab)
                                                })
                                                .then((digest)=>{
                                                    let b64digest = binToBase64(digest)
                                                    LR.log(pluginName, `actual digest for: ${url}\n- algo: ${nextIntegrityHash[0]}\n- hash: ${b64digest}`)
                                                    if (b64digest == nextIntegrityHash[1]) {
                                                        LR.log(pluginName, `successfully verified integrity for: ${url}\n- algo: ${nextIntegrityHash[0]}\n- hash: ${nextIntegrityHash[1]}`)
                                                        return responsePromise
                                                    } else {
                                                        return Promise.reject(Error('Digest does not match.'))
                                                    }
                                                })
                                    },
                                    // we need to start with a rejected promise, since we're doing a catch()-slide
                                    Promise.reject())
                    })
                    .catch((err)=>{
                        return Promise.reject(Error(`No digest matched for: ${url}`))
                    })
        }

        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: `performing subresource integrity checks for resources fetched by other plugins`,
            version: 'COMMIT_UNKNOWN',
            fetch: fetchAndVerifyContent,
            uses: config.uses
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
