/* ========================================================================= *\
|* === HTTP(S) fetch() from alternative endpoints                        === *|
\* ========================================================================= */

/**
 * this plugin does not implement any push method
 * 
 * NOTICE: this plugin uses Promise.any()
 *         https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
 *         the polyfill is implemented in LibResilient's service-worker.js
 */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "dnslink-fetch"
    LRPC.set(pluginName, (LR, init={})=>{
        
        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {
            // how many simultaneous connections to different endpoints do we want
            // 
            // more concurrency means higher chance of a request succeeding
            // but uses more bandwidth and other resources.
            // 
            // this is not about DoH resolution, only one DoH endpoint *can* be
            // configured and used at any time. this is about concurrency once the
            // alternative endpoints are already resolved. that is, how many endpoints
            // are used simultaneously to pull the actual content.
            // 
            // 3 seems to be a reasonable default
            concurrency: 3,
            
            // DNS-over-HTTPS media type
            // 
            // if this is set to "application/dns-message", the binary DNS wire format
            // will be used and expected.
            // 
            // if this is set to anything else, JSON format will be used and expected.
            // when using the JSON format, it is probably safest to set it to "application/dns-json"
            // as this media type seems to be accepted the widest and is required by CloudFlare.
            // 
            // other often-used media types for DoH JSON API requests:
            // - application/dns+json     (RFC8427, registered with IANA)
            // - application/x-javascript (Google, but accepts other media types as well)
            // - application/json
            //
            // by default DoH JSON API is used
            dohMediaType: "application/dns-json",
            
            // should the requests to the DoH server be made using GET or POST HTTP method?
            // 
            // this is *only* valid when dohMediaType above is set to "application/dns-message";
            // otherwise it is ignored and GET HTTP method is used
            dohMethod: "GET",
            
            // DNS-over-HTTPS provider
            // 
            // by default using Hostux DoH provider, info here:
            // - https://dns.hostux.net/en/
            // 
            // other known DoH JSON API providers:
            // - 'https://cloudflare-dns.com/dns-query'
            // - 'https://mozilla.cloudflare-dns.com/dns-query'
            // - 'https://dns.google/resolve'
            // - 'https://dns.alidns.com/resolve'
            // - 'https://dns.quad9.net:5053/dns-query'
            dohProvider: 'https://dns.hostux.net/dns-query'
        }

        // merge the defaults with settings from the init var
        let config = {...defaultConfig, ...init}
        
        // reality check: dohMediaType must be a string
        if (typeof(config.dohMediaType) !== "string" || (config.dohMediaType == '')) {
            let err = new Error("dohMediaType not confgured")
            console.error(err)
            throw err
        }
        
        // reality check: dohMethod must be a string, and either "GET" or "POST"
        // also, "POST" only makes sense when using "application/dns-message" dohMediaType
        if (typeof(config.dohMethod) !== "string" || (config.dohMethod == '')) {
            let err = new Error("dohMethod not confgured")
            console.error(err)
            throw err
        } else {
            // this should be uppercase
            config.dohMethod = config.dohMethod.toUpperCase()
            // and only GET or POST
            if (config.dohMethod != "GET" && config.dohMethod != "POST") {
                let err = new Error(`dohMethod can only be "GET" or "POST", but is set to: ${config.dohMethod}`)
                console.error(err)
                throw err
            }
            // "POST" only makes sense when dohMediaType is "application/dns-message"
            if (config.dohMethod === "POST" && config.dohMediaType != "application/dns-message") {
                // this is just a warning though, "POST" is just going to be ignored
                LR.log(pluginName, 'Warning: "POST" dohMethod is going to be ignored as dohMediaType is not "application/dns-message"')
            }
        }
        
        // reality check: dohProvider must be a string
        if (typeof(config.dohProvider) !== "string" || (config.dohProvider == '')) {
            let err = new Error("dohProvider not confgured")
            console.error(err)
            throw err
        }
        
        // externally defined functions
        if (typeof self.importScripts !== 'undefined') {
            LR.log(pluginName, 'importing doh.js')
            self.importScripts("./lib/doh.js")
        }
            
        // check if doh.js was properly loaded
        if (typeof resolveEndpointsBinary !== "function") {
            throw new Error("resolveEndpointsBinary() is not defined, is doh.js loaded?")
        }
        if (typeof resolveEndpointsJSON !== "function") {
            throw new Error("resolveEndpointsJSON() is not defined, is doh.js loaded?")
        }
        
        /**
         * retrieving the alternative endpoints list from dnslink
         * using DNS-over-HTTPS
         * 
         * returns an array of strings, each being a valid endpoint,
         * in the form of
         * scheme://example.org[/optional/path]
         */
        let resolveEndpoints = async (domain) => {
            
            // first, we need the actual name we're asking about
            // 
            // this needs to be ASCII-encoded, so if we want an IDN domain
            // it needs to be punycode-encoded!
            // TODO: we should *probably* do that ourselves here...
            let dnslink_name = `_dnslink.${domain}`
            
            // response we will need to process a bit
            let response = []
            
            // we can either resolve them using the binary DoH DNS wire format request...
            if (config.dohMediaType === 'application/dns-message') {
                // defined in doh.js
                response = await resolveEndpointsBinary(dnslink_name, config, (msg)=>{LR.log(pluginName, msg)})
            
            // ...or a DoH JSON API request
            } else {
                // defined in doh.js
                response = await resolveEndpointsJSON(dnslink_name, config)
            }
            
            // filter by 'dnslink="/https?/', morph into scheme://...
            // we can't rely on the data not to be wrapped in quotation marks, so we need to correct for that too
            let re = /^"?dnslink=\/(https?)\/([^"]+)"?$/
            response = response
                        .filter(r => re.test(r))
                        .map(r => r.replace(re, "$1:\/\/$2"));
                        
            // do we have anything to work with?
            if (response.length < 1) {
                throw new Error(`No TXT record contained http or https endpoint definition`)
            }
            
            // in case we need some debugging
            LR.log(pluginName, '+-- alternative endpoints from DNSLink:\n    - ' + response.join('"\n    - '))
            
            // this should be what we're looking for - an array of URLs
            return response
        }
        
        /**
         * getting content using regular HTTP(S) fetch()
         */
        let fetchContentFromAlternativeEndpoints = async (url, init={}) => {
            
            // remove the https://original.domain/ bit to get the relative path
            // TODO: this assumes that URLs we handle are always relative to the root
            // TODO: of the original domain, this needs to be documented
            var urlData = url.replace(/https?:\/\//, '').split('/') 
            var domain = urlData.shift()
            var path = urlData.join('/')
            LR.log(pluginName, '+-- fetching:\n',
                               `    - domain: ${domain}\n`,
                               `    -   path: ${path}\n`
            )
            
            // we really want to make fetch happen, Regina!
            // TODO: this change should *probably* be handled on the Service Worker level
            init.cache = 'reload'
            
            // we don't want to modify the original endpoints array
            var sourceEndpoints = await resolveEndpoints(domain)
            
            // if we have fewer than the configured concurrency or just as many, use all of them
            if (sourceEndpoints.length <= config.concurrency) {
                var useEndpoints = sourceEndpoints
                
            // otherwise get `config.concurrency` endpoints at random
            } else {
                var useEndpoints = new Array()
                while (useEndpoints.length < config.concurrency) {
                    useEndpoints.push(
                        sourceEndpoints
                            .splice(Math.floor(Math.random() * sourceEndpoints.length), 1)[0]
                    )
                }
            }
            
            // add the rest of the path to each endpoint
            useEndpoints.forEach((endpoint, index) => {
                useEndpoints[index] = endpoint + '/' + path;
            });
            
            // debug log
            LR.log(pluginName, `+-- fetching from alternative endpoints:\n    - ${useEndpoints.join('\n    - ')}`)
            
            return Promise.any(
                useEndpoints.map(
                    u=>fetch(u, init)
                ))
                .then((response) => {
                    // 4xx? 5xx? that's a paddlin'
                    if (response.status >= 400) {
                        // throw an Error to fall back to other plugins:
                        throw new Error('HTTP Error: ' + response.status + ' ' + response.statusText);
                    }
                    // all good, it seems
                    LR.log(pluginName, "fetched:", response.url);
                    
                    // we need to create a new Response object
                    // with all the headers added explicitly,
                    // since response.headers is immutable
                    var responseInit = {
                        status:     response.status,
                        statusText: response.statusText,
                        headers: {},
                        url: url
                    };
                    response.headers.forEach(function(val, header){
                        responseInit.headers[header] = val;
                    });
                    
                    // add the X-LibResilient-* headers to the mix
                    responseInit.headers['X-LibResilient-Method'] = pluginName
                    
                    // we will not have it most of the time, due to CORS rules:
                    // https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_response_header
                    responseInit.headers['X-LibResilient-ETag'] = response.headers.get('ETag')
                    if (responseInit.headers['X-LibResilient-ETag'] === null) {
                        // far from perfect, but what are we going to do, eh?
                        responseInit.headers['X-LibResilient-ETag'] = response.headers.get('last-modified')
                    }
                    
                    // return the new response, using the Blob from the original one
                    return response
                            .blob()
                            .then((blob) => {
                                return new Response(
                                    blob,
                                    responseInit
                                )
                            })
                })
        }

        // return the plugin data structure
        return {
            name: pluginName,
            description: 'HTTP(S) fetch() using alternative endpoints retrieved via DNSLink',
            version: 'COMMIT_UNKNOWN',
            fetch: fetchContentFromAlternativeEndpoints
        }
    
    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
