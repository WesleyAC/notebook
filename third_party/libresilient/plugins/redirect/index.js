/* ========================================================================= *\
|* === HTTP(S) fetch() from alternative endpoints                        === *|
\* ========================================================================= */

/**
 * this plugin does not implement any push method
 * 
 * use this plugin to redirect all requests to a location based on a particular URL
 * 
 * for example, if the original website is `https://some.example.org/`, and the `redirectTo`
 * config field is set to `https://other.example.com/subdir/`, the redirect location will
 * be the request URL with `https://some.example.org/` replaced with `https://other.example.com/subdir/`:
 * 
 * - https://some.example.org/ redirects to https://other.example.com/subdir/
 * - https://some.example.org/favicon.ico redirects to https://other.example.com/subdir/favicon.ico
 * - https://some.example.org/api/test.json redirects to https://other.example.com/subdir/api/test.json
 * ...and so on
 */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "redirect"
    LRPC.set(pluginName, (LR, init={})=>{

        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {
            /*
             * URL to base the redirect target on
             * 
             * all requests will be redirected to <redirectTo>/<URL>
             * 
             * if not a string, the plugin returns an error, thus allowing
             * plugins configured later in the chain to handle requests
             * 
             * don't forget the ending '/'
             */
            redirectTo: null,
            /*
             * the HTTP code and status to use while redirecting
             * https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections
             * 
             * if redirectStatus is not a number, the plugin returns an error,
             * thus allowing plugins configured later in the chain to handle requests
             * 
             * by default using 302 Found
             */
            redirectStatus: 302,
            redirectStatusText: "Found",
            /*
             * is the plugin enabled?
             * 
             * if this is set to false:
             * - the code will *not* check if the plugin is misconfigured;
             * - when any handler is called, it will simply return false.
             *
             * mainly used to load a plugin in a service worker, such that a config.json
             * update later can enable it even when the original domain is unavailable.
             */
            enabled: true
        }

        // merge the defaults with settings from the init var
        let config = {...defaultConfig, ...init}

        
        // reality check: redirectTo, redirectStatus, redirectStatusText need to be sane
        // but only if the plugin is enabled
        if (config.enabled) {
            if ( typeof config.redirectTo != "string" ) {
                let err = new Error("redirectTo should be a string")
                console.error(err)
                throw err
            } else if (config.redirectTo.charAt(config.redirectTo.length - 1) != '/') {
                // sanity reminder
                LR.log(pluginName, 'warning: redirectTo does not end in "/", this might lead to unexpected results!')
            }
            if ( typeof config.redirectStatus != "number" ) {
                let err = new Error("redirectStatus should be a number")
                console.error(err)
                throw err
            }
            if ( typeof config.redirectStatusText != "string" ) {
                let err = new Error("redirectStatusText should be a string")
                console.error(err)
                throw err
            }
        }
        

        /**
         * getting content using regular HTTP(S) fetch()
         */
        let redirectInsteadOfFetch = (url, init={}) => {
            
            // TODO: check for obvious redirect loops
            
            // remove the https://original.domain/ bit to get the relative path
            // TODO: this assumes that URLs we handle are always relative to the root
            // TODO: of the original domain, this needs to be documented
            var redirectTarget =  config.redirectTo + url.replace(/https?:\/\/[^/]+\//, '')
            
            // debug log
            LR.log(pluginName, `redirecting:\n -   from: ${url}\n -     to: ${redirectTarget}\n - status: ${config.redirectStatus} ${config.redirectStatusText}`)
            
            // we need to create a new Response object
            // with all the headers added explicitly,
            // since response.headers is immutable
            var responseInit = {
                status:     config.redirectStatus,
                statusText: config.redirectStatusText,
                headers: {
                    Location: redirectTarget
                },
                url: url
            };
            
            // return a new Response object for this
            return new Response(null, responseInit)
        }

        // return the plugin data structure
        return {
            name: pluginName,
            description: 'HTTP Redirect based on a configured target location',
            version: 'COMMIT_UNKNOWN',
            fetch: redirectInsteadOfFetch
        }
    
    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
