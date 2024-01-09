import {
    describe,
    it,
    beforeEach,
    beforeAll
} from "https://deno.land/std@0.183.0/testing/bdd.ts";

import {
    assertThrows,
    assertRejects,
    assertEquals
} from "https://deno.land/std@0.183.0/testing/asserts.ts";

import {
    assertSpyCall,
    assertSpyCalls,
    spy,
} from "https://deno.land/std@0.183.0/testing/mock.ts";
  
async function generateECDSAKeypair() {
    return await crypto.subtle.generateKey({
            name: "ECDSA",
            namedCurve: "P-384"
        },
        true,
        ["sign", "verify"]
    );
}

async function getArmouredKey(key) {
    return JSON.stringify(await crypto.subtle.exportKey('jwk', key))
}

function jwtize(str) {
    return btoa(str)
            .replace(/\//g, '_')
            .replace(/\+/g, '-')
            .replace(/=/g, '')
}

/**
 * k - keypair
 * h - header
 * p - payload
 */
async function getSignature(k, h, p) {
    
    // we need a TextEncoder
    var tenc = new TextEncoder()
    var tencoded = tenc.encode(h + '.' + p)
    
    // prepare a signature
    var sig = new Uint8Array(await crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: {name: "SHA-384"}
        },
        k.privateKey,
        tencoded
    ))
    
    // prepare it for inclusion in a JWT
    var sig = sig.reduce((str, cur)=>{return (str + String.fromCharCode(cur)) }, '')
    return jwtize(sig)
}

beforeAll(async ()=>{
    // our keypair
    var keypair = await generateECDSAKeypair()

    // ES384: ECDSA using P-384 and SHA-384
    var header = jwtize('{"alg": "ES384"}')
    var payload = jwtize('{"integrity": "sha256-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0="}')
    
    // get a signature
    var signature = await getSignature(keypair, header, payload)
    
    // need to test with bad algo!
    var noneHeader = jwtize('{"alg": "none"}')

    // get an invalid signature
    // an ECDSA signature for {alg: none} header makes zero sense
    var noneSignature = await getSignature(keypair, noneHeader, payload)

    // prepare stuff for invalid JWT JSON test
    var invalidPayload = jwtize('not a valid JSON string')
    // get an valid signature for invalid payload
    var invalidPayloadSignature = await getSignature(keypair, header, invalidPayload)

    // prepare stuff for JWT payload without integrity test
    var noIntegrityPayload = jwtize('{"no": "integrity"}')
    // get an valid signature for invalid payload
    var noIntegrityPayloadSignature = await getSignature(keypair, header, noIntegrityPayload)
    
    window.resolvingFetch = (url, init)=>{
                                var content = '{"test": "success"}'
                                var status = 200
                                var statusText = "OK"
                                
                                if (url == 'https://resilient.is/test.json.integrity') {
                                    content = header + '.' + payload + '.' + signature
                                // testing 404 not found on the integrity URL
                                } else if (url == 'https://resilient.is/not-found.json.integrity') {
                                    content = '{"test": "fail"}'
                                    status = 404
                                    statusText = "Not Found"
                                // testing invalid base64-encoded data
                                } else if (url == 'https://resilient.is/invalid-base64.json.integrity') {
                                    // for this test to work correctly the length must be (n*4)+1
                                    content = header + '.' + payload + '.' + 'badbase64'
                                // testing "alg: none" on the integrity JWT
                                } else if (url == 'https://resilient.is/alg-none.json.integrity') {
                                    content = noneHeader + '.' + payload + '.'
                                // testing bad signature on the integrity JWT
                                } else if (url == 'https://resilient.is/bad-signature.json.integrity') {
                                    content = header + '.' + payload + '.' + noneSignature
                                // testing invalid payload
                                } else if (url == 'https://resilient.is/invalid-payload.json.integrity') {
                                    content = header + '.' + invalidPayload + '.' + invalidPayloadSignature
                                // testing payload without integrity data
                                } else if (url == 'https://resilient.is/no-integrity.json.integrity') {
                                    content = header + '.' + noIntegrityPayload + '.' + noIntegrityPayloadSignature
                                }
                                
                                return Promise.resolve(
                                    new Response(
                                        [content],
                                        {
                                            type: "application/json",
                                            status: status,
                                            statusText: statusText,
                                            headers: {
                                            'ETag': 'TestingETagHeader'
                                            },
                                            url: url
                                        }
                                    )
                                )
                            }
    
    window.initPrototype = {
        name: 'signed-integrity',
        uses: [
            {
                name: 'resolve-all',
                description: 'Resolves all',
                version: '0.0.1',
                fetch: null
            }
        ],
        integrity: {
            "https://resilient.is/test.json": "sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z"
        },
        //requireIntegrity: false, // default is false
        publicKey: await crypto.subtle.exportKey('jwk', keypair.publicKey)
    }
})

/**
 * we need to do all of this before each test in order to reset the fetch() use counter
 * and make sure window.init is clean and not modified by previous tests
 */
beforeEach(()=>{
    window.fetch = spy(window.resolvingFetch)
    window.init = {
        ...window.initPrototype
    }
    window.init.uses[0].fetch = window.fetch
})

