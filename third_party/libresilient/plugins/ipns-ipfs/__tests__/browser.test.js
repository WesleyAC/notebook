import {
    describe,
    it,
    beforeEach,
    beforeAll
} from "https://deno.land/std@0.183.0/testing/bdd.ts";

import {
    assertEquals
} from "https://deno.land/std@0.183.0/testing/asserts.ts";

import {
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
        name: 'ipns-ipfs',
        ipnsPubkey: 'stub'
    }
    
    window.ipfsPrototype = {
        ipfsFixtureAddress: 'QmiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFS',
        create: ()=>{
            console.log('*** Ipfs.create()')
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

describe('browser: ipns-ipfs plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            }
        }
    window.fetchResponse = []
    window.resolvingFetch = null
    window.fetch = null
    window.Ipfs = null
    
    await import("../../../plugins/ipns-ipfs/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(
            LibResilientPluginConstructors.get('ipns-ipfs')(LR, init).name,
            'ipns-ipfs'
        );
    });
})
