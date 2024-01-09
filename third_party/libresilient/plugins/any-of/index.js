/* ========================================================================= *\
|* === Any-of: running multiple plugins simultaneously                   === *|
\* ========================================================================= */

/**
 * this plugin does not implement any push method
 */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "any-of"
    LRPC.set(pluginName, (LR, init={})=>{
    
        /*
         * plugin config settings
         */
        
        // sane defaults
        let defaultConfig = {
            // list of plugins to run simultaneously
            uses: [{
                    name: "alt-fetch"
                },{
                    name: "gun-ipfs"
                }]
        }
        
        // merge the defaults with settings from LibResilientConfig
        let config = {...defaultConfig, ...init}
        
        // reality check: if no wrapped plugin configured, complain
        if (config.uses.length < 1) {
            throw new Error("No wrapped plugins configured!")
        }
        
        /**
         * getting content using Promise.any() on all configured wrapped plugins
         */
        let fetchContent = (url, init={}) => {
            LR.log(pluginName, `using: [${config.uses.map(p=>p.name).join(', ')}]!`)
            return Promise.any(
                config.uses.map(p=>p.fetch(url, init))
            )
        }

        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: `Running simultaneously: [${config.uses.map(p=>p.name).join(', ')}]`,
            version: 'COMMIT_UNKNOWN',
            fetch: fetchContent,
            uses: config.uses
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
