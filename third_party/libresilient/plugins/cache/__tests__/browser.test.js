import {
    describe,
    it,
    beforeEach,
    beforeAll
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

beforeAll(async ()=>{
    window.fetchResponse = []
    window.resolvingFetch = (url, init) => {
                                const response = new Response(
                                    new Blob(
                                        [JSON.stringify(window.fetchResponse[0])],
                                        {type: window.fetchResponse[1]}
                                    ),
                                    {
                                        status: 200,
                                        statusText: "OK",
                                        headers: {
                                            'Last-Modified': 'TestingLastModifiedHeader',
                                            'ETag': 'TestingETagHeader'
                                        },
                                        url: url
                                    });
                                return Promise.resolve(response);
                            }
    
    /*
     * prototype of the plugin init object
     */
    window.initPrototype = {
        name: 'cache'
    }
})

/**
 * we need to do all of this before each test in order to reset the fetch() use counter
 * and make sure window.init is clean and not modified by previous tests
 */
beforeEach(async ()=>{
    window.fetch = spy(window.resolvingFetch)
    window.fetchResponse = [
        {test: "success"},
        "application/json"
    ]
    window.init = {
        ...window.initPrototype
    }
    // clear the caches
    await caches
        .has('v1')
        .then(async (hasv1) => {
            if (hasv1) {
                await caches.delete('v1')
            }
        })
})

describe('browser: cache plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            }
        }
    
    window.fetchResponse = []
    window.resolvingFetch = null
    window.fetch = null
    
    await import("../../../plugins/cache/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(
            LibResilientPluginConstructors
                .get('cache')(LR, init)
                .name,
            'cache'
        );
    });
    
    it("should error out if resource is not found in cache", async () => {
        // nothing got stashed so nothing is there to be retrieved
        await assertRejects(
            ()=>{
                return LibResilientPluginConstructors
                        .get('cache')(LR)
                        .fetch('https://resilient.is/test.json')
            },
            Error,
            'Resource not found in cache'
        )
    });
    
    it("should stash and retrieve an url successfully", async () => {
        
        let cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        
        // stash
        let stashResult = await cachePlugin
                                    .stash('https://resilient.is/test.json')
        assertEquals(stashResult, undefined, "stashResult should be undefined");
        
        // retrieve and verify
        let fetchResult = await cachePlugin
                                    .fetch('https://resilient.is/test.json')
                                    
        assert(fetchResult.ok, "fetchResult.ok is false")
        assertEquals(fetchResult.status, 200, "fetchResult.status is not 200")
        assertEquals(fetchResult.statusText, 'OK', "fetchResult.statusText is not 'OK'")
        
        assert(fetchResult.headers.has('etag'), "fetchResult.headers does not contain 'ETag'")
        assertEquals(fetchResult.headers.get('ETag'), 'TestingETagHeader')
        
        let fetchedJSON = await fetchResult.json()
        assertEquals(
            fetchedJSON,
            { test: "success" },
            "fetchedJSON is incorrect: " + JSON.stringify(fetchedJSON))
    });
    
    it("should clear a url from cache successfully", async () => {
        
        let cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        
        // stash
        let stashResult = await cachePlugin
                                    .stash('https://resilient.is/test.json')
        assertEquals(stashResult, undefined, "stashResult should be undefined");
        
        // unstash
        let unstashResult = await cachePlugin
                                    .unstash('https://resilient.is/test.json')
        assertEquals(unstashResult, true, "unstashResult should be true")
        
        // verify
        await assertRejects(
            ()=>{
                return LibResilientPluginConstructors
                        .get('cache')(LR)
                        .fetch('https://resilient.is/test.json')
            },
            Error,
            'Resource not found in cache'
        )
    });

    it("should stash an array of urls successfully", async () => {
        
        let cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        let urls = [
            'https://resilient.is/test.json',
            'https://resilient.is/test2.json'
        ]
        
        // stash
        let stashResult = await cachePlugin.stash(urls)
        assertEquals(
            stashResult,
            undefined,
            "stashResult should be undefined");
        
        // retrieve and verify
        await Promise.all(
            urls.map(async (url)=>{
                let fetchResult = await cachePlugin.fetch(url)
                assert(fetchResult.ok, "fetchResult.ok is false")
                assertEquals(fetchResult.status, 200, "fetchResult.status is not 200")
                assertEquals(fetchResult.statusText, 'OK', "fetchResult.statusText is not 'OK'")
                assert(fetchResult.headers.has('etag'), "fetchResult.headers does not contain 'ETag'")
                assertEquals(fetchResult.headers.get('ETag'), 'TestingETagHeader')
                
                let fetchedJSON = await fetchResult.json()
                assertEquals(
                    fetchedJSON,
                    { test: "success" },
                    "fetchedJSON is incorrect: " + JSON.stringify(fetchedJSON))
            })
        )
    });
    
    it("should clear an array of urls successfully", async () => {
        
        var cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        let urls = [
            'https://resilient.is/test.json',
            'https://resilient.is/test2.json'
        ]
        
        // stash
        let stashResult = await cachePlugin.stash(urls)
        assertEquals(
            stashResult,
            undefined,
            "stashResult should be undefined");
        
        // unstash
        let unstashResult = await cachePlugin
                                    .unstash(urls)
        assertEquals(unstashResult, [true, true], "unstashResult should be [true, true]")
                
        // verify
        await Promise.all(
            urls.map(async (url)=>{
                await assertRejects(
                    ()=>{
                        return LibResilientPluginConstructors
                                .get('cache')(LR)
                                .fetch(url)
                    },
                    Error,
                    'Resource not found in cache',
                    'url should not have been in cache: ' + url
                )
            })
        )
    });
    
    it("should error out when stashing a Response without a url/key", async () => {
        
        const response = new Response(
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
                                });
        
        await assertRejects(
                    ()=>{
                        return LibResilientPluginConstructors
                                .get('cache')(LR)
                                .stash(response)
                    },
                    Error,
                    'No URL to work with!'
                )
    
    });
    
    it("should stash a Response successfully", async () => {
        
        const response = new Response(
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
                                });
        // Response.url is read-only, so we need to hack around that
        Object.defineProperty(
            response,
            "url",
            {  value: 'https://resilient.is/test.json' });
        
        var cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        
        let stashResult = await cachePlugin.stash(response)
        assertEquals(
            stashResult,
            undefined,
            "stashResult should be undefined");
        
        // retrieve and verify
        let fetchResult = await cachePlugin
                                    .fetch('https://resilient.is/test.json')
                                    
        assert(fetchResult.ok, "fetchResult.ok is false")
        assertEquals(fetchResult.status, 200, "fetchResult.status is not 200")
        assertEquals(fetchResult.statusText, 'OK', "fetchResult.statusText is not 'OK'")
        // assertEquals(fetchResult.url, 'https://resilient.is/test.json', "fetchResult.url is not correct") TODO
        
        assert(fetchResult.headers.has('etag'), "fetchResult.headers does not contain 'ETag'")
        assertEquals(fetchResult.headers.get('ETag'), 'TestingETagHeader')
        
        let fetchedJSON = await fetchResult.json()
        assertEquals(
            fetchedJSON,
            { test: "success" },
            "fetchedJSON is incorrect: " + JSON.stringify(fetchedJSON))
    });
    
    it("should stash a Response with an explicit key successfully", async () => {
        
        const response = new Response(
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
                                });
        // Response.url is read-only, so we need to hack around that
        Object.defineProperty(
            response,
            "url",
            {  value: 'https://resilient.is/test.json' });
        
        var cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        
        let stashResult = await cachePlugin
                                    .stash(response, 'https://example.com/special-key')
        assertEquals(
            stashResult,
            undefined,
            "stashResult should be undefined");
        
        // retrieve and verify
        let fetchResult = await cachePlugin
                                    .fetch('https://example.com/special-key')
                                    
        assert(fetchResult.ok, "fetchResult.ok is false")
        assertEquals(fetchResult.status, 200, "fetchResult.status is not 200")
        assertEquals(fetchResult.statusText, 'OK', "fetchResult.statusText is not 'OK'")
        // assertEquals(fetchResult.url, 'https://resilient.is/test.json', "fetchResult.url is not correct") TODO
        
        assert(fetchResult.headers.has('etag'), "fetchResult.headers does not contain 'ETag'")
        assertEquals(fetchResult.headers.get('ETag'), 'TestingETagHeader')
        
        let fetchedJSON = await fetchResult.json()
        assertEquals(
            fetchedJSON,
            { test: "success" },
            "fetchedJSON is incorrect: " + JSON.stringify(fetchedJSON))
    });
    
    it("it should stash a Response with no url set but with an explicit key successfully", async () => {
        
        const response = new Response(
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
                                });
        
        var cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        
        let stashResult = await cachePlugin
                                    .stash(response, 'https://example.com/special-key')
        assertEquals(
            stashResult,
            undefined,
            "stashResult should be undefined");
        
        // retrieve and verify
        let fetchResult = await cachePlugin
                                    .fetch('https://example.com/special-key')
                                    
        assert(fetchResult.ok, "fetchResult.ok is false")
        assertEquals(fetchResult.status, 200, "fetchResult.status is not 200")
        assertEquals(fetchResult.statusText, 'OK', "fetchResult.statusText is not 'OK'")
        // assertEquals(fetchResult.url, 'https://resilient.is/test.json', "fetchResult.url is not correct") TODO
        
        assert(fetchResult.headers.has('etag'), "fetchResult.headers does not contain 'ETag'")
        assertEquals(fetchResult.headers.get('ETag'), 'TestingETagHeader')
        
        let fetchedJSON = await fetchResult.json()
        assertEquals(
            fetchedJSON,
            { test: "success" },
            "fetchedJSON is incorrect: " + JSON.stringify(fetchedJSON))
    });
    
    it("should clear a Response successfully", async () => {
        
        const response = new Response(
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
                                });
        // Response.url is read-only, so we need to hack around that
        Object.defineProperty(
            response,
            "url",
            {  value: 'https://resilient.is/test.json' });
        
        var cachePlugin = LibResilientPluginConstructors.get('cache')(LR)
        
        let stashResult = await cachePlugin
                                    .stash(response)
        assertEquals(
            stashResult,
            undefined,
            "stashResult should be undefined");
        
        // unstash
        let unstashResult = await cachePlugin
                                    .unstash('https://resilient.is/test.json')
        assertEquals(unstashResult, true, "unstashResult should be true")
        
        // verify
        await assertRejects(
            ()=>{
                return LibResilientPluginConstructors
                        .get('cache')(LR)
                        .fetch('https://resilient.is/test.json')
            },
            Error,
            'Resource not found in cache'
        )
    });
})
