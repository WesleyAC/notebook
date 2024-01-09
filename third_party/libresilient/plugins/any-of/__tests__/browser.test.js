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
        name: 'any-of',
        uses: [
            LibResilientPluginConstructors.get('fetch')(LR),
            {
                name: 'reject-all',
                description: 'Rejects all',
                version: '0.0.1',
                fetch: url=>Promise.reject('Reject All!')
            }
        ]
    }
})

afterEach(()=>{
    window.fetch = null
    window.init = null
})

describe('browser: any-of plugin', async () => {
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
    await import("../../../plugins/any-of/index.js");
    // we need the fetch plugin in our testing
    await import("../../../plugins/fetch/index.js");
    
    it("should register in LibResilientPluginConstructors", async () => {
        assertEquals(
            LibResilientPluginConstructors
                .get('any-of')(LR, init)
                .name,
            'any-of');
    });
    
    it("should throw an error when there aren't any wrapped plugins configured", async () => {
        init = {
            name: 'any-of',
            uses: []
        }
        
        assertThrows(()=>{
            return LibResilientPluginConstructors
                            .get('any-of')(LR, init)
                            .fetch('https://resilient.is/test.json')
            },
            Error,
            'No wrapped plugins configured!'
        )
    });
    
    it("should return data from a wrapped plugin", async () => {
        
        const response = await LibResilientPluginConstructors.get('any-of')(LR, init).fetch('https://resilient.is/test.json');
        
        assertSpyCalls(fetch, 1)
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should pass Request() init data onto wrapped plugins", async () => {
        
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
        
        const response = await LibResilientPluginConstructors.get('any-of')(LR, init).fetch('https://resilient.is/test.json', initTest);
        
        assertSpyCalls(fetch, 1);
        assertSpyCall(fetch, 0, {
            args: ['https://resilient.is/test.json', initTest]
        })
        assertEquals(await response.json(), {test: "success"})
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
                                .get('any-of')(LR, init)
                                .fetch('https://resilient.is/test.json') },
            AggregateError,
            'All promises were rejected'
        )
        assertSpyCalls(fetch, 1);
    });
})
