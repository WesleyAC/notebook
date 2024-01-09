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
    const pluginName = "alt-fetch"
    LRPC.set(pluginName, (LR, init={})=>{

        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {
            // endpoints to use
            // 
            // they have to respond to requests formatted like:
            // <endpoint-url>/<path>
            // 
            // let's say the endpoint is:
            // https://example.com/api/endpoint/
            // ...and that we are trying to get:
            // <original-domain>/some/path/img.png
            // 
            // the endpoint is supposed to return the expected image
            // when this URL is requested:
            // https://example.com/api/endpoint/some/path/img.png
            // 
            // this has to be explicitly configured by the website admin
            endpoints: [],
    
            // how many simultaneous connections to different endpoints do we want
            // 
            // more concurrency means higher chance of a request succeeding
            // but uses more bandwidth and other resources;
            // 
            // 3 seems to be a reasonable default
            concurrency: 3
        }

        // merge the defaults with settings from the init var
        let config = {...defaultConfig, ...init}

        // reality check: endpoints need to be set to an array of non-empty strings
        if (typeof(config.endpoints) !== "object" || !Array.isArray(config.endpoints)) {
            let err = new Error("endpoints not confgured")
            console.error(err)
            throw err
        }
        

        /**
         * getting content using regular HTTP(S) fetch()
         */
        let fetchContentFromAlternativeEndpoints = (url, init={}) => {
            
            // remove the https://original.domain/ bit to get the relative path
            // TODO: this assumes that URLs we handle are always relative to the root
            // TODO: of the original domain, this needs to be documented
            var path = url.replace(/https?:\/\/[^/]+\//, '')
            
            // we really want to make fetch happen, Regina!
            // TODO: this change should *probably* be handled on the Service Worker level
            init.cache = 'reload'
            
            // we don't want to modify the original endpoints array
            var sourceEndpoints = [...config.endpoints]
            
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
                useEndpoints[index] = endpoint + path;
            });
            
            // debug log
            LR.log(pluginName, `fetching from alternative endpoints:\n  ${useEndpoints.join('\n  ')}`)
            
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
            description: 'HTTP(S) fetch() using preconfigured alternative endpoints',
            version: 'COMMIT_UNKNOWN',
            fetch: fetchContentFromAlternativeEndpoints
        }
    
    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
