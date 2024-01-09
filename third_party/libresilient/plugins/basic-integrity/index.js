/* ========================================================================= *\
|* === basic-integrity: pre-configured subresource integrity for content === *|
\* ========================================================================= */

/**
 * this plugin does not implement any push method
 */
// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "basic-integrity"
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
            // integrity data for each piece of content
            // URL or absolute path -> integrity data (string)
            // 
            // integrity data can contain multiple integrity hashes, space-separated, as per:
            // https://w3c.github.io/webappsec-subresource-integrity/#agility
            // 
            // integrity data specified for the same effective URL twice (using the whole URL,
            // and then only the path) is concatenated
            // 
            // for example, these two entries:
            // "https://example.org/some/path/index.html": "sha384-..."
            // "/some/path/index.html": "sha512-..."
            // 
            // ...will result, if request URL is https://example.org/some/path/index.html and
            // origin is https://example.org, in concatenated integrity data for that request.
            integrity: {},
            // if an URL has no integrity data associated with it, should it be allowed or not?
            requireIntegrity: true
        }
        
        // merge the defaults with settings from LibResilientConfig
        let config = {...defaultConfig, ...init}
        
        // reality check: if no wrapped plugin configured, or more than one, complain
        if (config.uses.length != 1) {
            throw new Error(`Expected exactly one plugin to wrap, but ${config.uses.length} configured.`)
        }
        
        /**
         * getting content using the wrapped plugin, but providing integrity data
         */
        let fetchContent = (url, init={}) => {
            LR.log(pluginName, `handling: ${url}`)
            
            // integrity data
            // a string, where we will combine integrity data from init
            // and from the plugin config, if they exist
            let integrity = ""
            
            // do we have integrity data in init?
            if ('integrity' in init) {
                integrity = init.integrity
            }
            
            // do we have integrity data in config?
            // 
            // the service worker would send the fetch our way only if the origin matched the URL
            // and we only ever get full URLs anyway
            
            // trying a full URL (schema://example.com/...)
            if (url in config.integrity) {
                integrity += ' ' + config.integrity[url]
            }
            
            // trying just the path, without schema and without the domain
            let path = url.replace(self.location.origin, "")
            if (path in config.integrity) {
                integrity += ' ' + config.integrity[path]
            }
            
            // some cleanup
            integrity = integrity.trim()
            
            // reality check
            if (integrity != '') {
                // so we have some integrity data; great, let's use it!
                init.integrity = integrity
                
            // no integrity data available, are we even allowed to proceed?
            } else if (config.requireIntegrity) {
                
                // bail if integrity data is not available
                throw new Error(`Integrity data required but not provided for: ${url} nor ${path}`)
            }
            
            // log
            LR.log(pluginName, `integrity for: ${url}\n- ${integrity}`)
            
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
            description: `verifying subresource integrity for resources fetched by other plugins`,
            version: 'COMMIT_UNKNOWN',
            fetch: fetchContent,
            uses: config.uses
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
