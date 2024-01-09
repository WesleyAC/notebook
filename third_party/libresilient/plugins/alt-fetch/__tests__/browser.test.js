import {
    describe,
    it,
    afterEach,
    beforeEach
} from "https://deno.land/std@0.183.0/testing/bdd.ts";

import {
    assert,
    assertThrows,
    assertRejects,
    assertEquals
} from "https://deno.land/std@0.183.0/testing/asserts.ts";

import {
    assertSpyCall,
    assertSpyCalls,
    spy,
} from "https://deno.land/std@0.183.0/testing/mock.ts";

beforeEach(()=>{
    window.fetch = spy(window.resolvingFetch)
    window.init = {
        name: 'alt-fetch',
        endpoints: [
            'https://alt.resilient.is/',
            'https://error.resilient.is/',
            'https://timeout.resilient.is/'
    ]}
})

afterEach(()=>{
    window.fetch = null
    window.init = null
})

describe('browser: alt-fetch plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            }
        }
    window.resolvingFetch = (url, init) => {
                                return Promise.resolve(
                                    new Response(
                                        new Blob(
                                            [JSON.stringify({ test: "success" })],
                                            {type: "application/json"}
                                        ),
                                        {
                                            status: 200,
                                            statusText: "OK",
                                            headers: {
                                                'ETag': 'TestingETagHeader'
                                            }
                                        }
                                    )
                                )
                            }
    window.fetch = null
    window.init = null
    await import("../../../plugins/alt-fetch/index.js");
    
    it("should register in LibResilientPluginConstructors", async () => {
        assertEquals(
            LibResilientPluginConstructors
                .get('alt-fetch')(LR, init)
                .name,
            'alt-fetch');
    });
    
    it("should fail with bad config", () => {
        init = {
            name: 'alt-fetch',
            endpoints: "this is incorrect"
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('alt-fetch')(LR, init)
            },
            Error,
            'endpoints not confgured'
        )
    });
    
    it("should fetch the content, trying all configured endpoints (if fewer or equal to concurrency setting)", async () => {
        
        const response = await LibResilientPluginConstructors.get('alt-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        // default concurrency setting is 3
        assertSpyCalls(fetch, 3);
        assertEquals(await response.json(), {test: "success"})
    })
    
    it("should fetch the content, trying <concurrency> random endpoints out of all configured (if more than concurrency setting)", async () => {
    
        init = {
            name: 'alt-fetch',
            endpoints: [
                'https://alt.resilient.is/',
                'https://error.resilient.is/',
                'https://timeout.resilient.is/',
                'https://alt2.resilient.is/',
                'https://alt3.resilient.is/',
                'https://alt4.resilient.is/'
            ]}
        
        const response = await LibResilientPluginConstructors.get('alt-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        // default concurrency setting is 3
        assertSpyCalls(fetch, 3);
        assertEquals(await response.json(), {test: "success"})
    })
    
    it("should fetch the content, trying all endpoints (if fewer than concurrency setting)", async () => {
    
        init = {
            name: 'alt-fetch',
            endpoints: [
                'https://alt.resilient.is/',
                'https://error.resilient.is/'
            ]}
        
        const response = await LibResilientPluginConstructors.get('alt-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        // default concurrency setting is 3
        assertSpyCalls(fetch, 2);
        assertSpyCall(fetch, 0, {
            args: ['https://alt.resilient.is/test.json', {"cache": "reload"}]
        })
        assertSpyCall(fetch, 1, {
            args: ['https://error.resilient.is/test.json', {"cache": "reload"}]
        })
        assertEquals(await response.json(), {test: "success"})
    })
    
    it("should pass the Request() init data to fetch() for all used endpoints", async () => {
        
        var initTest = {
            method: "GET",
            headers: new Headers({"x-stub": "STUB"}),
            mode: "mode-stub",
            credentials: "credentials-stub",
            cache: "cache-stub",
            referrer: "referrer-stub",
            redirect: "follow-stub",
            integrity: "integrity-stub"
        }
        
        const response = await LibResilientPluginConstructors.get('alt-fetch')(LR, init).fetch('https://resilient.is/test.json', initTest);
        
        // default concurrency setting is 3
        assertSpyCalls(fetch, 3);
        
        assertSpyCall(fetch, 0, {
            args: ['https://alt.resilient.is/test.json', initTest]
        })
        assertSpyCall(fetch, 1, {
            args: ['https://error.resilient.is/test.json', initTest]
        })
        assertSpyCall(fetch, 2, {
            args: ['https://timeout.resilient.is/test.json', initTest]
        })
        
        assertEquals(await response.json(), {test: "success"})
    })
    
    it("should set the LibResilient headers", async () => {
        const response = await LibResilientPluginConstructors.get('alt-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        // default concurrency setting is 3
        assertSpyCalls(fetch, 3);
        assertEquals(await response.json(), {test: "success"})
        
        assertEquals(response.headers.has('X-LibResilient-Method'), true)
        assertEquals(response.headers.get('X-LibResilient-Method'), 'alt-fetch')
        assertEquals(response.headers.has('X-LibResilient-Etag'), true)
        assertEquals(response.headers.get('X-LibResilient-ETag'), 'TestingETagHeader')
    });
    
    it("should set the LibResilient ETag based on Last-Modified header (if ETag is not available in the original response)", async () => {
        window.fetch = spy((url, init) => {
                                return Promise.resolve(
                                    new Response(
                                        new Blob(
                                            [JSON.stringify({ test: "success" })],
                                            {type: "application/json"}
                                        ),
                                        {
                                            status: 200,
                                            statusText: "OK",
                                            headers: {
                                                'Last-Modified': 'TestingLastModifiedHeader'
                                            }
                                        }
                                    )
                                )
                            });

        const response = await LibResilientPluginConstructors.get('alt-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        assertSpyCalls(fetch, 3);
        assertEquals(await response.json(), {test: "success"})
        
        assertEquals(response.headers.has('X-LibResilient-Method'), true)
        assertEquals(response.headers.get('X-LibResilient-Method'), 'alt-fetch')
        assertEquals(response.headers.has('X-LibResilient-Etag'), true)
        assertEquals(response.headers.get('X-LibResilient-ETag'), 'TestingLastModifiedHeader')
    });
    
    it("should throw an error when HTTP status is >= 400", async () => {
        window.fetch = spy((url, init) => {
                                return Promise.resolve(
                                    new Response(
                                        new Blob(
                                            ["Not Found"],
                                            {type: "text/plain"}
                                        ),
                                        {
                                            status: 404,
                                            statusText: "Not Found"
                                        }
                                    )
                                )
                            });

        assertRejects(
            async () => {
                return await LibResilientPluginConstructors
                                .get('alt-fetch')(LR)
                                .fetch('https://resilient.is/test.json') },
            Error,
            'All promises were rejected'
        )
    });
})
