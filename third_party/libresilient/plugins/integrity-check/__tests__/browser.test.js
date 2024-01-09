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

beforeAll(async ()=>{
    
    window.resolvingFetch = (url, init)=>{
                                return Promise.resolve(
                                    new Response(
                                        ['{"test": "success"}'],
                                        {
                                            type: "application/json",
                                            status: 200,
                                            statusText: "OK",
                                            headers: {
                                            'ETag': 'TestingETagHeader'
                                            },
                                            url: url
                                        }
                                    )
                                )
                            }
    
    /*
     * prototype of the plugin init object
     */
    window.initPrototype = {
        name: 'integrity-check',
        uses: [
            {
                name: 'resolve-all',
                description: 'Resolves all',
                version: '0.0.1',
                fetch: null
            }
        ]
    }
    
    /*
     * integrity data in init object to be passed to fetch()
     * for the plugin to verify
     */
    window.requestInit = {
        sha256: {
            integrity: "sha256-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0="
        },
        sha384: {
            integrity: "sha384-x4iqiH3PIPD51TibGEhTju/WhidcIEcnrpdklYEtIS87f96c4nLyj6CuwUp8kyOo"
        },
        sha512: {
            integrity: "sha512-o+J3lPk7DU8xOJaNfZI5T4Upmaoc9XOVxOWPCFAy4pTgvS8LrJZ8iNis/2ZaryU4bB33cNSXQBxUDvwDxknEBQ=="
        }
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

describe('browser: integrity-check plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            }
        }
    
    window.resolvingFetch = null
    window.fetch = null
    window.subtle = crypto.subtle
    
    await import("../../../plugins/integrity-check/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(
            LibResilientPluginConstructors
                .get('integrity-check')(LR, init).name,
            'integrity-check');
    });
    
    it("should throw an error when there aren't any wrapped plugins configured", () => {
        init = {
            name: 'integrity-check',
            uses: []
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('integrity-check')(LR, init)
            },
            Error,
            'Expected exactly one plugin to wrap, but 0 configured.'
        )
    });
    
    it("should throw an error when there are more than one wrapped plugins configured", () => {
        init = {
            name: 'integrity-check',
            uses: ['plugin-one', 'plugin-two']
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('integrity-check')(LR, init)
            },
            Error,
            'Expected exactly one plugin to wrap, but 2 configured.'
        )
    });
    
    it("should throw an error when an unsupported digest algorithm is used", async () => {

        assertRejects(async ()=>{
            return await LibResilientPluginConstructors
                                .get('integrity-check')(LR, init)
                                .fetch('https://resilient.is/test.json', {
                                    integrity: "sha000-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0="
                                })
            },
            Error,
            'No digest matched for:'
        )
    });
    
    it("it should return data from the wrapped plugin when no integrity data is available and requireIntegrity is false (default)", async () => {
        
        const response = await LibResilientPluginConstructors.get('integrity-check')(LR, init).fetch('https://resilient.is/test.json');
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json', {}]
        })
    });
    
    it("should reject no integrity data is available but requireIntegrity is true", async () => {
        
        init.requireIntegrity = true
        
        assertRejects(async ()=>{
            return await LibResilientPluginConstructors
                                .get('integrity-check')(LR, init)
                                .fetch('https://resilient.is/test.json')
            },
            Error,
            'Integrity data required but not provided for:'
        )
    });
    
    it("should check integrity and return data from the wrapped plugin if SHA-256 integrity data matches", async () => {
        
        const response = await LibResilientPluginConstructors
                                .get('integrity-check')(LR, init)
                                .fetch('https://resilient.is/test.json', requestInit.sha256);
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json', requestInit.sha256]
        })
    });
    
    it("should check integrity and return data from the wrapped plugin if SHA-384 integrity data matches", async () => {
        
        const response = await LibResilientPluginConstructors
                                .get('integrity-check')(LR, init)
                                .fetch('https://resilient.is/test.json', requestInit.sha384);
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json', requestInit.sha384]
        })
    });
    
    it("should check integrity and return data from the wrapped plugin if SHA-512 integrity data matches", async () => {
        
        const response = await LibResilientPluginConstructors
                                .get('integrity-check')(LR, init)
                                .fetch('https://resilient.is/test.json', requestInit.sha512);
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json', requestInit.sha512]
        })
    });
    
    it("should check integrity of the data returned from the wrapped plugin and reject if it doesn't match", async () => {
        
        assertRejects(async ()=>{
            return await LibResilientPluginConstructors
                            .get('integrity-check')(LR, init)
                            .fetch('https://resilient.is/test.json', {
                                integrity: "sha256-INCORRECTINCORRECTINCORRECTINCORRECTINCORREC"
                            });
            },
            Error,
            'No digest matched for:'
        )
    });
    
    it("should check integrity of the data returned from the wrapped plugin and resolve if at least one of multiple integrity hash matches", async () => {
        
        const response = await LibResilientPluginConstructors.get('integrity-check')(LR, init).fetch('https://resilient.is/test.json', {
            integrity: "sha256-INCORRECTINCORRECTINCORRECTINCORRECTINCORREC sha256-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0="
        });
        
        assertEquals(await response.json(), {test: "success"})
        assertSpyCalls(fetch, 1)
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json',
            {
                integrity: "sha256-INCORRECTINCORRECTINCORRECTINCORRECTINCORREC sha256-eiMrFuthzteJuj8fPwUMyNQMb2SMW7VITmmt2oAxGj0="
            }]
        })
    });
    
    it("should check integrity of the data returned from the wrapped plugin and reject if all out of multiple integrity hash do not match", async () => {
        
        assertRejects(async ()=>{
            return await LibResilientPluginConstructors
                            .get('integrity-check')(LR, init)
                            .fetch('https://resilient.is/test.json', {
                                integrity: "sha256-INCORRECTINCORRECTINCORRECTINCORRECTINCORREC sha256-WRONGWRONGWRONGWRONGWRONGWRONGWRONGWRONGWRON"
                            });
            },
            Error,
            'No digest matched for:'
        )
    });
})
