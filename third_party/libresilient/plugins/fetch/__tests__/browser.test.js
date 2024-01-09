import {
    describe,
    it,
    afterEach,
    beforeEach
} from "https://deno.land/std@0.183.0/testing/bdd.ts";

import {
    assert,
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
})

afterEach(()=>{
    window.fetch = null
})

describe('browser: fetch plugin', async () => {
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
    await import("../../../plugins/fetch/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(LibResilientPluginConstructors.get('fetch')(LR).name, 'fetch');
    });
    
    it("should return data from fetch()", async () => {
        const response = await LibResilientPluginConstructors.get('fetch')(LR).fetch('https://resilient.is/test.json');
        
        assertSpyCalls(fetch, 1);
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should pass the Request() init data to fetch()", async () => {
        var initTest = {
            method: "GET",
            headers: new Headers({"x-stub": "STUB"}),
            mode: "mode-stub",
            credentials: "credentials-stub",
            cache: "cache-stub",
            referrer: "referrer-stub",
            redirect: "redirect-stub",
            integrity: "integrity-stub"
        }
        const response = await LibResilientPluginConstructors.get('fetch')(LR).fetch('https://resilient.is/test.json', initTest);    
        assertSpyCall(
            fetch,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    initTest // TODO: does the initTest actually properly work here?
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should set the LibResilient headers", async () => {        
        const response = await LibResilientPluginConstructors.get('fetch')(LR).fetch('https://resilient.is/test.json');
        
        assertSpyCalls(fetch, 1);
        assertEquals(await response.json(), {test: "success"})
        
        assertEquals(response.headers.has('X-LibResilient-Method'), true)
        assertEquals(response.headers.get('X-LibResilient-Method'), 'fetch')
        assertEquals(response.headers.has('X-LibResilient-Etag'), true)
        assertEquals(response.headers.get('X-LibResilient-ETag'), 'TestingETagHeader')
    });
    
    it("should throw an error when HTTP status is >= 400", async () => {
        window.fetch = (url, init) => {
                const response = new Response(
                                    new Blob(
                                        ["Not Found"],
                                        {type: "text/plain"}
                                    ),
                                    {
                                        status: 404,
                                        statusText: "Not Found",
                                        url: url
                                    });
                return Promise.resolve(response);
            }
        assertRejects(
            async () => {
                return await LibResilientPluginConstructors
                                .get('fetch')(LR)
                                .fetch('https://resilient.is/test.json') },
            Error,
            'HTTP Error: 404 Not Found'
        )
    });
    
})
