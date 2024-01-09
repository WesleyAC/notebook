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
                                            'Last-Modified': 'TestingLastModifiedHeader'
                                        },
                                        url: url
                                    });
                                return Promise.resolve(response);
                            }
    
    /*
     * prototype of the plugin init object
     */
    window.initPrototype = {
        name: 'dnslink-ipfs'
    }
    
    window.ipfsPrototype = {
        ipfsFixtureAddress: 'QmiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFS',
        create: ()=>{
            var sourceUsed = false
            return Promise.resolve({
                cat: (path)=>{
                    return {
                        next: ()=>{
                            if (path.endsWith('nonexistent.path')) {
                                throw new Error('Error: file does not exist')
                            }
                            let prevSourceUsed = sourceUsed
                            sourceUsed = true
                            var val = undefined
                            if (!prevSourceUsed) {
                                var val = Uint8Array.from(
                                                Array
                                                    .from(JSON.stringify({
                                                        test: "success",
                                                        path: path
                                                    }))
                                                    .map(
                                                        letter => letter.charCodeAt(0)
                                                    )
                                            )
                            }
                            return Promise.resolve({
                                done: prevSourceUsed,
                                value: val
                            })
                        }
                    }
                },
                name: {
                    resolve: (path)=>{
                        var result = path.replace(
                                        '/ipns/resilient.is',
                                        '/ipfs/' + Ipfs.ipfsFixtureAddress
                                      )
                        return {
                            next: ()=> {
                                return Promise.resolve({
                                    done: false,
                                    value: result
                                })
                            }
                        }
                    }
                }
            })
        }
    }
})

/**
 * we need to do all of this before each test in order to reset the fetch() use counter
 * and make sure window.init is clean and not modified by previous tests
 */
beforeEach(()=>{
    window.fetch = spy(window.resolvingFetch)
    window.fetchResponse = [
        {test: "success"},
        "application/json"
    ]
    window.init = {
        ...window.initPrototype
    }
    window.Ipfs = {
        ...window.ipfsPrototype
    }
    self.Ipfs = window.Ipfs
})

describe('browser: dnslink-ipfs plugin', async () => {
    
    // we need access to the API
    await import("../../../service-worker.js");
    // API requires a pluginName
    self.pluginName = 'dnslink-ipfs'
    
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            },
            guessMimeType: self.guessMimeType
        }
    window.fetchResponse = []
    window.resolvingFetch = null
    window.fetch = null
    window.Ipfs = null
    
    await import("../../../plugins/dnslink-ipfs/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(
            LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init).name,
            'dnslink-ipfs'
        );
    });
    
    it("should initiate IPFS setup", async ()=>{
        self.importScripts = spy(()=>{})
        try {
            await LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init).fetch('/test.json')
        } catch {}
        
        assertSpyCall(
                importScripts,
                0,
                {
                    args: ['./lib/ipfs.js']
                })
    })
    
    it("should error out when fetching unpublished content", async ()=>{
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-ipfs')(LR, init)
                                .fetch('https://resilient.is/nonexistent.path')
            },
            Error,
            'Error: file does not exist'
        )
    })
    
    // TODO: probably not necessary in the long run?
    it("should fetch <path>/index.html instead of a path ending in <path>/", async ()=>{
        var response = await LibResilientPluginConstructors
                                .get('dnslink-ipfs')(LR, init)
                                .fetch('https://resilient.is/test/')
        assertEquals(
            await response.json(),
            {
                test: "success",
                path: "/ipfs/" + window.Ipfs.ipfsFixtureAddress + '/test/index.html'
            })
    })
    
    it("should correctly guess content types when fetching", async ()=>{
        
        let dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        let response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test/')
        assertEquals(response.headers.get("content-type"), 'text/html')
        
        dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test.htm')
        assertEquals(response.headers.get("content-type"), 'text/html')
        
        dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test.css')
        assertEquals(response.headers.get("content-type"), 'text/css')
        
        dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test.js')
        assertEquals(response.headers.get("content-type"), 'text/javascript')
        
        dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test.json')
        assertEquals(response.headers.get("content-type"), 'application/json')
        
        dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test.svg')
        assertEquals(response.headers.get("content-type"), 'image/svg+xml')
        
        dnslinkIpfsPlugin = LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init)
        response = await dnslinkIpfsPlugin.fetch('https://resilient.is/test.ico')
        assertEquals(response.headers.get("content-type"), 'image/x-icon')
    })
    
    it("should fetch content", async ()=>{
        let response = await LibResilientPluginConstructors
                                .get('dnslink-ipfs')(LR, init)
                                .fetch('https://resilient.is/test.json')
                                
        assertEquals(response.headers.get("content-type"), 'application/json')
        assertEquals(
            await response.json(),
            {
                test: "success",
                path: "/ipfs/" + window.Ipfs.ipfsFixtureAddress + '/test.json'})
    })
    
    it("should throw an error on publish()", async ()=>{
        assertThrows(
            ()=>{
                LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init).publish()
            },
            Error,
            "Not implemented yet."
        )
    })
    
    it("should handle IPFS load error correctly", async ()=>{
      
        window.Ipfs.create = ()=>{
            throw new Error('Testing IPFS loading failure')
        }
        
        assertRejects(
            ()=>{
                return LibResilientPluginConstructors
                        .get('dnslink-ipfs')(LR, init)
                        .fetch('/test.json')
            },
            Error,
            "Error: Testing IPFS loading failure"
        )
    })
    
    it("should handle importScripts being undefined ", async ()=>{
        self.importScripts = undefined
        await LibResilientPluginConstructors.get('dnslink-ipfs')(LR, init).fetch('/test.json')
    })
})
