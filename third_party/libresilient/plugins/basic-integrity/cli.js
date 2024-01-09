/* ========================================================================= *\
|* === basic-integrity: pre-configured subresource integrity for content === *|
\* ========================================================================= */

/**
 * basic-integrity plugin's deploy/utility functions
 * 
 * this code expects a Deno runtime:
 * https://deno.land/
 */


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
 * get integrity digests for a given path
 * 
 * path  - path to a file whose digest is to be generated
 * algos - array of SubtleCrypto.digest-compatible algorithm names
 */
let getFileIntegrity = async (path, algos) => {
    
    var result = []
    var content = false
    
    // open the file and get some info on it
    const file = await Deno.open(
                                path,
                                { read: true }
                            );
    const fileInfo = await file.stat();
    
    // are we working with a file?
    if (fileInfo.isFile) {
        
        // initialize
        content = new Uint8Array()
        var buf = new Uint8Array(1000);
        
        // read the first batch
        var numread = file.readSync(buf);
        
        // read the rest, if there is anything to read
        while (numread !== null) {
            //console.log(`    +-- read: ${numread}`)
            //console.log(`        +-- length: ${content.length}`)
            
            // there has to be a better way...
            var new_content = new Uint8Array(content.length + numread);
            //console.log(`        +-- new length: ${new_content.length}`)
            new_content.set(content)
            if (buf.length === numread) {
                new_content.set(buf, content.length)
            } else {
                new_content.set(buf.slice(0, numread), content.length)
            }
            content = new_content
            
            // read some more
            numread = file.readSync(buf);
        }
    }
    
    // putting this in a try-catch block as the file
    // is apparently being auto-closed?
    // https://issueantenna.com/repo/denoland/deno/issues/15442
    try {
        await file.close();
    } catch (BadResource) {}
    
    // did we get any content?
    if (typeof content != "boolean") {
        for (const algo of algos) {
            //console.log(`    +-- ${algo}`)
            var digest = algo.toLowerCase().replace('-', '') + '-' + binToBase64(await crypto.subtle.digest(algo, content))
            //console.log(digest)
            result.push(digest)
        }
    // no content means not a file
    } else {
        // so no result
        result = false
    }
    
    // return the result
    return result
}


/**
 * get integrity data for specified urls, using specified algorithms
 * 
 * naming of algorithms as accepted by SubtleCrypto.digest():
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 * 
 * paths - array of strings, paths to individual pieces of content 
 * algos - array of algorithms to use to calculate digests (default: "SHA-256")
 */
let getIntegrity = async (paths, algos=["SHA-256"], output="json") => {
    
    // we need non-emtpy arrays of string in the arguments
    if (!Array.isArray(paths) || (paths.length == 0)) {
        throw new Error("Expected non-empty list of files to generate digests of.")
    }
    if (!Array.isArray(algos) || (algos.length == 0)) {
        throw new Error("Expected non-empty list of algorithms to use.")
    }
    if (!['json', 'text'].includes(output)) {
        throw new Error("Expected either 'json' or 'text' as output type to generate.")
    }
    
    var result = {}
    for (const p of paths) {
        // filter-out stuff we are not interested in
        // like directories etc
        var r = await getFileIntegrity(p, algos)
        if (r !== false) {
            result[p] = r
        }
    }
    
    if (output == 'json') {
        return JSON.stringify(result)
    } else {
        var text_result = ''
        for (const p of paths) {
            text_result += `${p}: ${result[p].join(' ')}\n`
        }
        return text_result
    }
}


// this never changes
const pluginName = "basic-integrity"
const pluginDescription = "Verifying subresource integrity for resources fetched by other plugins.\nCLI used to generate subresource integrity hashes for provided files."
const pluginVersion = 'COMMIT_UNKNOWN'
const pluginActions = {
    "get-integrity": {
        run: getIntegrity,
        description: "calculate subresource integrity hashes for provided files",
        arguments: {
            _: {
                name: "file",
                description: "paths of files to be processed"
            },
            algorithm: {
                description: "SubtleCrypto.digest-compatible algorithm names to use when calculating digests (default: \"SHA-256\")",
                collect: true,
                string: true,
                default: "SHA-256"
            },
            output: {
                description: "a string, defining output mode ('json' or 'text'; 'json' is default)",
                collect: false,
                string: true,
                default: "json"
            }
        }
    }
}

export {
    pluginName as name,
    pluginDescription as description,
    pluginVersion as version,
    pluginActions as actions
}