describe('browser: signed-integrity plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            }
        }
    
    window.resolvingFetch = null
    window.fetch = null
    window.subtle = crypto.subtle
    
    await import("../../../plugins/signed-integrity/index.js");
    
    it("should register in LibResilientPluginConstructors", async () => {
        assertEquals(
            LibResilientPluginConstructors
                .get('signed-integrity')(LR, init)
                .name,
            'signed-integrity');
    });
    
    it("should throw an error when there aren't any wrapped plugins configured", () => {
        init = {
            name: 'signed-integrity',
            uses: []
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init)
            },
            Error,
            'Expected exactly one plugin to wrap, but 0 configured.'
        )
    });
    
    it("should throw an error when there are more than one wrapped plugins configured", () => {
        init = {
            name: 'signed-integrity',
            uses: ['plugin-one', 'plugin-two']
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init)
            },
            Error,
            'Expected exactly one plugin to wrap, but 2 configured.'
        )
    });
    
    it("should throw an error if the configured public key is impossible to load", async () => {
        
        var testInit = {
            ...window.init
        }
        testInit.publicKey = 'NOTAKEY'
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors.get('signed-integrity')(LR, testInit).fetch('https://resilient.is/test.json')
            },
            Error,
            'Unable to load the public key'
        )
    });
    
    /*
     * we're only testing if signed-integrity plugin accepts that integrity data is set
     * without pulling the .integrity file
     * 
     * this will *not* result in the resource integrity *actually* being checked!
     */
    it("should fetch content when integrity data provided without trying to fetch the integrity data URL", async () => {
    
        const response = await LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/test.json', {
            integrity: "sha384-x4iqiH3PIPD51TibGEhTju/WhidcIEcnrpdklYEtIS87f96c4nLyj6CuwUp8kyOo"
        });
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 1);
    });
    
    it("should fetch content when integrity data not provided, by also fetching the integrity data URL", async () => {
        
        const response = await LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/test.json', {});
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 2)
        // the integrity file fetch has to happen first
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json.integrity']
        })
        // the content fetch needs to have integrity data available
        assertSpyCall(fetch, 1, {
            args: [
                "https://resilient.is/test.json",
                {
                    integrity: "sha256-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0=",
                }
            ]
        })
    });
    
    it("should fetch content when integrity data not provided, and integrity data URL 404s", async () => {
        
        const response = await LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/not-found.json', {});
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 2)
        // the integrity file fetch has to happen first
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/not-found.json.integrity']
        })
        // the content fetch needs to have integrity data available
        assertSpyCall(fetch, 1, {
            args: [
                "https://resilient.is/not-found.json",
                {}
            ]
        })
    });
    
    it("should refuse to fetch content when integrity data not provided and integrity data URL 404s, but requireIntegrity is set to true", async () => {
        
        init.requireIntegrity = true
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/not-found.json', {})
            },
            Error,
            'No integrity data available, though required.'
        )
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/not-found.json.integrity']
        })
        
        //expect(e.toString()).toMatch('No integrity data available, though required.')
    });
    
    it("should refuse to fetch content when integrity data not provided and integrity data URL is fetched, but JWT is invalid", async () => {
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/invalid-base64.json', {})
            },
            Error,
            'Invalid base64-encoded string!'
        )
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/invalid-base64.json.integrity']
        })
    });
    
    it("should refuse to fetch content when integrity data not provided and integrity data URL is fetched, but JWT uses alg: none", async () => {
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/alg-none.json', {})
            },
            Error,
            'JWT seems invalid (one or more sections are empty).'
        )
        
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/alg-none.json.integrity']
        })
    });
    
    it("should refuse to fetch content when integrity data not provided and integrity data URL is fetched, but JWT signature check fails", async () => {
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/bad-signature.json', {})
            },
            Error,
            'JWT signature validation failed! Somebody might be doing something nasty!'
        )
        
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/bad-signature.json.integrity']
        })
    });
    
    it("should refuse to fetch content when integrity data not provided and integrity data URL is fetched, but JWT payload is unparseable", async () => {
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/invalid-payload.json', {})
            },
            Error,
            'JWT payload parsing failed'
        )
        
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/invalid-payload.json.integrity']
        })
    });
    
    it("should refuse to fetch content when integrity data not provided and integrity data URL is fetched, but JWT payload does not contain integrity data", async () => {
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/no-integrity.json', {})
            },
            Error,
            'JWT payload did not contain integrity data'
        )
        
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/no-integrity.json.integrity']
        })
    });
    
    it("should fetch and verify content, when integrity data not provided, by fetching the integrity data URL and using integrity data from it", async () => {
        
        const response = await LibResilientPluginConstructors.get('signed-integrity')(LR, init).fetch('https://resilient.is/test.json', {});
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 2)
        // the integrity file fetch has to happen first
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json.integrity']
        })
        // the content fetch needs to have integrity data available
        assertSpyCall(fetch, 1, {
            args: [
                "https://resilient.is/test.json",
                {
                    integrity: "sha256-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0=",
                }
            ]
        })
    });
})
