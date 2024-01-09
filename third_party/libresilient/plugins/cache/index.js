/* ========================================================================= *\
|* === Stashing plugin using the Cache API                               === *|
\* ========================================================================= */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "cache"
    LRPC.set(pluginName, (LR, init={})=>{

        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {}
        
        // merge the defaults with settings from LibResilientConfig
        let config = {...defaultConfig, ...init}
        
        /**
         * getting content from cache
         */
        let getContentFromCache = (url, init={}) => {
            LR.log(pluginName, `getting from cache: ${url}`)
            return caches.open('v1')
                .then((cache) => {
                    return cache.match(url)
                })
                .then((response) => {
                    if ((typeof response === 'undefined') || (response === null) ) {
                        throw new Error('Resource not found in cache');
                    } else {
                        var msg = 'retrieved cached headers:'
                        response.headers.forEach((v, k)=>{
                            msg += `\n+-- ${k} : ${v}`
                        })
                        LR.log(pluginName, msg)
                        // return the response
                        return response
                    }
                })
        }

        /**
         * add resources to cache
         * 
         * implements the stash() LibResilient plugin method
         * 
         * accepts either a Response
         * or a string containing a URL
         * or an Array of string URLs
         */
        let cacheContent = (resource, key) => {
            return caches.open('v1')
                .then((cache) => {
                    
                    // polyfill cache.add()
                    // needed for tests and CLI, until Deno implements it natively
                    if (!("add" in cache)) {
                        cache.add = (url) => {
                            LR.log(pluginName, 'hit cache.add polyfill')
                            var result = fetch(url).then((response) => {
                                if (!response.ok) {
                                    throw new Error("bad response!");
                                }
                                return cache.put(url, response);
                            });
                            return result
                        }
                    }
                    
                    // polyfill cache.addAll()
                    // needed for tests and CLI, until Deno implements it natively
                    if (!("addAll" in cache)) {
                        cache.addAll = async (urls)=>{
                            LR.log(pluginName, 'hit cache.addAll polyfill')
                            await Promise.all(
                                urls.map((url)=>{
                                    return cache.add(url)
                                })
                            )
                            return Promise.resolve(undefined)
                        }
                    }
                    
                    if (typeof resource === 'string') {
                        // assume URL
                        LR.log(pluginName, "caching an URL: " + resource)
                        return cache.add(resource)
                    } else if (Array.isArray(resource)) {
                        // assume array of URLs
                        LR.log(pluginName, "caching an Array of URLs")
                        return cache.addAll(resource)
                    } else {
                        // assume a Response
                        // which means we either have a Request in key, a string URL in key,
                        // or we can use the URL in resource.url
                        if ( (typeof key !== 'object') && ( (typeof key !== 'string') || (key === '') ) ) {
                            if (typeof resource.url !== 'string' || resource.url === '') {
                                throw new Error('No URL to work with!')
                            }
                            key = resource.url
                        }
                        
                        // we need to create a new Response object
                        // with all the headers added explicitly
                        // otherwise the x-libresilient-* headers get ignored
                        var responseInit = {
                            status:     resource.status,
                            statusText: resource.statusText,
                            headers: {}
                        };
                        if (typeof resource.url === 'string' && resource.url !== '') {
                            responseInit.url = resource.url
                        }
                        resource.headers.forEach(function(val, header){
                            responseInit.headers[header] = val;
                        });
                        return resource
                                .blob()
                                .then((blob) => {
                                    LR.log(pluginName, "caching a Response to: " + key)
                                    return cache.put(key, new Response(
                                        blob,
                                        responseInit
                                    ))
                                })
                    }
                })
        }

        /**
         * remove resources from cache
         * 
         * implements the unstash() LibResilient plugin method 
         * 
         * accepts either a Response
         * or a string containing a URL
         * or an Array of string URLs
         */
        let clearCachedContent = (resource) => {
            return caches.open('v1')
                .then((cache) => {
                    if (typeof resource === 'string') {
                        // assume URL
                        LR.log(pluginName, "deleting a cached URL")
                        return cache.delete(resource)
                    } else if (Array.isArray(resource)) {
                        // assume array of URLs
                        LR.log(pluginName, "deleting an Array of cached URLs")
                        return Promise.all(
                            resource.map((res)=>{
                                return cache.delete(res)
                            })
                        )
                    } else {
                        // assume a Response
                        // which means we have an URL in resource.url
                        LR.log(pluginName, "removing a Response from cache: " + resource.url)
                        return cache.delete(resource.url)
                    }
                })
        }


        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: 'Locally cached responses, using the Cache API.',
            version: 'COMMIT_UNKNOWN',
            fetch: getContentFromCache,
            stash: cacheContent,
            unstash: clearCachedContent
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
