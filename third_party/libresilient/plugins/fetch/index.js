/* ========================================================================= *\
|* === Regular HTTP(S) fetch() plugin                                    === *|
\* ========================================================================= */

/**
 * this plugin does not implement any push method
 */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "fetch"
    LRPC.set(pluginName, (LR, init={})=>{
    
        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {}
        
        // merge the defaults with settings from init
        let config = {...defaultConfig, ...init}
        /**
        * getting content using regular HTTP(S) fetch()
        */
        let fetchContent = (url, init={}) => {
            LR.log(pluginName, `regular fetch: ${url}`)
            // we really want to make fetch happen, Regina!
            // TODO: this change should *probably* be handled on the Service Worker level
            init.cache = 'reload'
            // run built-in regular fetch()
            return fetch(url, init)
                .then((response) => {
                    // 4xx? 5xx? that's a paddlin'
                    if (response.status >= 400) {
                        // throw an Error to fall back to LibResilient:
                        throw new Error('HTTP Error: ' + response.status + ' ' + response.statusText);
                    }
                    // all good, it seems
                    LR.log(pluginName, `fetched successfully: ${response.url}`);
                    
                    // we need to create a new Response object
                    // with all the headers added explicitly,
                    // since response.headers is immutable
                    var responseInit = {
                        status:     response.status,
                        statusText: response.statusText,
                        headers: {},
                        url: response.url
                    };
                    response.headers.forEach(function(val, header){
                        responseInit.headers[header] = val;
                    });
                    
                    // add the X-LibResilient-* headers to the mix
                    responseInit.headers['X-LibResilient-Method'] = pluginName
                    responseInit.headers['X-LibResilient-ETag'] = response.headers.get('ETag')
                    
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

        // return the plugin
        return {
            name: pluginName,
            description: 'Just a regular HTTP(S) fetch()',
            version: 'COMMIT_UNKNOWN',
            fetch: fetchContent
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
