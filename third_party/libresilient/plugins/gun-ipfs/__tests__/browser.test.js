import {
    describe,
    it,
    beforeEach,
    beforeAll
} from "https://deno.land/std@0.183.0/testing/bdd.ts";

import {
    assertEquals,
    assertRejects,
    assertThrows
} from "https://deno.land/std@0.183.0/testing/asserts.ts";

import {
    assertSpyCall,
    assertSpyCalls,
    spy
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
        name: 'gun-ipfs',
        gunPubkey: 'stub'
    }
    
    window.ipfsPrototype = {
        ipfsFixtureAddress: 'QmiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFS',
        create: ()=>{
            var sourceUsed = false
            return Promise.resolve({
                get: (path)=>{
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
    
    window.gunUserFunction = ()=>{
      return {
        get: () => {
          return {
            get: (path)=>{
              return {
                once: (arg)=>{ arg('/ipfs/' + Ipfs.ipfsFixtureAddress + path) }
              }
            }
          }
        }
      }
    }
    window.GunFunction = (nodes)=>{
      return {
        user: self.gunUser
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
    window.gunUser = spy(window.gunUserFunction)
    window.Gun = spy(window.GunFunction)
    
    window.LR = {
        log: spy((component, ...items)=>{
            console.debug(component + ' :: ', ...items)
        }),
        guessMimeType: self.guessMimeType
    }
})

describe('browser: gun-ipfs plugin', async () => {
    
    // we need access to the API
    await import("../../../service-worker.js");
    // API requires a pluginName
    self.pluginName = 'dnslink-ipfs'
    
    window.LibResilientPluginConstructors = new Map()
    window.fetchResponse = []
    window.resolvingFetch = null
    window.fetch = null
    window.Ipfs = null
    window.Gun = null
    window.gunUser = null
    
    await import("../../../plugins/gun-ipfs/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(
            LibResilientPluginConstructors.get('gun-ipfs')(LR, init).name,
            'gun-ipfs'
        );
    });
    
    it("should initiate IPFS setup", async ()=>{
        self.importScripts = spy(()=>{})
        try {
            await LibResilientPluginConstructors.get('gun-ipfs')(LR, init).fetch('/test.json')
        } catch {}
        
        assertSpyCall(
                importScripts,
                0,
                {
                    args: ['./lib/ipfs.js']
                })
    })
    
    it("should initiate Gun setup", async ()=>{
        self.importScripts = spy(()=>{})
        try {
            await LibResilientPluginConstructors.get('gun-ipfs')(LR, init).fetch('/test.json')
        } catch {}
        
        assertSpyCall(
                importScripts,
                1,
                {
                    args: ['./lib/gun.js', "./lib/sea.js", "./lib/webrtc.js"]
                })
    })
    
    it("should error out when fetching unpublished content", async ()=>{
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('gun-ipfs')(LR, init)
                                .fetch('https://resilient.is/nonexistent.path')
            },
            Error,
            'Error: file does not exist'
        )
    })
    
    // TODO: probably not necessary in the long run?
    it("should fetch <path>/index.html instead of a path ending in <path>/", async ()=>{
        await LibResilientPluginConstructors
                .get('gun-ipfs')(LR, init)
                .fetch('https://resilient.is/test/')
        assertSpyCall(
            window.LR.log,
            15,
            {
                args: [
                    "gun-ipfs",
                    "path ends in '/', assuming 'index.html' should be appended."
            ]})
    })
    
    // TODO: currently disabled, because:
    // 1. the plugin is in an unusable state anyway
    // 2. most of this test needs to go into service worker test suite itself
    // 3. fixing this test is substantial work, as it requires mocking IPFS.get() properly for every content type
    it.ignore("should correctly guess content types when fetching", async ()=>{
        
        let gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        let response = await gunIpfsPlugin.fetch('https://resilient.is/test/')
        assertSpyCall(
            window.LR.log,
            17,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : text/html"
            ]})
        
        window.LR.log = spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        response = await gunIpfsPlugin.fetch('https://resilient.is/test.htm')
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : text/html"
            ]})
        
        window.LR.log = spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        response = await gunIpfsPlugin.fetch('https://resilient.is/test.css')
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : text/css"
            ]})
        
        window.LR.log = spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        response = await gunIpfsPlugin.fetch('https://resilient.is/test.js')
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : text/javascript"
            ]})
        
        window.LR.log = spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        response = await gunIpfsPlugin.fetch('https://resilient.is/test.json')
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : application/json"
            ]})
        
        window.LR.log = spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        response = await gunIpfsPlugin.fetch('https://resilient.is/test.svg')
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : image/svg+xml"
            ]})
        
        window.LR.log = spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        gunIpfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        response = await gunIpfsPlugin.fetch('https://resilient.is/test.ico')
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "   +-- guessed contentType : image/x-icon"
            ]})
    })
    
    it("should fetch content (stub!)", async ()=>{
        
        let response = await LibResilientPluginConstructors
                                .get('gun-ipfs')(LR, init)
                                .fetch('https://resilient.is/test.json')
                                
        assertSpyCall(
            window.LR.log,
            16,
            {
                args: [
                    "gun-ipfs",
                    "getGunData()\n",
                    "+-- gunUser   : object\n",
                    "+-- gunaddr[] : resilient.is,/test.json"
            ]})
        // TODO: implement actual content check once gun-ipfs plugin gets updated
        // to work with current IPFS version
    })
    
    it("should error out if publishContent() is passed anything else than string or array of string", async ()=>{
        var gunipfsPlugin = LibResilientPluginConstructors.get('gun-ipfs')(LR, init)
        
        assertThrows(
            ()=>{
                gunipfsPlugin.publish({
                    url: 'https://resilient.is/test.json'
                })
            },
            Error,
            'Handling a Response: not implemented yet')
        
        assertThrows(
            ()=>{
                gunipfsPlugin.publish(true)
            },
            Error,
            'Only accepts: string, Array of string, Response.')
        
        assertThrows(
            ()=>{
                gunipfsPlugin.publish([true, 5])
            },
            Error,
            'Only accepts: string, Array of string, Response.')
    })
})
