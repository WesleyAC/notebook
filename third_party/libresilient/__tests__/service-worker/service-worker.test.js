import {
    describe,
    it,
    beforeEach,
    beforeAll,
    afterEach
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

/*
 * mocking the FetchEvent class
 * https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent
 */
class FetchEvent extends Event {
    request = null
    response = null
    constructor(request, init=null) {
        super('fetch')
        if (typeof request == "string") {
            if (request.indexOf('http') != 0) {
                request = window.location.origin + request
            }
            if (init == null) {
                request = new Request(request)
            } else {
                request = new Request(request, init)
            }
        }
        this.request = request
    }
    clientId = 'libresilient-tests'
    respondWith(a) {
        this.response = a
    }
    waitForResponse() {
        return new Promise(async (resolve, reject)=>{
            while (this.response === null) {
                await new Promise(resolve => setTimeout(resolve, 1))
            }
            resolve(this.response)
        })
    }
}

beforeAll(async ()=>{
    
    // default mocked response data
    let responseMockedData = {
        data: JSON.stringify({test: "success"}),
        type: "application/json",
        status: 200,
        statusText: "OK",
        headers: {
            'Last-Modified': 'TestingLastModifiedHeader',
            'ETag': 'TestingETagHeader'
        }
    }
    // get a Promise resolvint to a mocked Response object built based on supplied data
    window.getMockedResponse = (url, init, response_data={}) => {
                                let rdata = {
                                    ...responseMockedData,
                                    ...response_data
                                }
                                let response = new Response(
                                    new Blob(
                                        [rdata.data],
                                        {type: rdata.type}
                                    ),
                                    {
                                        status: rdata.status,
                                        statusText: rdata.statusText,
                                        headers: rdata.headers
                                    });
                                // Response.url is read-only, so we have 
                                Object.defineProperty(
                                    response,
                                    "url",
                                    { value: url }
                                );
                                return Promise.resolve(response);
                            }
    // get a mocked fetch()-like function that returns a Promise resolving to the above
    window.getMockedFetch = (response_data={}) => {
        return (url, init)=>{
            return window.getMockedResponse(url, init, response_data)
        }
    }
    
    /*
     * prototype of the plugin init object
     */
    window.initPrototype = {
        name: 'cache'
    }
    
    /*
     * mocking our own ServiceWorker API, sigh!
     * https://github.com/denoland/deno/issues/5957#issuecomment-985494969
     */
    window.registration = {
        scope: "https://test.resilient.is/",
        unregister: ()=>{}
    }
    
    /*
     * mocking caches.match()
     * https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage/match#browser_compatibility
     */
    caches.match = async (url) => {
        let cache = await caches.open('v1')
        return cache.match(url)
    }
    
    /*
     * mocking Event.waitUntil()
     * https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil#browser_compatibility
     */
    Event.prototype.waitUntil = async (promise) => {
        await promise
    }
    
    /*
     * mocking importScriptsPrototype
     */
    window.importScriptsPrototype = (script) => {
        let plugin = null
        try {
            plugin = script.split('/')[2]
        } catch (e) {}
        if (plugin === null) {
            // ignoring errors here — these happen when we're not actually loading a plugin
            return false
        }
        window
            .LibResilientPluginConstructors
            .set(
                plugin,
                window.LibResilientPluginConstructorsPrototype.get(plugin)
            )
    }
    
    window.LRLogPrototype = (component, ...items)=>{
                                console.debug(component + ' :: ', ...items)
                            }
    
    /*
     * mocking window.clients
     */
    window.clients = {
        get: async (id) => {
            // always return the same client, we care only about postMessage() working
            // and getting the messages
            return {
                // that's the only thing we need
                // this allows us to spy on client.postMessage() calls issued by the service worker
                postMessage: window.clients.prototypePostMessage
            }
        },
        // the actual spy function must be possible to reference
        // but we want spy data per test, so we set it properly in beforeEach()
        prototypePostMessage: null
    }
    
    // we need to be able to reliably wait for SW installation
    // which is triggered by an "install" Event
    window.sw_install_ran = false
    
    // override addEventListener in order to override the callback
    // and to keep track of event listeners that we need to remove in afterEach()
    window.event_listeners = new Array()
    window.addEventListenerOrig = window.addEventListener
    window.addEventListener = async (evtype, func) => {
        // normally we want the handler to be what it says on the packaging
        let handler = func
        // but for "install" type event… we actually want to wrap it such that
        // we can then await for it
        if (evtype == 'install') {
            handler = async (ev) => {
                let result = await func(ev);
                window.sw_install_ran = true;
                return result;
            }
        }
        // adding to the list of installed event listeners
        window.event_listeners.push([evtype, handler])
        // we're done
        return await window.addEventListenerOrig(evtype, handler)
    }
    
    // wait for SW installation 
    window.waitForSWInstall = () => {
        return new Promise(async (resolve, reject)=>{
            while (!window.sw_install_ran) {
                await new Promise(resolve => setTimeout(resolve, 1))
            }
            resolve(true)
        })
    }
    
    // wait for caching of a URL, looped up to `tries` times
    window.waitForCacheAction = (url, action="add", tries=100) => {
        if (action != "add" && action != "remove") {
            throw new Error('waitForCacheAction()\'s action parameter can only be "add" or "remove".')
        }
        console.log('*** WAITING FOR CACHE ACTION:', action, '\n - url:', url)
        return new Promise(async (resolve, reject)=>{
            // get the cache object
            let cache = await caches.open('v1')
            // try to match until we succeed, or run out of tries
            for (let i=0; i<tries; i++) {
                // search the URL
                let cache_result = await cache.match(url)
                // waiting for content to be added to cache?
                if (action === "add") {
                    if (cache_result != undefined) {
                        // we have to "use" the Response, otherwise we get an error:
                        // 
                        // > A "CacheResponseResource" resource (rid 7) was created during
                        // > the test, but not cleaned up during the test. Close the resource
                        // > before the end of the test.
                        return resolve(await cache_result.text())
                    }
                // waiting for content to be removed from cache?
                } else if (action === "remove") {
                    if (cache_result === undefined) {
                        return resolve(undefined)
                    }
                    // as above, we need to "use" the resource
                    await cache_result.text()
                }
                await new Promise(resolve => setTimeout(resolve, 1))
            }
            return reject("Ran out of tries");
        })
    }
    
    /*
     * importScripts mock relies on all plugins being loaded here
     * TODO: automagically load the list from the plugins directory
     */
    let plugins = [
        "alt-fetch",
        "any-of",
        "basic-integrity",
        "cache",
        "dnslink-fetch",
        "dnslink-ipfs",
        "fetch",
        "gun-ipfs",
        "integrity-check",
        "ipns-ipfs",
        "redirect",
        "signed-integrity",
    ]
    await Promise.all(
        plugins.map(async (plugin)=>{
            await import(`../../plugins/${plugin}/index.js`)
        })
    )
    window.LibResilientPluginConstructorsPrototype = window.LibResilientPluginConstructors
    window.LibResilientPluginConstructors = new Map()
})

/**
 * we need to do all of this before each test in order to reset the fetch() use counter
 * and make sure window.init is clean and not modified by previous tests
 */
beforeEach(async ()=>{
    window.fetch = spy(window.getMockedFetch())
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
    // make sure we're starting with a clean slate in LibResilientPluginConstructors
    window.LibResilientPluginConstructors = new Map()
    // keeping track of whether the SW got installed
    window.sw_install_ran = false
    // cleanup
    self.LibResilientConfig = null
    self.LibResilientPlugins = null
    // postMessage spy
    window.clients.prototypePostMessage = spy((msg)=>{console.log('*** got message', msg)})
    // importScripts spy
    window.importScripts = spy(window.importScriptsPrototype)
    // LR.log spy
    window.LR.log = spy(window.LRLogPrototype)
})

/**
 * after each test we need to do a bit of cleanup
 * 
 * specifically, since we need to load the service-worker.js module anew
 * we want to clean up any side-effects of having loaded it for the previous test
 * and any side-effects of the previous test itself
 */
afterEach(async ()=>{
    while (window.event_listeners.length) {
        await window.removeEventListener(...window.event_listeners.pop());
    }
    window.test_id += 1;
})

describe('service-worker', async () => {
    
    // mocking window.location
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/location
    window.location = {
        origin: "https://test.resilient.is/"
    }
    
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: null
        }
    
    window.fetch = null
    window.importScripts = null
    
    window.test_id = 0
    
    it("should set-up LibResilientPlugins", async () => {
        // we cannot import the same module multiple times:
        // https://github.com/denoland/deno/issues/6946
        // 
        // ...so we have to use a query-param hack, sigh
        await import("../../service-worker.js?" + window.test_id);
        assert(self.LibResilientPlugins instanceof Array)
    })
    
    it("should use default LibResilientConfig values when config.json is missing", async () => {
        
        let mock_response_data = {
            data: JSON.stringify({text: "success"}),
            status: 404,
            statusText: "Not Found"
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
    
    it("should use default LibResilientConfig values when config.json not valid JSON", async () => {
        
        let mock_response_data = {
            data: "Not JSON"
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
    
    it("should use default LibResilientConfig values when no valid 'plugins' field in config.json", async () => {
        
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'fetch'], plugins: 'not a valid array'})
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
    
    it("should use default LibResilientConfig values when no valid 'loggedComponents' field in config.json", async () => {
        
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: 'not a valid array', plugins: [{name: "fetch"}]})
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
  
    it("should use default LibResilientConfig values when 'defaultPluginTimeout' field in config.json contains an invalid value", async () => {
        
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'fetch'], plugins: [{name: "fetch"}], defaultPluginTimeout: 'not an integer'})
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
    
    it("should use default LibResilientConfig values when 'normalizeQueryParams' field in config.json contains an invalid value", async () => {
        
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'fetch'], plugins: [{name: "fetch"}], defaultPluginTimeout: 5000, normalizeQueryParams: "not a boolean"})
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
    
    it("should use default LibResilientConfig values when 'useMimeSniffingLibrary' field in config.json contains an invalid value", async () => {
        
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'fetch'], plugins: [{name: "fetch"}], defaultPluginTimeout: 5000, normalizeQueryParams: false, useMimeSniffingLibrary: "not a boolean"})
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 10000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'fetch', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, true)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, false)
        assertSpyCalls(self.fetch, 1)
    })
    
    it("should use config values from a valid fetched config.json file, caching it", async () => {
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'cache'], plugins: [{name: "cache"}], defaultPluginTimeout: 5000, normalizeQueryParams: false, useMimeSniffingLibrary: true})
        }
        window.fetch = spy(window.getMockedFetch(mock_response_data))
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, "object")
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 5000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'cache'])
        assertEquals(self.LibResilientConfig.normalizeQueryParams, false)
        assertEquals(self.LibResilientConfig.useMimeSniffingLibrary, true)
        assertSpyCalls(self.fetch, 1)
        
        // cacheConfigJSON() is called asynchronously in the Service Worker,
        // if we don't make sure that the caching has completed, we will get an error.
        // so we wait until config.json is cached, and use that to verify it is in fact cached
        assertEquals(
            await window.waitForCacheAction(window.location.origin + 'config.json'),
            mock_response_data.data
        );
    })
    
    it("should instantiate a complex tree of configured plugins", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'plugin-1',
                uses: [{
                    name: 'plugin-2',
                    uses: [{
                        name: 'plugin-3'
                    }]
                },{
                    name: 'plugin-3'
                }]
            },{
                name: 'plugin-2',
                uses: [{
                    name: 'plugin-3'
                }]
            },{
                name: 'plugin-3',
                uses: [{
                    name: 'plugin-1'
                },{
                    name: 'plugin-2',
                    uses: [{
                        name: 'plugin-1',
                        uses: [{
                            name: 'plugin-4'
                        }]
                    }]
                }]
            },{
                name: 'plugin-4'
            }],
            loggedComponents: ['service-worker']
        }
    
        window.LibResilientPluginConstructors.set('plugin-1', (LRPC, config)=>{
            return {
                name: 'plugin-1',
                description: 'Plugin Type 1',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        window.LibResilientPluginConstructors.set('plugin-2', (LRPC, config)=>{
            return {
                name: 'plugin-2',
                description: 'Plugin Type 2',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        window.LibResilientPluginConstructors.set('plugin-3', (LRPC, config)=>{
            return {
                name: 'plugin-3',
                description: 'Plugin Type 3',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        window.LibResilientPluginConstructors.set('plugin-4', (LRPC, config)=>{
            return {
                name: 'plugin-4',
                description: 'Plugin Type 4',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, 'object')
        // basic stuff
        assertEquals(self.LibResilientPlugins.length, 4)
        assertEquals(self.LibResilientPlugins[0].name, 'plugin-1')
        assertEquals(self.LibResilientPlugins[1].name, 'plugin-2')
        assertEquals(self.LibResilientPlugins[2].name, 'plugin-3')
        assertEquals(self.LibResilientPlugins[3].name, 'plugin-4')
        // first plugin dependencies
        assertEquals(self.LibResilientPlugins[0].uses.length, 2)
        assertEquals(self.LibResilientPlugins[0].uses[0].name, 'plugin-2')
        assertEquals(self.LibResilientPlugins[0].uses[0].uses.length, 1)
        assertEquals(self.LibResilientPlugins[0].uses[0].uses[0].name, 'plugin-3')
        assertEquals(self.LibResilientPlugins[0].uses[0].uses[0].uses.length, 0)
        assertEquals(self.LibResilientPlugins[0].uses[1].name, 'plugin-3')
        assertEquals(self.LibResilientPlugins[0].uses[1].uses.length, 0)
        // second plugin dependencies
        assertEquals(self.LibResilientPlugins[1].uses.length, 1)
        assertEquals(self.LibResilientPlugins[1].uses[0].name, 'plugin-3')
        assertEquals(self.LibResilientPlugins[1].uses[0].uses.length, 0)
        // third plugin dependencies
        assertEquals(self.LibResilientPlugins[2].uses.length, 2)
        assertEquals(self.LibResilientPlugins[2].uses[0].name, 'plugin-1')
        assertEquals(self.LibResilientPlugins[2].uses[0].uses.length, 0)
        assertEquals(self.LibResilientPlugins[2].uses[1].name, 'plugin-2')
        assertEquals(self.LibResilientPlugins[2].uses[1].uses.length, 1)
        assertEquals(self.LibResilientPlugins[2].uses[1].uses[0].name, 'plugin-1')
        assertEquals(self.LibResilientPlugins[2].uses[1].uses[0].uses.length, 1)
        assertEquals(self.LibResilientPlugins[2].uses[1].uses[0].uses[0].name, 'plugin-4')
        assertEquals(self.LibResilientPlugins[2].uses[1].uses[0].uses[0].uses.length, 0)
        // fourth plugin dependencies
        assertEquals(self.LibResilientPlugins[3].uses.length, 0)
    })
    
    it("should instantiate configured plugins; explicitly disabled plugins should not be instantiated", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'plugin-enabled'
            },{
                name: 'plugin-disabled',
                enabled: false
            },{
                name: 'plugin-enabled',
                enabled: true
            }]
        }
    
        window.LibResilientPluginConstructors.set('plugin-enabled', ()=>{
            return {
                name: 'plugin-enabled',
                description: 'Enabled plugin',
                version: '0.0.1',
                fetch: (url)=>{return true}
            }
        })
        window.LibResilientPluginConstructors.set('plugin-disabled', ()=>{
            return {
                name: 'plugin-disabled',
                description: 'Disabled plugin',
                version: '0.0.1',
                fetch: (url)=>{return true}
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, 'object')
        assertEquals(self.LibResilientPlugins.length, 2)
        assertEquals(self.LibResilientPlugins[0].name, 'plugin-enabled')
        assertEquals(self.LibResilientPlugins[1].name, 'plugin-enabled')
    })
    
    it("should instantiate configured plugins; explicitly disabled dependencies should not be instantiated", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'plugin-disabled',
                enabled: false,
                uses: [{
                    name: 'dependency-enabled'
                }]
            },{
                name: 'plugin-enabled',
                uses: [{
                    name: 'dependency-disabled',
                    enabled: false
                }]
            },{
                name: 'plugin-enabled',
                uses: [{
                    name: 'dependency-enabled',
                    enabled: true
                }]
            }],
            loggedComponents: ['service-worker']
        }
    
        window.LibResilientPluginConstructors.set('plugin-enabled', (LRPC, config)=>{
            return {
                name: 'plugin-enabled',
                description: 'Enabled plugin',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        window.LibResilientPluginConstructors.set('plugin-disabled', (LRPC, config)=>{
            return {
                name: 'plugin-disabled',
                description: 'Disabled plugin',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        window.LibResilientPluginConstructors.set('dependency-disabled', (LRPC, config)=>{
            return {
                name: 'dependency-disabled',
                description: 'Disabled dependency plugin',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        window.LibResilientPluginConstructors.set('dependency-enabled', (LRPC, config)=>{
            return {
                name: 'dependency-enabled',
                description: 'Enabled dependency plugin',
                version: '0.0.1',
                fetch: (url)=>{return true},
                uses: config.uses || []
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, 'object')
        assertEquals(self.LibResilientPlugins.length, 2)
        assertEquals(self.LibResilientPlugins[0].name, 'plugin-enabled')
        assertEquals(self.LibResilientPlugins[0].uses.length, 0)
        assertEquals(self.LibResilientPlugins[1].name, 'plugin-enabled')
        assertEquals(self.LibResilientPlugins[1].uses.length, 1)
        assertEquals(self.LibResilientPlugins[1].uses[0].name, 'dependency-enabled')
        assertEquals(self.LibResilientPlugins[1].uses[0].uses.length, 0)
    })
    
    it("should use a cached valid config.json file, with no fetch happening", async () => {
        
        // prepare the config request/response
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'cache'], plugins: [{name: "cache"}], defaultPluginTimeout: 5000})
        }
        var config_url = window.location.origin + 'config.json'
        
        // get the response containing config to cache
        var config_response = await window.getMockedResponse(config_url, {}, mock_response_data)
        
        // cache it once you get it
        await caches
                .open('v1')
                .then(async (cache)=>{
                    await cache
                            .put(
                                config_url,
                                await window.getMockedResponse(config_url, {}, mock_response_data)
                            )
                })
        
        // service worker is a go!
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(typeof self.LibResilientConfig, 'object')
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 5000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'cache'])
        assertSpyCalls(self.fetch, 0)
    })
    
    it("should use a stale cached valid config.json file without a fetch, then retrieve and cache a fresh config.json using the configured plugins", async () => {
        
        // this does not change
        var config_url = window.location.origin + 'config.json'
        
        // prepare the stale config request/response
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'cache', 'fetch'], plugins: [{name: "fetch"},{name: "cache"}], defaultPluginTimeout: 5000}),
            headers: {
                // very stale date
                'Date': new Date(0).toUTCString()
            }
        }
        
        // cache it once you get it
        await caches
                .open('v1')
                .then(async (cache)=>{
                    await cache
                            .put(
                                config_url,
                                await window.getMockedResponse(config_url, {}, mock_response_data)
                            )
                    let resp = await cache
                                        .match(config_url)
                    console.log(resp)
                    console.log(await resp.text())
                })
        
        // prepare the fresh config request/response
        let mock_response_data2 = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'fetch'], plugins: [{name: "fetch"}], defaultPluginTimeout: 2000}),
            headers: {
                // very stale date
                'Date': new Date(0).toUTCString()
            }
        }
        
        // we need to be able to spy on the function that "fetches" the config
        let resolveConfigFetch = spy(window.getMockedFetch(mock_response_data2))
        window.LibResilientPluginConstructors.set('fetch', ()=>{
            return {
                name: 'fetch',
                description: 'Resolve with config data (pretending to be fetch).',
                version: '0.0.1',
                fetch: resolveConfigFetch
            }
        })
        
        // service worker is a go!
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        // verify current config (the one from the pre-cached stale `config.json`)
        assertEquals(typeof self.LibResilientConfig, 'object')
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 5000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "fetch"},{name: "cache"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'cache', 'fetch'])
        assertSpyCalls(self.fetch, 0)
        assertSpyCalls(resolveConfigFetch, 1)
        
        // wait until verify the *new* config got cached
        // running waitForCacheAdd only once might not be enough, as the cache
        // already contained config.json!
        // 
        // we have try to get it a few times, but limit how many times we try
        // so as not to end up in a forever loop
        for (let i=0; i<100; i++) {
            // did we get the new config?
            if (await window.waitForCacheAction(config_url) === mock_response_data2.data) {
                // we did! we're done
                return true;
            }
        }
        fail('New config failed to cache, apparently!')
    })
    
    it("should use a stale cached valid config.json file without a fetch; invalid config.json retrieved using the configured plugins should not be cached", async () => {
        
        // this does not change
        var config_url = window.location.origin + 'config.json'
        
        // prepare the stale config request/response
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'cache', 'resolve-config'], plugins: [{name: "cache"}, {name: "resolve-config"}], defaultPluginTimeout: 5000}),
            headers: {
                // very stale date
                'Date': new Date(0).toUTCString()
            }
        }
        
        // cache it once you get it
        await caches
                .open('v1')
                .then(async (cache)=>{
                    await cache
                            .put(
                                config_url,
                                await window.getMockedResponse(config_url, {}, mock_response_data)
                            )
                    let resp = await cache
                                        .match(config_url)
                    console.log(resp)
                    console.log(await resp.text())
                })
        
        // prepare the fresh invalid config request/response
        let mock_response_data2 = {
            data: JSON.stringify({loggedComponentsInvalid: ['service-worker', 'resolve-config'], pluginsInvalid: [{name: "resolve-config"}], defaultPluginTimeoutInvalid: 2000}),
            headers: {
                // very stale date
                'Date': new Date(0).toUTCString()
            }
         }
        
        // we need to be able to spy on the function that "fetches" the config
        let resolveConfigFetch = spy(window.getMockedFetch(mock_response_data2))
        window.LibResilientPluginConstructors.set('resolve-config', ()=>{
            return {
                name: 'resolve-config',
                description: 'Resolve with config data.',
                version: '0.0.1',
                fetch: resolveConfigFetch
            }
        })
        
        // service worker is a go!
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        // verify current config (the one from the pre-cached stale `config.json`)
        assertEquals(typeof self.LibResilientConfig, 'object')
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 5000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "cache"}, {name: "resolve-config"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'cache', 'resolve-config'])
        assertSpyCalls(self.fetch, 0)
        assertSpyCalls(resolveConfigFetch, 1)
        
        // waiting for potential caching of the "new" config
        for (let i=0; i<100; i++) {
            // did we get the new config?
            if (await window.waitForCacheAction(config_url) === mock_response_data2.data) {
                // we did! that's a paddling!
                fail('New config failed to cache, apparently!')
            }
        }
    })
    
    it("should use a stale cached valid config.json file without a fetch; valid config.json retrieved using the configured plugins other than fetch should not be cached", async () => {
        
        // this does not change
        var config_url = window.location.origin + 'config.json'
        
        // prepare the stale config request/response
        let mock_response_data = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'resolve-config'], plugins: [{name: "resolve-config"}], defaultPluginTimeout: 5000}),
            headers: {
                // very stale date
                'Date': new Date(0).toUTCString()
            }
        }
        
        // cache it once you get it
        await caches
                .open('v1')
                .then(async (cache)=>{
                    await cache
                            .put(
                                config_url,
                                await window.getMockedResponse(config_url, {}, mock_response_data)
                            )
                    let resp = await cache
                                        .match(config_url)
                    console.log(resp)
                    console.log(await resp.text())
                })
        
        // prepare the fresh invalid config request/response
        let mock_response_data2 = {
            data: JSON.stringify({loggedComponents: ['service-worker', 'resolve-config', 'cache'], plugins: [{name: "resolve-config"}, {name: "cache"}], defaultPluginTimeout: 2000}),
            headers: {
                // very stale date
                'Date': new Date(0).toUTCString()
            }
        }
        
        // we need to be able to spy on the function that "fetches" the config
        let resolveConfigFetch = spy(window.getMockedFetch(mock_response_data2))
        window.LibResilientPluginConstructors.set('resolve-config', ()=>{
            return {
                name: 'resolve-config',
                description: 'Resolve with config data.',
                version: '0.0.1',
                fetch: resolveConfigFetch
            }
        })
        
        // service worker is a go!
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        // verify current config (the one from the pre-cached stale `config.json`)
        assertEquals(typeof self.LibResilientConfig, 'object')
        assertEquals(self.LibResilientConfig.defaultPluginTimeout, 5000)
        assertEquals(self.LibResilientConfig.plugins, [{name: "resolve-config"}])
        assertEquals(self.LibResilientConfig.loggedComponents, ['service-worker', 'resolve-config'])
        assertSpyCalls(self.fetch, 0)
        assertSpyCalls(resolveConfigFetch, 1)
        
        // waiting for potential caching of the "new" config
        for (let i=0; i<100; i++) {
            // did we get the new config?
            if (await window.waitForCacheAction(config_url) === mock_response_data2.data) {
                // we did! that's a paddling
                fail('New config failed to cache, apparently!')
            }
        }
    })
    
    it("should ignore failed fetch by first configured plugin if followed by a successful fetch by a second one", async () => {
        window.LibResilientConfig = {
            plugins: [{
                name: 'reject-all'
            },{
                name: 'resolve-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        
        let rejectingFetch = spy(
            (request, init)=>{ return Promise.reject('reject-all rejecting a request for: ' + request); }
        )
        
        window.LibResilientPluginConstructors.set('reject-all', ()=>{
            return {
                name: 'reject-all',
                description: 'Reject all requests.',
                version: '0.0.1',
                fetch: rejectingFetch
            }
        })
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('test.json')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertSpyCalls(window.fetch, 2); // two, because the first one is for config.json
        assertSpyCalls(rejectingFetch, 1);
        assertSpyCall(window.fetch, 1, { args: [
                "https://test.resilient.is/test.json",
                {
                    cache: undefined,
                    integrity: undefined,
                    method: "GET",
                    redirect: "follow",
                    referrer: undefined,
                }]
        })
        assertEquals(await response.json(), { test: "success" })
    });
    
    it("should normalize query params in requested URLs by default", async () => {
        
        console.log(self.LibResilientConfig)
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('test.json?b=bbb&a=aaa&d=ddd&c=ccc')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertEquals(
            fetch.calls[1].args[0],
            "https://test.resilient.is/test.json?a=aaa&b=bbb&c=ccc&d=ddd"
        )
    })
    
    it("should not normalize query params in requested URLs if 'normalizeQueryParams' is set to false", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'fetch'
            }],
            loggedComponents: [
                'service-worker'
            ],
            normalizeQueryParams: false
        }
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('test.json?b=bbb&a=aaa&d=ddd&c=ccc')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertEquals(
            fetch.calls[1].args[0],
            "https://test.resilient.is/test.json?b=bbb&a=aaa&d=ddd&c=ccc"
        )
    })
    
    it("should pass the Request() init data to plugins", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'reject-all'
            },{
                name: 'resolve-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        let rejectingFetch = spy(
            (request, init)=>{ return Promise.reject('reject-all rejecting a request for: ' + request); }
        )
        
        window.LibResilientPluginConstructors.set('reject-all', ()=>{
            return {
                name: 'reject-all',
                description: 'Reject all requests.',
                version: '0.0.1',
                fetch: rejectingFetch
            }
        })
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        let initTest = {
            method: "GET",
            // TODO: ref. https://gitlab.com/rysiekpl/libresilient/-/issues/23
            //headers: new Headers({"x-stub": "STUB"}),
            //mode: "mode-stub",
            //credentials: "credentials-stub",
            //cache: "cache-stub",
            //referrer: "referrer-stub",
            redirect: "error",
            //integrity: ""
        }
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('test.json', initTest)
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertSpyCalls(rejectingFetch, 1);
        assertSpyCalls(window.fetch, 2); // two, because the first one is for config.json
        assertEquals(await response.json(), { test: "success" })
        
        assertSpyCall(rejectingFetch, 0, { args: [
                "https://test.resilient.is/test.json",
                {
                    cache: undefined,
                    integrity: undefined,
                    method: "GET",
                    redirect: "error",
                    referrer: undefined,
                }]
        })
        
        assertSpyCall(window.fetch, 1, { args: [
                "https://test.resilient.is/test.json",
                {
                    cache: undefined,
                    integrity: undefined,
                    method: "GET",
                    redirect: "error",
                    referrer: undefined,
                }]
        })
    });
    
    it("should respect defaultPluginTimeout", async () => {
        window.LibResilientConfig = {
            defaultPluginTimeout: 100,
            plugins: [{
                name: 'resolve-with-timeout'
            }],
            loggedComponents: [
                'service-worker',
            ]
        }
        let rwtCallback = spy()
        let rwt_timeout_id = null
        window.LibResilientPluginConstructors.set('resolve-with-timeout', ()=>{
                return {
                    name: 'resolve-with-timeout',
                    description: 'Resolve all requests after a timeout.',
                    version: '0.0.1',
                    fetch: (request, init)=>{
                        return new Promise((resolve, reject)=>{
                            rwt_timeout_id = setTimeout(rwtCallback, 300)
                        })
                    }
                }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('test.json')
        window.dispatchEvent(fetch_event)
        
        let err = null
        try {
            let response = await fetch_event.waitForResponse()
        } catch(e) {
            err = e
        }
        clearTimeout(rwt_timeout_id)
        assertEquals(err.toString(), "Error: LibResilient request using resolve-with-timeout timed out after 100ms.")
    });
    
    it("external request should work and not go through the plugins", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'reject-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        window.LibResilientPluginConstructors.set('reject-all', ()=>{
            return {
                name: 'reject-all',
                description: 'Reject all requests.',
                version: '0.0.1',
                fetch: (request, init)=>{ return Promise.reject(request); }
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('https://example.com/test.json')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertEquals(await response.json(), { test: "success" })
    })
    
    it("should make POST requests not go through the plugins", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'reject-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        window.LibResilientPluginConstructors.set('reject-all', ()=>{
            return {
                name: 'reject-all',
                description: 'Reject all requests.',
                version: '0.0.1',
                fetch: (request, init)=>{ return Promise.reject(request); }
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent(window.location.origin + 'test.json', {method: "POST"})
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        assertEquals(await response.json(), { test: "success" })
    })
    
    it("should stash content after a successful fetch", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'fetch'
            },{
                name: 'cache'
            }],
            loggedComponents: [
                'service-worker', 'fetch', 'cache'
            ]
        }
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent(window.location.origin + 'test.json')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertEquals(await response.json(), { test: "success" })
        
        // stashing plugin's stash() is called asynchronously in the Service Worker,
        // if we don't make sure that the caching has completed, we will get an error.
        // so we wait until config.json is cached, and use that to verify it is in fact
        // cached
        assertEquals(
            JSON.parse(
                await window.waitForCacheAction(window.location.origin + 'test.json')),
            { test: "success" }
        );
    });
    
    it("should skip stashing should if content was retrieved from a stashing plugin", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'stashing-test'
            },{
                name: 'reject-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        
        // three little mocks
        let resolvingFetch = spy(window.getMockedFetch())
        let rejectingFetch = spy((request, init)=>{ return Promise.reject(request); })
        let stashingStash = spy()
        
        // two little plugins
        window.LibResilientPluginConstructors.set('stashing-test', ()=>{
            return {
                name: 'stashing-test',
                description: 'Mock stashing plugin.',
                version: '0.0.1',
                fetch: resolvingFetch,
                stash: stashingStash
            }
        })
        window.LibResilientPluginConstructors.set('reject-all', ()=>{
            return {
                name: 'reject-all',
                description: 'Reject all requests.',
                version: '0.0.1',
                fetch: rejectingFetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent(window.location.origin + 'test.json')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertEquals(await response.json(), { test: "success" })
        assertSpyCalls(resolvingFetch, 1)
        assertSpyCalls(stashingStash, 0)
        assertSpyCalls(rejectingFetch, 1)
    });
    
    it("should stash content if it was retrieved from a job after retrieval from a stashing plugin, and it differs from the stashed version", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'stashing-test'
            },{
                name: 'resolve-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        // three little mocks
        let resolvingFetch = spy(window.getMockedFetch())
        let resolvingFetch2 = spy(window.getMockedFetch({
                                    data: JSON.stringify({ test: "success2" }),
                                    headers: { 'X-LibResilient-ETag': 'NewTestingETagHeader' }
                                }))
        
        let stashingStash = spy(async (response, url)=>{
                                    assertEquals(await response.json(), { test: "success2" })
                                    assertEquals(response.headers.get('X-LibResilient-ETag'), 'NewTestingETagHeader')
                                })
        
        window.LibResilientPluginConstructors.set('stashing-test', ()=>{
            return {
                name: 'stashing-test',
                description: 'Mock stashing plugin.',
                version: '0.0.1',
                fetch: resolvingFetch,
                stash: stashingStash
            }
        })
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: resolvingFetch2
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent(window.location.origin + 'test.json')
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertEquals(await response.json(), { test: "success" })
        assertSpyCalls(resolvingFetch, 1)
        assertSpyCalls(stashingStash, 1)
        assertSpyCalls(resolvingFetch2, 1)
        assertSpyCall(
            window.clients.prototypePostMessage,
            6,
            { args: [{
                url: "https://test.resilient.is/test.json",
                fetchedDiffers: true
            }]}
        )
    });
    
    it("should stash content when explicitly asked to", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'cache'
            }],
            loggedComponents: [
                'service-worker', 'cache'
            ]
        }
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let stashEvent = new Event('message')
        stashEvent.data = {
            stash: [await window.getMockedResponse(window.location.origin + 'test.json')]
        }
        
        // stash it!
        await self.dispatchEvent(stashEvent)
        
        // let's see if it got added to cache
        assertEquals(
            JSON.parse(await window.waitForCacheAction(window.location.origin + 'test.json')),
            { test: "success" }
        );
    });
    
    it("should pass the Request() init data to a background plugin after a retrieval from a stashing plugin", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'stashing-test'
            },{
                name: 'resolve-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        let resolvingFetch = spy(window.getMockedFetch({
            headers: {
                'X-LibResilient-Method': 'resolve-all',
                'X-LibResilient-ETag': 'TestingETagHeader'
            }
        }))
        let resolvingFetch2 = spy(window.getMockedFetch({
            data: JSON.stringify({ test: "success2" }),
            headers: {
                'ETag': 'NewTestingETagHeader'
            }
        }))
        let stashingStash = spy(async (response, url)=>{
            assertEquals(await response.json(), { test: "success2" })
            assertEquals(response.headers.get('ETag'), 'NewTestingETagHeader')
        })
        
        window.LibResilientPluginConstructors.set('stashing-test', ()=>{
            return {
                name: 'stashing-test',
                description: 'Mock stashing plugin.',
                version: '0.0.1',
                fetch: resolvingFetch,
                stash: stashingStash
            }
        })
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: resolvingFetch2
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let initTest = {
            method: "GET",
            // TODO: ref. https://gitlab.com/rysiekpl/libresilient/-/issues/23
            //headers: new Headers({"x-stub": "STUB"}),
            //mode: "mode-stub",
            //credentials: "same-origin",
            cache: undefined,
            referrer: undefined,
            redirect: "error", // this is the only signal we get here, really!
            integrity: undefined
        }
        
        let fetch_event = new FetchEvent(window.location.origin + 'test.json', initTest)
        window.dispatchEvent(fetch_event)
        let response = await fetch_event.waitForResponse()
        
        assertSpyCalls(resolvingFetch, 1);
        assertSpyCalls(resolvingFetch2, 1);
        assertEquals(await response.json(), { test: "success" })
        assertSpyCall(
            resolvingFetch,
            0,
            { args: [
                window.location.origin + 'test.json',
                initTest
            ]}
        )
        assertSpyCall(
            resolvingFetch2,
            0,
            { args: [
                window.location.origin + 'test.json',
                initTest
            ]}
        )
    });
    
    it("should unstash content when explicitly asked to", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'cache'
            }],
            loggedComponents: [
                'service-worker', 'cache'
            ]
        }
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let stashEvent = new Event('message')
        stashEvent.data = {
            stash: [await window.getMockedResponse(window.location.origin + 'test.json')]
        }
        
        // stash it!
        await self.dispatchEvent(stashEvent)
        
        // let's see if it got added to cache
        assertEquals(
            JSON.parse(await window.waitForCacheAction(window.location.origin + 'test.json')),
            { test: "success" }
        );
        
        let unstashEvent = new Event("message")
        unstashEvent.data = {
            unstash: [window.location.origin + 'test.json']
        }
        
        // unstash it!
        await self.dispatchEvent(unstashEvent)
        
        // let's see if it got removed from cache
        assertEquals(
            await window.waitForCacheAction(window.location.origin + 'test.json', "remove"),
            undefined
        );
    });
    
    it("should handle publishing content explicitly", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'publish-test'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        
        let publishMock = spy()
        
        window.LibResilientPluginConstructors.set('publish-test', ()=>{
            return {
                name: 'publish-test',
                description: 'Publish plugin fixture.',
                version: '0.0.1',
                publish: publishMock
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let publishEvent = new Event('message')
        publishEvent.data = {
            publish: [await window.getMockedResponse(window.location.origin + 'test.json')]
        }
        
        // publish it!
        await self.dispatchEvent(publishEvent)
        
        assertSpyCall(publishMock, 0, {
            args: [publishEvent.data.publish[0]]
        })
    })
    
    it("should be able to use plugins with dependencies correctly", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'dependent-test',
                uses: [{
                    name: 'dependency1-test'
                },{
                    name: 'dependency2-test'
                }]
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        window.LibResilientPluginConstructors.set('dependent-test', ()=>{
            return {
                name: 'dependent-test',
                description: 'Dependent plugin fixture.',
                version: '0.0.1',
                uses: [{
                    name: 'dependency1-test'
                },{
                    name: 'dependency2-test'
                }]
            }
        })
        window.LibResilientPluginConstructors.set('dependency1-test', ()=>{
            return {
                name: 'dependency1-test',
                description: 'First dependency plugin fixture.',
                version: '0.0.1'
            }
        })
        window.LibResilientPluginConstructors.set('dependency2-test', ()=>{
            return {
                name: 'dependency2-test',
                description: 'Second dependency plugin fixture.',
                version: '0.0.1'
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(self.LibResilientPlugins.map(p=>p.name), ['dependent-test'])
        assertEquals(self.LibResilientPlugins[0].uses.map(p=>p.name), ['dependency1-test', 'dependency2-test'])
    })
    
    it("should be able to use multiple instances of the same plugin", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'plugin-test',
            },{
                name: 'plugin-test',
            },{
                name: 'plugin-test',
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        var pver = 0
        window.LibResilientPluginConstructors.set('plugin-test', ()=>{
            pver += 1
            return {
                name: 'plugin-test',
                description: 'Simple plugin stub.',
                version: '0.0.' + pver
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(self.LibResilientPlugins.map(p=>p.name), ['plugin-test', 'plugin-test', 'plugin-test'])
        assertEquals(self.LibResilientPlugins.map(p=>p.version), ['0.0.1', '0.0.2', '0.0.3'])
    })
    
    it("should error out if all plugins fail", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'reject-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        window.LibResilientPluginConstructors.set('reject-all', ()=>{
            return {
                name: 'reject-all',
                description: 'Reject all requests.',
                version: '0.0.1',
                fetch: (request, init)=>{ return Promise.reject(request); }
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        let fetch_event = new FetchEvent('test.json')
        window.dispatchEvent(fetch_event)
        
        assertRejects(
            ()=>{
                return fetch_event.waitForResponse()
            },
            fetch_event.request
        )
    })
    
    it("should send clientId back if event.resultingClientId is set", async () => {
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all'
            }],
            loggedComponents: [
                'service-worker'
            ]
        }
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: window.fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        // we need a FetchEvent with a resultingClientId field set
        let fetch_event = new FetchEvent('test.json')
        fetch_event.resultingClientId = 'resulting-client-id-test'
        
        // do the fetch and wait for the result that we don't really care about
        window.dispatchEvent(fetch_event)
        await fetch_event.waitForResponse()
        
        // assert that resulting-client-id-test shows up in messages
        // posted from the service worker
        assertSpyCall(window.clients.prototypePostMessage, 0, {
            args: [{
                clientId: "resulting-client-id-test",
                plugins: [ "resolve-all" ],
                serviceWorker: "COMMIT_UNKNOWN"
            }]
        })
    })
    
    it("guessMimeType() should correctly guess content type based on extension by default", async () => {
        
        // set things up
        await import("../../service-worker.js?" + window.test_id);
        self.pluginName = "service-worker-test"
        
        // extensions we support, with associated MIME types
        let ext_to_mime = new Map([
            ['htm',    'text/html'],
            ['html',   'text/html'],
            ['css',    'text/css'],
            ['js',     'text/javascript'],
            ['json',   'application/json'],
            ['svg',    'image/svg+xml'],
            ['ico',    'image/x-icon'],
            ['gif',    'image/gif'],
            ['png',    'image/png'],
            ['jpg',    'image/jpeg'],
            ['jpeg',   'image/jpeg'],
            ['jpe',    'image/jpeg'],
            ['jfif',   'image/jpeg'],
            ['pjpeg',  'image/jpeg'],
            ['pjp',    'image/jpeg'],
            ['webp',   'image/webp'],
            ['avi',    'video/avi'],
            ['mp4',    'video/mp4'],
            ['mp2',    'video/mpeg'],
            ['mp3',    'audio/mpeg'],
            ['mpa',    'video/mpeg'],
            ['pdf',    'application/pdf'],
            ['txt',    'text/plain'],
            ['ics',    'text/calendar'],
            ['jsonld', 'application/ld+json'],
            ['mjs',    'text/javascript'],
            ['oga',    'audio/ogg'],
            ['ogv',    'video/ogg'],
            ['ogx',    'application/ogg'],
            ['opus',   'audio/opus'],
            ['otf',    'font/otf'],
            ['ts',     'video/mp2t'],
            ['ttf',    'font/ttf'],
            ['weba',   'audio/webm'],
            ['webm',   'video/webm'],
            ['webp',   'image/webp'],
            ['woff',   'font/woff'],
            ['woff2',  'font/woff2'],
            ['xhtml',  'application/xhtml+xml'],
            ['xml',    'application/xml']
        ])
        
        // check'em all
        for (let [ext, mime] of  ext_to_mime.entries()) {
            assertEquals(await self.guessMimeType(ext,  null), mime)
        }
    })
    
    it("should attempt to load the external MIME type sniffing library if 'useMimeSniffingLibrary' is set to true", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: (ext, content)=>{
                console.log(`fileTypeFromBuffer(${ext}, ${content.length})`)
            }
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertSpyCall(self.importScripts, 0, {args: ["./lib/file-type.js"]})
    })
    
    it("should default to extension-based MIME sniffing if 'useMimeSniffingLibrary' is set to true but loading the library failed", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = undefined
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(await self.guessMimeType("png",  "test arg 2"), "image/png")
    })
    
    it("should call the external library function in 'guessMimeType()', passing the second argument, if 'useMimeSniffingLibrary' is set to true", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                return undefined
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        await self.guessMimeType("test arg 1",  "test arg 2")
        assertSpyCall(window.fileType.fileTypeFromBuffer, 0, {args: ["test arg 2"]})
    })
    
    it("should revert to guessing MIME type based on extension if the external library function in 'guessMimeType()' errors out", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                throw new Error('test error')
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(await self.guessMimeType("gif",  "test arg 2"), "image/gif")
        assertSpyCalls(window.fileType.fileTypeFromBuffer, 1)
    })
    
    it("should revert to guessing MIME type based on extension if the external library function in 'guessMimeType()' fails to guess the MIME type", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                return undefined
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(await self.guessMimeType("png",  "test arg 2"), "image/png")
        assertSpyCalls(window.fileType.fileTypeFromBuffer, 1)
    })
    
    it("should revert to guessing MIME type based on extension if the external library function in 'guessMimeType()' returns an unexpected value type", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                return "this should not be a string"
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(await self.guessMimeType("jpg",  "test arg 2"), "image/jpeg")
        assertSpyCalls(window.fileType.fileTypeFromBuffer, 1)
    })
    
    it("should revert to guessing MIME type based on extension if the external library function in 'guessMimeType()' returns an incorrectly formatted object", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                return {bad: "data"}
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(await self.guessMimeType("txt",  "test arg 2"), "text/plain")
        assertSpyCalls(window.fileType.fileTypeFromBuffer, 1)
    })
    
    it("should ignore extension if the external library function in 'guessMimeType()' returns valid data", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                return {ext: "txt", mime: "text/plain"}
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        assertEquals(await self.guessMimeType("png",  "test arg 2"), "text/plain")
        assertSpyCalls(window.fileType.fileTypeFromBuffer, 1)
    })
    
    it("should not guess a MIME type if both external library function and built-in extension-based heuristic fail", async () => {
        
        self.LibResilientConfig = {
            plugins: [{
                name: 'resolve-all',
            }],
            useMimeSniffingLibrary: true,
            loggedComponents: ['service-worker']
        }
        
        window.fileType = {
            fileTypeFromBuffer: spy(async (ext, content)=>{
                return {bad: "data"}
            })
        }
        
        window.LibResilientPluginConstructors.set('resolve-all', ()=>{
            return {
                name: 'resolve-all',
                description: 'Resolve all requests.',
                version: '0.0.1',
                fetch: fetch
            }
        })
        
        await import("../../service-worker.js?" + window.test_id);
        await self.dispatchEvent(new Event('install'))
        await self.waitForSWInstall()
        
        // if we're not sure, according to RFC 7231 we should not set Content-Type
        // (or, set it to an empty string)
        // https://www.rfc-editor.org/rfc/rfc7231#section-3.1.1.5
        assertEquals(await self.guessMimeType("no-such-extension",  "test arg 2"), "")
        assertSpyCalls(window.fileType.fileTypeFromBuffer, 1)
    })
})
