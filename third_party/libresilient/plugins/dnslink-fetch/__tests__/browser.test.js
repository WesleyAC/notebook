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
    assertEquals,
    assertNotEquals
} from "https://deno.land/std@0.183.0/testing/asserts.ts";

import {
    assertSpyCall,
    assertSpyCalls,
    spy,
} from "https://deno.land/std@0.183.0/testing/mock.ts";


// elements of a query and of a response
const dohPktFrgs = {
    // === header section ===
    // 16 bits of flags:
    // 
    //              ,-------------- 1-bit QR header field, 0 means "question", 1 - "response"
    //              | ,------------ 4-bit OPCODE header field, we want 0 ("standard query")
    //              | |  ,--------- 1-bit AA header field, only relevant in response (1 means the response is authoritative)
    //              | |  |,-------- 1-bit TC header field, we want 0 signifying the message was not truncated
    //              | |  ||,------- 1-bit RD header field, we want 1 signifying we want recursive resolution
    //              | |  |||
    //              | |  |||    ,------- 1-bit RA header field, only relevant in response (1 means recursion is available)
    //              | |  |||    | ,----- 3-bit Z header field, reserved for future use, always 0
    //              | |  |||    | |   ,- 4-bit RCODE header field, to be set to 0, and inspected in response for error codes
    //              | |\ |||    | |  /|
    //              |/  \|||    |/ \/  \
    qflags:      [0b00000001, 0b00000000],
    rflags:      [0b10000001, 0b10000000],
    // === question section ===
    //           _dnslink.resilient.is
    name:        [8,95,100,110,115,108,105,110,107,9,114,101,115,105,108,105,101,110,116,2,105,115,0],
    type:        [0,16],
    class:       [0,1],
    // === answer section ===
    // name pointer always starts with 0b11, and in our case it only makes sense
    // that offset is equal to 12 (i.e. first byte of the qustion section, right after the header)
    nameptr:     [0b11000000, 12],
    ttl:         [0,0,13,110], // some positive number
    //           1-byte length, followed by string response
    dnslink:     [100,110,115,108,105,110,107,61], // the "dnslink=" string
    ipfs:        [47,105,112,102,115,47],          // the "/ipfs/" string
    https:       [47,104,116,116,112,115,47],      // the "/https/" string
    //           example.com/test
    https_addr1: [101,120,97,109,112,108,101,46,99,111,109,47,116,101,115,116],
    //           example.org
    https_addr2: [101,120,97,109,112,108,101,46,111,114,103],
    //           QmiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFSiPFS
    ipfs_addr:   [81,109,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83,105,80,70,83],
    // === additional section ===
    // this should be ignored when interpreting the response
    additional:  [0,0,41,4,208,0,0,0,0,0,0]
}

/**
 * simple yet effective
 * 
 * examples:
 * 
 * - valid single question packet:
 *   dohPacket([
 *      [0, 1], dohPktFrgs.qflags, [0, 1], [0, 0], [0, 0], [0, 0],
 *      dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class])
 * 
 * - valid single answer packet, with name repeated in full:
 *   dohPacket([
 *      [0, 1], dohPktFrgs.rflags, [0, 1], [0, 1], [0, 0], [0, 0],
 *      dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class,
 *      dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
 *      [0, (dohPktFrgs.dnslink.length + dohPktFrgs.ipfs.length + dohPktFrgs.ipfs_addr.length + 1)],
 *      [(dohPktFrgs.dnslink.length + dohPktFrgs.ipfs.length + dohPktFrgs.ipfs_addr.length)],
 *      dohPktFrgs.dnslink, dohPktFrgs.ipfs, dohPktFrgs.ipfs_addr])
 * 
 * - valid single answer packet, with name pointed to:
 *   dohPacket([
 *      [0, 1], dohPktFrgs.rflags, [0, 1], [0, 1], [0, 0], [0, 0],
 *      dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class,
 *      dohPktFrgs.nameptr, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
 *      [0, (dohPktFrgs.dnslink.length + dohPktFrgs.ipfs.length + dohPktFrgs.ipfs_addr.length + 1)],
 *      [(dohPktFrgs.dnslink.length + dohPktFrgs.ipfs.length + dohPktFrgs.ipfs_addr.length)],
 *      dohPktFrgs.dnslink, dohPktFrgs.ipfs, dohPktFrgs.ipfs_addr])
 */
