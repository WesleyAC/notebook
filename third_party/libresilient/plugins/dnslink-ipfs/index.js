/**
 * this is the default DNSLink+IPFS strategy plugin
 * for LibResilient.
 * 
 * it uses DNSLink for content address resolution
 * and IPFS for delivery
 */


/* ========================================================================= *\
|* === General stuff and setup                                           === *|
\* ========================================================================= */

// no polluting of the global namespace please
(function(LRPC){
    // this never changes
    const pluginName = "dnslink-ipfs"
    LRPC.set(pluginName, (LR, init={})=>{

        var ipfsPromise;

        // sane defaults
        let defaultConfig = {
            // the IPFS gateway we're using for verification when publishing; default is usually ok
            //ipfsGateway: 'https://gateway.ipfs.io'
        }

        // merge the defaults with settings from init
        let config = {...defaultConfig, ...init}

        /**
         * importing stuff works differently between a browser window context
         * and a ServiceWorker context, because things just can't be easy and sane
         */
        function doImport() {
            var args = Array.prototype.slice.call(arguments);
            if (typeof self.importScripts !== 'undefined') {
                self.importScripts.apply(self, args)
            } else {
                LR.log(pluginName, 'assuming these scripts are already included:')
                args.forEach(function(src){
                    LR.log(pluginName, '+--', src)
                })
            }
        }

        async function setup_ipfs() {
            LR.log(pluginName, 'Importing IPFS-related libraries...');
            doImport(
                "./lib/ipfs.js");
            LR.log(pluginName, 'Setting up IPFS...')
            try {
                var ipfs = await self.Ipfs.create();
                LR.log(pluginName, '+-- IPFS loaded       :: ipfs is   : ' + typeof ipfs)
                return ipfs
            } catch(e) {
                LR.log(pluginName, '+-- Error loading IPFS: ' + e)
                throw new Error(e)
            }
        }

        /* ========================================================================= *\
        |* === Main functionality                                                === *|
        \* ========================================================================= */

        /**
        * the workhorse of this plugin
        */
        async function getContentFromDNSLinkAndIPFS(url, init={}) {
            
            // make sure IPFS is set-up
            var ipfs = await ipfsPromise
            
            // we don't want the scheme
            var dnslinkAddr = url.replace(/https?:\/\//, '')
            
            /*
            * if the dnslinkAddr ends in '/', append 'index.html' to it
            * 
            * TODO: might not be necessary; if removed, update the content-type switch statement below!
            */
            if (dnslinkAddr.charAt(dnslinkAddr.length - 1) === '/') {
                LR.log(pluginName, "NOTICE: address ends in '/', assuming '/index.html' should be appended.");
                dnslinkAddr += 'index.html';
            }

            LR.log(pluginName, "+-- starting DNSLink lookup of: '" + dnslinkAddr + "'");
            
            // TODO: error handling!
            return ipfs.name.resolve('/ipns/' + dnslinkAddr).next().then(ipfsaddr => {
                
                // TODO: use the iterator, luke
                LR.log(pluginName, "+-- starting IPFS retrieval of: '" + ipfsaddr.value + "'");
                return ipfs.cat(ipfsaddr.value);
                
            }).then(async (source) => {
                
                LR.log(pluginName, '+-- started receiving file data')
                // source is an iterator
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
                var filedata = await source.next();
                
                // did we get anything?
                if (filedata.value) {
                    
                    // initialize
                    var content = new Uint8Array()
                    
                    do {
                        LR.log(pluginName, '    +-- new data:', filedata.done, filedata.value.length)
                        var newContent = new Uint8Array(content.length + filedata.value.length);
                        newContent.set(content)
                        newContent.set(filedata.value, content.length)
                        content = newContent
                        filedata = await source.next()
                    } while (! filedata.done)
                    
                    LR.log(pluginName, '+-- got a DNSLink-resolved IPFS-stored file; content is: ' + typeof content);
                    
                    // let's guess the content type
                    let contentType = await LR.guessMimeType(
                                                dnslinkAddr.split('.').pop().toLowerCase(),
                                                content
                                            )
                    
                    // creating and populating the blob
                    let blob = new Blob(
                            [content],
                            {'type': contentType}
                        );

                    return new Response(
                        blob,
                        {
                            'status': 200,
                            'statusText': 'OK',
                            'headers': {
                                'Content-Type': contentType,
                                'ETag': 'WOLOLO',
                                'X-LibResilient-Method': pluginName,
                                'X-LibResilient-ETag': 'WOLOLO'
                            }
                        }
                    );
                } else {
                    LR.log(pluginName, '+-- IPFS retrieval failed: no content.')
                    throw new Error('IPFS retrieval failed: no content.')
                };
            });
        }


        /* ========================================================================= *\
        |* === Publishing stuff                                                  === *|
        \* ========================================================================= */
        /*
        * TODO: to be implemented
        */
        let publishContent = (resource, user, password) => {
            throw new Error("Not implemented yet.")
        }

        /* ========================================================================= *\
        |* === Initialization                                                    === *|
        \* ========================================================================= */

        // we probably need to handle this better
        ipfsPromise = setup_ipfs();


        // and add ourselves to it
        // with some additional metadata
        return {
            name: pluginName,
            description: 'Decentralized resource fetching using DNSLink for content address resolution and IPFS for content delivery.',
            version: 'COMMIT_UNKNOWN',
            fetch: getContentFromDNSLinkAndIPFS,
            publish: publishContent
        }

    })
// done with not polluting the global namespace
})(LibResilientPluginConstructors)
