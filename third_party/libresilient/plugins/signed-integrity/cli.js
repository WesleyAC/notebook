/* ========================================================================= *\
|* === Signed Integrity: content integrity using signed integrity data   === *|
\* ========================================================================= */

/**
 * signed-integrity plugin's deploy/utility functions
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
 * generate an ECDSA P-384 keypair and export it as a JWK
 * https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#json_web_key
 */
let genKeypair = async () => {
    let keypair = await crypto.subtle.generateKey({
                        name: "ECDSA",
                        namedCurve: "P-384"
                    },
                    true,
                    ["sign", "verify"]
                );
    let exported_keypair = {
        publicKey: await crypto.subtle.exportKey("jwk", keypair.publicKey),
        privateKey: await crypto.subtle.exportKey("jwk", keypair.privateKey)
    }
    return JSON.stringify(exported_keypair)
}

/**
 * get a public key from a provided private key file
 * 
 * keyfile - a path to a file containing the private key
 */
let getPubkey = async (keyfile) => {
    
    // we only want to process one file
    if (Array.isArray(keyfile)) {
        keyfile = keyfile[0]
    }
    
    // we need non-empty arguments
    if ((typeof keyfile !== "string") || (keyfile == "")) {
        throw new Error("No keyfile provided.")
    }
    
    // load the key
    try {
        var keydata = JSON.parse(Deno.readTextFileSync(keyfile));
    } catch(e) {
        throw new Error(`Failed to load private key from '${keyfile}': ${e.message}`, {cause: e})
    }
    
    
    // the key can be either in a CryptoKeyPair structure, or directly in CryptoKey structure
    // standardize!
    if ("privateKey" in keydata) {
        keydata = keydata.privateKey
    }
    
    // make the key public by deleting private parts and modifying key_ops
    // ref. https://stackoverflow.com/a/57571350
    delete keydata.d;
    keydata.key_ops = ['verify']
    
    // import the key, thus making sure data is valid and makes sense
    let key = await crypto.subtle.importKey(
                        "jwk",
                        keydata,
                        {
                            name: 'ECDSA',
                            namedCurve: 'P-384'
                        },
                        true,
                        ['verify']
                    )
    
    // export it again
    return JSON.stringify(await crypto.subtle.exportKey("jwk", key))
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
        const reader = file.readable.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
        }

        let length = 0;
        for (const chunk of chunks) {
            length += chunk.length;
        }

        content = new Uint8Array(length);

        let index = 0;
        for (const chunk of chunks) {
            content.set(chunk, index);
            index += chunk.length;
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
 * generate integrity files for provided paths
 * 
 * paths     - paths to files for which integrity files are to be generated
 * keyfile   - path of the file containing the private key to use
 * algos     - array of SubtleCrypto.digest-compatible hashing algorithms (default: ["SHA-256"])
 * output    - whether to output the signed integrity data to "files", or as "text" or "json" (default)
 * extension - file extension to use when saving integrity files (default: ".integrity")
 */
let genSignedIntegrity = async (
                                paths,
                                keyfile,
                                algos=["SHA-256"],
                                output='json',
                                extension='.integrity') => {
    
    // we need non-empty arguments
    if (!Array.isArray(paths) || (paths.length == 0)) {
        throw new Error("Expected non-empty list of paths to process.")
    }
    if ((typeof keyfile !== "string") || (keyfile == "")) {
        throw new Error("No keyfile provided.")
    }
    if (!Array.isArray(algos) || (algos.length == 0)) {
        throw new Error("Expected non-empty list of algorithms to use.")
    }
    if (!['json', 'text', 'files'].includes(output)) {
        throw new Error("Expected 'json', 'text', or 'files' as output type.")
    }
    if ( (output == 'files') && ( (typeof extension !== "string") || (extension == "") ) ) {
        throw new Error("No extension provided.")
    }

    // load the key
    try {
        var keydata = JSON.parse(Deno.readTextFileSync(keyfile));
    } catch(e) {
        throw new Error(`Failed to load private key from '${keyfile}': ${e.message}`, {cause: e})
    }
    
    // the key can be either in a CryptoKeyPair structure, or directly in CryptoKey structure
    // standardize!
    if ("privateKey" in keydata) {
        keydata = keydata.privateKey
    }
    
    // import the key, thus making sure data is valid and makes sense
    let privkey = await crypto.subtle.importKey(
                            "jwk",
                            keydata,
                            {
                                name: 'ECDSA',
                                namedCurve: 'P-384'
                                
                            },
                            true,
                            ['sign']
                        )
    
    // initialize the result
    let result = {}
    
    // do the thing for each path
    for (const path of paths) {
        
        // get the integrity hash
        let integrity = await getFileIntegrity(path, algos)
        
        // if integrity is false, the path is a directory or some such
        if (integrity == false) {
            continue;
        }
        
        // JWT header
        let header = btoa('{"alg": "ES384"}').replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')
        
        // JWT payload -- the integrity hash
        // from MDN: "An integrity value may contain multiple hashes separated by whitespace.
        //            A resource will be loaded if it matches one of those hashes."
        //            https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
        let payload = btoa(`{"integrity": "${integrity.join(' ')}"}`).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')
        
        // get the signature for header + payload
        let data = new TextEncoder("utf-8").encode(header + '.' + payload)
        let signature = new Uint8Array(await crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: {name: "SHA-384"}
            },
            privkey,
            data
        ))
        // and prepare it for inclusion in the JWT
        signature = binToBase64(signature).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '')

        // put it all together
        let jwt = header + '.' + payload + '.' + signature
        
        // do we want output to text or files
        result[path] = jwt
        if (output == 'files') {
            // write it out to {path}.extension
            Deno.writeTextFileSync(path + extension, jwt)
        }
    }
    
    // return whatever we have to return
    if (output == 'json') {
        return JSON.stringify(result);
    } else if (output == 'text') {
        return Object.keys(result).map(p=>`${p}: ${result[p]}`).join('\n') + '\n'
    } else if (output == 'files') {
        return "created integrity files:\n" + Object.keys(result).map(p=>`- ${p}${extension}`).join('\n') + "\n"
    }
}

// this never changes
const pluginName = "signed-integrity"
const pluginDescription = "Fetching signed integrity data and using it to verify content.\nCLI used to generate subresource integrity tokens and save them in integrity files."
const pluginVersion = 'COMMIT_UNKNOWN'
const pluginActions = {
    "gen-keypair": {
        run: genKeypair,
        description: "generate a keypair and export it as a JSON Web Key"
    },
    "get-pubkey": {
        run: getPubkey,
        description: "print out a public key derived from the provided private key",
        arguments: {
            '_': {
                name: "keyfile",
                description: "file containing the private key in JSON Web Key format"
            }
        }
    },
    "gen-integrity": {
        run: genSignedIntegrity,
        description: "generate integrity files for given paths",
        arguments: {
            '_': {
                name: "file",
                description: "paths to generate signed integrity files for"
            },
            keyfile: {
                description: "path to the file containing a private key in JSON Web Key format",
                string: true
            },
            algorithm: {
                description: "SubtleCrypto.digest-compatible algorithm names to use when calculating digests (default: \"SHA-256\")",
                collect: true,
                string: true,
                default: "SHA-256"
            },
            output: {
                description: "output mode: 'files', 'text', or 'json'",
                default: 'json',
                string: true
            },
            extension: {
                description: "file extension to use when saving integrity files",
                default: '.integrity',
                string: true
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