let dohPacket = (elements) => {
    // can't just elements.flat(), because that does not
    // flatten Uint8Arrays, and that's what we really care about
    return Uint8Array
                .from(
                    elements
                        .map((el)=>{
                            if (el.constructor === Uint8Array) {
                                return Array.from(el)
                            } else {
                                return el
                            }
                        })
                        .flat())
}

let decodeUrlDoHRequest = (request) => {
    return Uint8Array.from(
                Array.from(
                    atob(
                        request
                    )
                ).map(a => a.charCodeAt(0))
            )
}

beforeAll(async ()=>{
    window.fetchResponse = []
    window.resolvingFetch = (url, init) => {
                                let response_data = null
                                if (typeof window.fetchResponse[0] === 'object' && window.fetchResponse[0] != null) {
                                    response_data = JSON.stringify(window.fetchResponse[0]);
                                } else if (typeof window.fetchResponse[0] === "function") {
                                    response_data = window.fetchResponse[0](url, init)
                                } else {
                                    response_data = window.fetchResponse[0]
                                }
                                const response = new Response(
                                    new Blob(
                                        [response_data],
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
        name: 'dnslink-fetch'
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
    window.LR = {
            log: spy((component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            })
        }
})

describe('browser: dnslink-fetch plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    
    window.fetchResponse = []
    window.resolvingFetch = null
    window.fetch = null
    
    await import("../../../lib/doh.js");
    await import("../../../plugins/dnslink-fetch/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        assertEquals(
            LibResilientPluginConstructors.get('dnslink-fetch')(LR, init).name,
            'dnslink-fetch'
        );
    });
    
    it("should fail with bad config", () => {
        init = {
            name: 'dnslink-fetch',
            dohProvider: false
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('dnslink-fetch')(LR, init)
            },
            Error,
            'dohProvider not confgured'
        )
        init = {
            name: 'dnslink-fetch',
            dohMediaType: false
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('dnslink-fetch')(LR, init)
            },
            Error,
            'dohMediaType not confgured'
        )
        init = {
            name: 'dnslink-fetch',
            dohMethod: false
        }
        assertThrows(
            ()=>{
                return LibResilientPluginConstructors.get('dnslink-fetch')(LR, init)
            },
            Error,
            'dohMethod not confgured'
        )
    });
    
    it("should warn if dohMethod and dohMediaType are set such that dohMethod will be ignored", async () => {
        init = {
            name: 'dnslink-fetch',
            dohMethod: "POST",
            dohMediaType: "application/dns-json"
        }
        // this will fail. that's okay.
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch (e) {}
        
        assertEquals(
            LR.log.calls[0].args[1],
            'Warning: "POST" dohMethod is going to be ignored as dohMediaType is not "application/dns-message"'
        )
    });
    
    it("should fail if doh.js is not correctly loaded", async () => {
        
        let f = window.resolveEndpointsJSON
        window.resolveEndpointsJSON = undefined
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'resolveEndpointsJSON() is not defined, is doh.js loaded?'
        )
        
        window.resolveEndpointsJSON = f
        f = window.resolveEndpointsBinary
        window.resolveEndpointsBinary = undefined
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'resolveEndpointsBinary() is not defined, is doh.js loaded?'
        )
        
        window.resolveEndpointsBinary = f
    })
    
    it("should attempt to load doh.js if importScripts() is available", async () => {
        window.importScripts = spy()
        // this will fail. that's okay.
        let plugin = LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
        assertEquals(
            LR.log.calls[0].args[1],
            'importing doh.js'
        )
        assertEquals(
            window.importScripts.calls[0].args[0],
            "./lib/doh.js"
        )
    });
    
    it("should perform a fetch against the default dohProvider endpoint, with default settings", async () => {
        
        // this will fail after the fetch() is done
        // but we only care about the fetch() being done in this test
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch (e) {}
        
        assertSpyCall(
            fetch,
            0,
            {
                args: [
                    "https://dns.hostux.net/dns-query?name=_dnslink.resilient.is&type=TXT",
                    {"headers": {"accept": "application/json"}}
                ]
            })
    })
    
    it("should throw an error if the DoH JSON API response is not a valid JSON", async () => {
        
        window.fetchResponse = ["not-json", "text/plain"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Unexpected token \'o\', "not-json" is not valid JSON'
        )
        
        // technically, a quoted string parses as JSON
        window.fetchResponse = ["\"not-json\"", "text/plain"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response is not a valid JSON'
        )
    })
    
    it("should throw an error if the DoH JSON API response is does not have a Status field", async () => {
        
        window.fetchResponse = [{test: "success"}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'DNS request failure, status code: undefined'
        )
    })
    
    it("should throw an error if the DoH JSON API response has Status other than 0", async () => {
        
        window.fetchResponse = [{Status: 999}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'DNS request failure, status code: 999'
        )
    })
    
    it("should throw an error if the DoH JSON API response does not have an Answer field", async () => {
        
        window.fetchResponse = [{Status: 0}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'DNS response did not contain a valid Answer section'
        )
    })
    
    it("should throw an error if the DoH JSON API response's Answer field is not an object", async () => {
        
        window.fetchResponse = [{Status: 0, Answer: 'invalid'}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'DNS response did not contain a valid Answer section'
        )
    })
    
    it("should throw an error if the DoH JSON API response's Answer field is not an Array", async () => {
        
        window.fetchResponse = [{Status: 0, Answer: {}}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'DNS response did not contain a valid Answer section'
        )
    })
    
    it("should throw an error if the DoH JSON API response's Answer field does not contain TXT records", async () => {
        
        window.fetchResponse = [{Status: 0, Answer: ['aaa', 'bbb']}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Answer section of the DNS response did not contain any TXT records'
        )
    })
    
    it("should throw an error if the DoH JSON API response's Answer elements do not contain valid endpoint data", async () => {
        
        window.fetchResponse = [{Status: 0, Answer: [{type: 16}, {type: 16}]}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'No TXT record contained http or https endpoint definition'
        )
    })
    
    it("should throw an error if the DoH JSON API response's Answer elements do not contain valid endpoints", async () => {
        
        window.fetchResponse = [{Status: 0, Answer: [{type: 16, data: 'aaa'}, {type: 16, data: 'bbb'}]}, "application/json"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'No TXT record contained http or https endpoint definition'
        )
    })
    
    it("should successfully resolve if the DoH JSON API response contains endpoint data", async () => {
        
        window.fetchResponse = [
            {Status: 0, Answer: [
                {type: 16, data: 'dnslink=/https/example.org'},
                {type: 16, data: 'dnslink=/http/example.net/some/path'}
            ]},
            "application/json"
        ]
        
        // this might fail after the fetch() is done
        // but we only care about the fetch() being done in this test
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        // 1 fetch to resolve DNSLink,
        // then 2 fetch requests to the two DNSLink-resolved endpoints
        assertSpyCalls(fetch, 3)
        assertSpyCall(
            fetch,
            1,
            {
                args: [
                    "https://example.org/test.json",
                    {cache: 'reload'}
                ]
            })
        assertSpyCall(
            fetch,
            2,
            {
                args: [
                    "http://example.net/some/path/test.json",
                    {cache: 'reload'}
                ]
            })
    })
    
    it("should use the configured method when using DoH wire format", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        // we should be doing a GET
        assertEquals(fetch.calls[0].args[1].method, "GET")
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        // we should be doing a POST
        assertEquals(fetch.calls[1].args[1].method, "POST")
    })
    
    it("should error out when DoH wire format request method is other than GET or POST", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "OPTIONS"
        }
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'dohMethod can only be "GET" or "POST", but is set to: OPTIONS'
        )
    })
    
    it("should set Accept, Content-Length, and Content-Type headers correctly when the DoH wire format", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        // we should have Accept set when doing a GET
        assertEquals(
            fetch.calls[0].args[1].headers['accept'],
            'application/dns-message'
        )
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        // we should have Accept, Content-Length, and Content-Type set when doing a POST
        assertEquals(
            fetch.calls[1].args[1].headers['accept'],
            'application/dns-message'
        )
        assertEquals(
            fetch.calls[1].args[1].headers['content-type'],
            'application/dns-message'
        )
        assertEquals(
            fetch.calls[1].args[1].headers['content-length'],
            '39'
        )
    })
    
    it("should set the request data correctly when using the DoH wire format", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        // DNS wire format query packet without the two random ID bytes at the start
        let qpacket = dohPacket([
                            dohPktFrgs.qflags, [0, 1], [0, 0], [0, 0], [0, 0],
                            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class
                        ])
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        assertEquals(
            // strip the actual query off of the URL, base64-decode it,
            // put it in an Uint8Array, and drop the first two bytes (which are randomly generated)
            decodeUrlDoHRequest(
                fetch.calls[0].args[0].split('?dns=')[1]
            ).slice(2),
            // comparing to a DoH wire format packet without the ID field
            qpacket
        )
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        assertEquals(
            // request body without the first two bytes of randomly generated ID field
            fetch.calls[1].args[1].body.slice(2),
            // comparing to a DoH wire format packet without the ID field
            qpacket
        )
    })
    
    it("should set the request ID field randomly when using the DoH wire format", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        // this will also error out, and that's fine
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        // this is not *entirely* repeatable, as there is a *slight* chance
        // that the random values will turn out the same.
        // 
        // that probability is pretty small though.
        // it will hit us at somepoint, but it won't hit us very often
        assertNotEquals(
            // strip the actual query off of the URL, base64-decode it,
            // put it in an Uint8Array, and only use the first two butes (randomly generated request ID
            decodeUrlDoHRequest(
                fetch.calls[0].args[0].split('?dns=')[1]
            ).slice(0, 2),
            decodeUrlDoHRequest(
                fetch.calls[1].args[0].split('?dns=')[1]
            ).slice(0, 2),
            "ID values are randomly generated and should differ, although there is a tiny chance that they matched randomly."
        )
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        // this will error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        // this will also error out. that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        assertNotEquals(
            // request body without the first two bytes of randomly generated ID field
            fetch.calls[2].args[1].body.slice(0, 2),
            // comparing to a DoH wire format packet without the ID field
            fetch.calls[3].args[1].body.slice(0, 2),
            "ID values are randomly generated and should differ, although there is a tiny chance that they matched randomly."
        )
    })
    
    it("should generate a valid DoH wire format question packet", async () => {
        
        // valid question packet, without the first two ID bytes (which are randomly generated)
        let qpacket =  dohPacket([
                            dohPktFrgs.qflags, [0, 1], [0, 0], [0, 0], [0, 0],
                            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class])
        
        // we want DoH wire format, GET method
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        // this will fail, that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        assertEquals(
            decodeUrlDoHRequest(
                fetch.calls[0].args[0].split('?dns=')[1]
            ).slice(2),
            qpacket
        )
        
        // we want DoH wire format, GET method
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        // this will fail, that's okay
        try {
            await LibResilientPluginConstructors
                    .get('dnslink-fetch')(LR, init)
                    .fetch('https://resilient.is/test.json');
        } catch(e) {}
        
        assertEquals(
            fetch.calls[1].args[1].body.slice(2),
            qpacket
        )
        
    })
    
    it("should throw an error if the DoH wire format response is not an application/dns-message media type", async () => {
        
        window.fetchResponse = ["not-dns-message", "text/plain"]
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response Content-Type should be: application/dns-message; is: text/plain.'
        )
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response Content-Type should be: application/dns-message; is: text/plain.'
        )
    })
    
    it("should throw an error if a DoH wire format response's header is not correctly formatted ", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        window.fetchResponse = [
            "invalid",
            "application/dns-message"]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: response cannot be shorter than request!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // modify the ID
                response[0] += 1
                response[1] += 1
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response ID does not match Request ID!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // modify the QR bit, needs to be 0b1xxxxxxx to indicate a response
                response[2] = 0b00000000
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: QR bit does not indicate a response!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // modify the OPCODE flag, needs to be 0bx0000xxx in a valid response
                response[2] = 0b11010000
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: OPCODE contains an unexpected value (should be zero)!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // modify the TC bit, needs to be 0bxxxxxx0x in a valid response we can handle
                response[2] = 0b10000010
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: Got a truncated response. There is no reason for it, and we cannot handle it.'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // modify the RD bit, needs to be 0bxxxxxxx1 in a valid response
                response[2] = 0b10000000
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: Recursive resolution was requested but this is not reflected in response.'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the Z field, needs to be 0bx000xxxx in a valid response
                response[3] = 0b11110000
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: Response\'s Z field is not zeroed out!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the RCODE field, 1 means format error
                response[3] = 0b00000001
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s RCODE field indicates a format error!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the RCODE field, 2 means server failure
                response[3] = 0b00000010
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s RCODE field indicates a server failure!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the RCODE field, 3 means the name does not exist
                response[3] = 0b00000011
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s RCODE field indicates a the name does not exist!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the RCODE field, 4 means not implemented error
                response[3] = 0b00000100
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s RCODE field indicates a not implemented error!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the RCODE field, 5 means the request was refused
                response[3] = 0b00000101
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s RCODE field indicates the request was refused!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // modify the RCODE field, any code > 5 is an error as well
                response[3] = 0b00001101
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s RCODE field indicates an error (code: 13)!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // QDCOUNT needs to be 1 (we only asked one question)
                response[4] = 0
                response[5] = 0
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s QDCOUNT is different than request\'s QDCOUNT (should be 1)!'
        )
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // ANCOUNT needs to be 1 or higher (we do want a response)
                response[6] = 0
                response[7] = 0
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Response\'s ANCOUNT indicates no resource records received in response!'
        )
        
    })
    
    it("should throw an error if a DoH wire format response's question section is not correctly formatted", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        window.fetchResponse = [
            (url)=>{
                // take the request
                let response = decodeUrlDoHRequest(
                                    url.split('?dns=')[1]
                                )
                // response[2] needs to be valid for a response
                // we're taking this from a request, so we need to massage it
                response[2] = 0b10000001
                // ANCOUNT needs to be 1 or higher (we do want a response)
                response[6] = 0
                response[7] = 1
                // question section needs to be otherwise repeated one-to-one
                // so let's modify it in random ways
                response[14] += 5
                response[17] -= 3
                response[response.length - 3] += 2
                response[response.length - 1] += 9
                // now it is our response
                return response
            },
            "application/dns-message"
        ]
        
        assertRejects(
            async ()=>{
                return await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: QNAME, QTYPE, or QCLASS do not match between request and response.'
        )
        
    })
    
    it("should process a valid DoH wire format response to a GET request and use the alternative endpoint it contains", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        window.fetchResponse = [
            (url, reqinit)=>{
                // after the DoH wire format request we need to handle also the request to the alternative endpoint
                if (url == "https://example.com/test/test.json") {
                    return JSON.stringify({test: "success"})
                // this is handling the DoH wire format request
                } else {
                    // take the request
                    let request = decodeUrlDoHRequest(
                                        url.split('?dns=')[1]
                                    )
                    // response[2] needs to be valid for a response
                    // we're taking this from a request, so we need to massage it
                    request[2] = 0b10000001
                    // ANCOUNT needs to be 1 or higher (we do want a response)
                    request[6] = 0
                    request[7] = 1
                    // responses start after the question section
                    // so we can just bolt it directly to the request and call it a day, kind of
                    let response = dohPacket([
                        request,
                        ...response_data
                    ])
                    // now it is our response
                    return response
                }
            },
            "application/dns-message"
        ]
        
        let response_data = [
            // name, type, class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        // this should succeed
        await LibResilientPluginConstructors
                .get('dnslink-fetch')(LR, init)
                .fetch('https://resilient.is/test.json');
                
        assertSpyCall(fetch, 1, {args: [
            "https://example.com/test/test.json",
            {
                cache: "reload",
            }]
        })
        
        // now same, but with a name pointer instead of a full name in the response
        response_data = [
            // pointer to the name in question part, type, class, TTL
            dohPktFrgs.nameptr, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        // this should succeed
        await LibResilientPluginConstructors
                .get('dnslink-fetch')(LR, init)
                .fetch('https://resilient.is/test.json');
                
        assertSpyCall(fetch, 3, {args: [
            "https://example.com/test/test.json",
            {
                cache: "reload",
            }]
        })
    })
    
    it("should process a valid DoH wire format response to a POST request and use the alternative endpoint it contains", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        window.fetchResponse = [
            (url, reqinit)=>{
                // after the DoH wire format request we need to handle also the request to the alternative endpoint
                if (url == "https://example.com/test/test.json") {
                    return JSON.stringify({test: "success"})
                // this is handling the DoH wire format request
                } else {
                    // take the request body
                    let request = reqinit.body
                    // response[2] needs to be valid for a response
                    // we're taking this from a request, so we need to massage it
                    request[2] = 0b10000001
                    // ANCOUNT needs to be 1 or higher (we do want a response)
                    request[6] = 0
                    request[7] = 1
                    // responses start after the question section
                    // so we can just bolt it directly to the request and call it a day, kind of
                    let response = dohPacket([
                        request,
                        ...response_data
                    ])
                    // now it is our response
                    return response
                }
            },
            "application/dns-message"
        ]
        
        let response_data = [
            // name, type, class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        // this should succeed
        await LibResilientPluginConstructors
                .get('dnslink-fetch')(LR, init)
                .fetch('https://resilient.is/test.json');
                
        assertSpyCall(fetch, 1, {args: [
            "https://example.com/test/test.json",
            {
                cache: "reload",
            }]
        })
        
        // now same, but with a name pointer instead of a full name in the response
        response_data = [
            // pointer to the name in question part, type, class, TTL
            dohPktFrgs.nameptr, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        // this should succeed
        await LibResilientPluginConstructors
                .get('dnslink-fetch')(LR, init)
                .fetch('https://resilient.is/test.json');
                
        assertSpyCall(fetch, 3, {args: [
            "https://example.com/test/test.json",
            {
                cache: "reload",
            }]
        })
    })
    
    it("should error out on invalid DoH wire format responses to a GET request", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "GET"
        }
        
        window.fetchResponse = [
            (url, reqinit)=>{
                // after the DoH wire format request we need to handle also the request to the alternative endpoint
                if (url == "https://example.com/test/test.json") {
                    return JSON.stringify({test: "success"})
                // this is handling the DoH wire format request
                } else {
                    // take the request
                    let request = decodeUrlDoHRequest(
                                        url.split('?dns=')[1]
                                    )
                    // response[2] needs to be valid for a response
                    // we're taking this from a request, so we need to massage it
                    request[2] = 0b10000001
                    // ANCOUNT needs to be 1 or higher (we do want a response)
                    request[6] = 0
                    request[7] = 1
                    // responses start after the question section
                    // so we can just bolt it directly to the request and call it a day, kind of
                    let response = dohPacket([
                        request,
                        ...response_data
                    ])
                    // now it is our response
                    return response
                }
            },
            "application/dns-message"
        ]
        
        // invalid response: invalid pointer offset
        let response_data = [
            // invalid nameptr, type, class, TTL
            dohPktFrgs.nameptr[0], dohPktFrgs.nameptr[1] + 5, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: unexpected name pointer offset 17 (expected: 12)'
        )
        
        // invalid response: wrong name
        let badname = [...dohPktFrgs.name]
        badname[4] += 1
        badname[5] += 1
        response_data = [
            // wrong name, type, class, TTL
            badname, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: NAME in an answer does not match the QNAME from the request.'
        )
        
        // invalid response: the first byte of the response has to start
        // with 0b11 (a name pointer) or 0b00 (a name)
        badname = [...dohPktFrgs.name]
        badname[0] = badname[0] | 0b01000000;
        response_data = [
            // bad byte name, type, class, TTL
            badname, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: answer's NAME starts with something else than 0b11 or 0b00."
        )
        
        // invalid response: type not indicating a TXT record
        response_data = [
            // name, invalid type, class, TTL
            dohPktFrgs.name, dohPktFrgs.type[0], dohPktFrgs.type[1] + 4, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "No TXT record contained http or https endpoint definition"
        )
        
        // invalid response: incorrect class
        response_data = [
            // name, type, incorrect class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class[0], dohPktFrgs.class[1] + 10, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: unexpected CLASS: 11"
        )
        
        // invalid response: RDLENGTH must not be zero
        response_data = [
            // name, type, class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // incorrect RDLENGTH
            [0, 0],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: RDLENGTH is zero"
        )
        
        // invalid response: RDLENGTH must be 1 higher than TXT RR length field
        response_data = [
            // name, type, incorrect class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // incorrect TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: RDLENGTH does not match TXT record length"
        )
    })
    
    it("should error out on invalid DoH wire format responses to a POST request", async () => {
        
        init = {
            name: "dnslink-fetch",
            dohMediaType: "application/dns-message",
            dohMethod: "POST"
        }
        
        window.fetchResponse = [
            (url, reqinit)=>{
                // after the DoH wire format request we need to handle also the request to the alternative endpoint
                if (url == "https://example.com/test/test.json") {
                    return JSON.stringify({test: "success"})
                // this is handling the DoH wire format request
                } else {
                    // take the request
                    let request = reqinit.body
                    // response[2] needs to be valid for a response
                    // we're taking this from a request, so we need to massage it
                    request[2] = 0b10000001
                    // ANCOUNT needs to be 1 or higher (we do want a response)
                    request[6] = 0
                    request[7] = 1
                    // responses start after the question section
                    // so we can just bolt it directly to the request and call it a day, kind of
                    let response = dohPacket([
                        request,
                        ...response_data
                    ])
                    // now it is our response
                    return response
                }
            },
            "application/dns-message"
        ]
        
        // invalid response: invalid pointer offset
        let response_data = [
            // invalid nameptr, type, class, TTL
            dohPktFrgs.nameptr[0], dohPktFrgs.nameptr[1] + 5, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: unexpected name pointer offset 17 (expected: 12)'
        )
        
        // invalid response: wrong name
        let badname = [...dohPktFrgs.name]
        badname[4] += 1
        badname[5] += 1
        response_data = [
            // wrong name, type, class, TTL
            badname, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            'Invalid response: NAME in an answer does not match the QNAME from the request.'
        )
        
        // invalid response: the first byte of the response has to start
        // with 0b11 (a name pointer) or 0b00 (a name)
        badname = [...dohPktFrgs.name]
        badname[0] = badname[0] | 0b01000000;
        response_data = [
            // bad byte name, type, class, TTL
            badname, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: answer's NAME starts with something else than 0b11 or 0b00."
        )
        
        // invalid response: type not indicating a TXT record
        response_data = [
            // name, invalid type, class, TTL
            dohPktFrgs.name, dohPktFrgs.type[0], dohPktFrgs.type[1] + 4, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "No TXT record contained http or https endpoint definition"
        )
        
        // invalid response: incorrect class
        response_data = [
            // name, type, incorrect class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class[0], dohPktFrgs.class[1] + 10, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: unexpected CLASS: 11"
        )
        
        // invalid response: RDLENGTH must not be zero
        response_data = [
            // name, type, class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // incorrect RDLENGTH
            [0, 0],
            // TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: RDLENGTH is zero"
        )
        
        // invalid response: RDLENGTH must be 1 higher than TXT RR length field
        response_data = [
            // name, type, incorrect class, TTL
            dohPktFrgs.name, dohPktFrgs.type, dohPktFrgs.class, dohPktFrgs.ttl,
            // RDLENGTH
            [0, (dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // incorrect TXT RR length
            [(dohPktFrgs.dnslink.length + dohPktFrgs.https.length + dohPktFrgs.https_addr1.length + 1)],
            // TXT RR: dnslink=/https/...
            dohPktFrgs.dnslink, dohPktFrgs.https, dohPktFrgs.https_addr1
        ]
        
        assertRejects(
            async ()=>{
                await LibResilientPluginConstructors
                        .get('dnslink-fetch')(LR, init)
                        .fetch('https://resilient.is/test.json');
            },
            Error,
            "Invalid response: RDLENGTH does not match TXT record length"
        )
    })
    
    it("should fetch the content, trying all DNSLink-resolved endpoints (if fewer or equal to concurrency setting)", async () => {
        
        window.fetchResponse = [
            {Status: 0, Answer: [
                {type: 16, data: 'dnslink=/https/example.org'},
                {type: 16, data: 'dnslink=/http/example.net/some/path'}
            ]},
            "application/json"
        ]
        const response = await LibResilientPluginConstructors.get('dnslink-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        // 1 fetch to resolve DNSLink,
        // then 2 fetch requests to the two DNSLink-resolved endpoints
        assertSpyCalls(fetch, 3)
        assertEquals(await response.json(), window.fetchResponse[0])
        assertSpyCall(
            fetch,
            1,
            {
                args: [
                    "https://example.org/test.json",
                    {cache: 'reload'}
                ]
            })
        assertSpyCall(
            fetch,
            2,
            {
                args: [
                    "http://example.net/some/path/test.json",
                    {cache: 'reload'}
                ]
            })
    })
    
    it("should fetch the content, trying <concurrency> random endpoints out of all DNSLink-resolved endpoints (if more than concurrency setting)", async () => {
    
        init.concurrency = 3
        
        window.fetchResponse = [
            {Status: 0, Answer: [
                {type: 16, data: 'dnslink=/https/example.org'},
                {type: 16, data: 'dnslink=/http/example.net/some/path'},
                {type: 16, data: 'dnslink=/https/example.net/some/path'},
                {type: 16, data: 'dnslink=/https/example.net/some/other/path'}
            ]},
            "application/json"
        ]
        const response = await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json');
  
        // 1 fetch to resolve DNSLink,
        // then 3 fetch requests to random three of the five DNSLink-resolved endpoints
        assertSpyCalls(fetch, 4)
        assertEquals(await response.json(), window.fetchResponse[0])
    })
    
    it("should pass the Request() init data to fetch() for all used endpoints", async () => {
        
        var initTest = {
            method: "GET",
            headers: new Headers({"x-stub": "STUB"}),
            mode: "mode-stub",
            credentials: "credentials-stub",
            cache: "cache-stub",
            referrer: "referrer-stub",
            // these are not implemented by service-worker-mock
            // https://github.com/zackargyle/service-workers/blob/master/packages/service-worker-mock/models/Request.js#L20
            redirect: undefined,
            integrity: undefined,
            cache: undefined
        }
        
        window.fetchResponse = [
            {Status: 0, Answer: [
                {type: 16, data: 'dnslink=/https/example.org'},
                {type: 16, data: 'dnslink=/http/example.net/some/path'},
                {type: 16, data: 'dnslink=/https/example.net/some/path'}
            ]},
            "application/json"
        ]
        
        const response = await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json', initTest);
        
        // 1 fetch to resolve DNSLink,
        // then 3 fetch requests to the three DNSLink-resolved endpoints
        assertSpyCalls(fetch, 4)
        assertEquals(await response.json(), window.fetchResponse[0])
        
        assertSpyCall(
            fetch,
            1,
            {
                args: [
                    "https://example.org/test.json",
                    initTest
                ]
            })
        assertSpyCall(
            fetch,
            2,
            {
                args: [
                    "http://example.net/some/path/test.json",
                    initTest
                ]
            })
        assertSpyCall(
            fetch,
            3,
            {
                args: [
                    "https://example.net/some/path/test.json",
                    initTest
                ]
            })
    })
    
    
    it("should set the LibResilient headers, setting X-LibResilient-ETag based on Last-Modified (if ETag is unavailable in the original response)", async () => {
        
        window.fetchResponse = [
            {Status: 0, Answer: [
                {type: 16, data: 'dnslink=/https/example.org'},
                {type: 16, data: 'dnslink=/http/example.net/some/path'}
            ]},
            "application/json"]
        
        const response = await LibResilientPluginConstructors.get('dnslink-fetch')(LR, init).fetch('https://resilient.is/test.json');
        
        // 1 fetch to resolve DNSLink,
        // then 3 fetch requests to the three DNSLink-resolved endpoints
        assertSpyCalls(fetch, 3)
        assertEquals(await response.json(), window.fetchResponse[0])
        assert(response.headers.has('X-LibResilient-Method'))
        assert(response.headers.has('X-LibResilient-Etag'))
        assertEquals(response.headers.get('X-LibResilient-Method'), 'dnslink-fetch')
        assertEquals(response.headers.get('X-LibResilient-Etag'), 'TestingLastModifiedHeader')
    });
    
    it("should throw an error when HTTP status is >= 400", async () => {
    
        window.resolvingFetch = (url, init) => {
            if (url.startsWith('https://dns.hostux.net/dns-query')) {
                const response = new Response(
                                    new Blob(
                                        [JSON.stringify(fetchResponse[0])],
                                        {type: fetchResponse[1]}
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
            } else {
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
        }
        window.fetch = spy(window.resolvingFetch)
        
        window.fetchResponse = [
            {Status: 0, Answer: [
                {type: 16, data: 'dnslink=/https/example.org'},
                {type: 16, data: 'dnslink=/http/example.net/some/path'}
            ]},
            "application/json"
        ]
        
        assertRejects(
            async ()=>{
                const response = await LibResilientPluginConstructors
                                .get('dnslink-fetch')(LR, init)
                                .fetch('https://resilient.is/test.json')
                console.log(response)
            },
            Error,
            'HTTP Error:'
        )
    });
})
