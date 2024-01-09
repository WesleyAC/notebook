/* ========================================================================= *\
|* === Signed Integrity: content integrity using signed integrity data   === *|
\* ========================================================================= */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "signed-integrity"
    LRPC.set(pluginName, (LR, init={})=>{
    
        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {
            // public key used for signature verification on integrity files
            publicKey: null,
            // suffix of integrity data files
            integrityFileSuffix: '.integrity',
            // is integrity data required for any fetched content?
            // 
            // NOTICE: this requires *any* integrity data to be available; if integrity data
            // NOTICE: is already set in the original Request, that's considered enough
            // 
            // TODO: do we need to have forceSignedIntegrity too, to *force* usage of signed integrity data?
            requireIntegrity: false,
            // plugin used for actually fetching the content
            uses: [{
                    // by default using standard fetch(),
                    // leaning on browser implementations of subresource integrity checks
                    // 
                    // if using a different transport plugin, remember to make sure that it verifies
                    // subresource integrity when provided, or  wrap it in an integrity-checking
                    // wrapper plugin (like integrity-check) to make sure integrity is in fact
                    // verified when present
                    name: "fetch"
                }]
        }
        
        // merge the defaults with settings from LibResilientConfig
        let config = {...defaultConfig, ...init}
        
        // reality check: if no wrapped plugin configured, or more than one, complain
        if (config.uses.length != 1) {
            throw new Error(`Expected exactly one plugin to wrap, but ${config.uses.length} configured.`)
        }
        
        // getting the key from the config
        let jwtPublicKey = null
        let getJWTPublicKey = async () => {
            if (jwtPublicKey == null) {
                try {
                    jwtPublicKey = await subtle
                                    .importKey(
                                        "jwk",
                                        config.publicKey,
                                        {
                                            name: "ECDSA",
                                            namedCurve: "P-384"
                                        },
                                        true,
                                        ["verify"]
                                    )
                    LR.log(pluginName, 'JWT signing key successfully loaded.')
                } catch(e) {
                    throw new Error(`Unable to load the public key: ${e}`)
                }
            }
            return jwtPublicKey;
        }
        
        /**
         * utility function
         * base64url decode
         */
        let b64urlDecode = (data) => {
            // figure out the padding to add
            var pad = 4 - (data.length % 4);
            // that's no bueno
            if (pad == 3) {
                throw new Error(`Invalid base64-encoded string!`)
            }
            // no padding, then
            if (pad == 4) {
                pad = 0
            }
            // we're done, atob that thing
            return data
                    .replace(/_/g, '/')
                    .replace(/-/g, '+')
                    + '='.repeat(pad)
        }
        
        // needed for making ArrayBuffers out of strings
        let tenc = new TextEncoder()
        
        /**
         * getting content using the configured plugin,
         * but also making sure integrity data file is fetched, signature checked,
         * and integrity data set in the init for the wrapped plugin
         */
        let fetchContent = async (url, init={}) => {
            
            // do we have integrity data in init?
            if (!('integrity' in init)) {
                // integrity data file URL
                var integrityUrl = url + config.integrityFileSuffix
                
                // let's try to get integrity data
                LR.log(pluginName, `fetching integrity file:\n- ${integrityUrl}\nusing plugin:\n- ${config.uses[0].name}`)
                var integrityResponse = await config.uses[0].fetch(integrityUrl)
                
                // did we get anything sane?
                if (integrityResponse.status == 200) {
                    
                    // this is where magic happens
                    LR.log(pluginName, `fetched integrity data file`)
                    
                    // get the JWT
                    var jwt = await integrityResponse.text()
                    jwt = jwt.split('.')
                    
                    // get the key
                    let k = await getJWTPublicKey()
                    
                    // reality check: all parts of the JWT should be non-empty
                    if (  (jwt.length < 3)
                       || (jwt[0].length == 0)
                       || (jwt[1].length == 0)
                       || (jwt[2].length == 0) ) {
                        throw new Error('JWT seems invalid (one or more sections are empty).')
                    }
                    
                    // WARNING: this is in neither efficient or clear... but works, and this is a PoC
                    var signature = atob(b64urlDecode(jwt[2]))
                    signature = Uint8Array
                                    .from(
                                        Array
                                            .from(signature)
                                            .map(e=>e.charCodeAt(0))
                                    )

                    signature = signature.buffer
                    // verify the JWT
                    if (await subtle
                                .verify(
                                    {
                                        name: "ECDSA",
                                        hash: {name: "SHA-384"}
                                    },
                                    k,
                                    signature,
                                    tenc.encode(jwt[0] + '.' + jwt[1])
                                )) {
                        // unpack it
                        var header = atob(b64urlDecode(jwt[0]))
                        var payload = atob(b64urlDecode(jwt[1]))
                        try {
                            payload = JSON.parse(payload)
                        } catch (e) {
                            throw new Error(`JWT payload parsing failed: ${e}`)
                        }
                        if ('integrity' in payload) {
                            LR.log(pluginName, `got a correct, validated JWT; integrity: ${payload.integrity}`)
                            init.integrity = payload.integrity
                        } else {
                            throw new Error(`JWT payload did not contain integrity data.`)
                        }
                        
                    } else {
                        // we want to error out here, because we did get the integrity file,
                        // which means we should expect valid and signed integrity data!
                        throw new Error(`JWT signature validation failed! Somebody might be doing something nasty!`)
                    }
                    
                } else {
                    LR.log(pluginName, `fetching integrity data failed: ${integrityResponse.status} ${integrityResponse.statusText}`)
                }
            }
            
            // at this point we should have integrity in init one way or another
            if (config.requireIntegrity && !('integrity' in init)) {
                throw new Error(`No integrity data available, though required.`)
            }
            
            LR.log(pluginName, `fetching content using: [${config.uses[0].name}]`)
            // fetch using the configured wrapped plugin
            // 
            // NOTICE: we have no way of knowing if the wrapped plugin performs any actual integrity check
            // NOTICE: if the wrapped plugin doesn't actually check integrity,
            // NOTICE: setting integrity here is not going to do anything
            return config.uses[0].fetch(url, init)
        }

        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: `Fetching signed integrity data, using: [${config.uses.map(p=>p.name).join(', ')}]`,
            version: 'COMMIT_UNKNOWN',
            fetch: fetchContent,
            uses: config.uses
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
