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
    window.resolvingFetchSpy = spy(window.resolvingFetch)
    window.init = {
        name: 'redirect',
        redirectStatus: 302,
        redirectStatusText: "Found",
        redirectTo: "https://redirected.example.org/subdir/"
    }
})

afterEach(()=>{
    window.init = null
    window.resolvingFetchSpy = null
})

describe('browser: redirect plugin', async () => {
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
    window.resolvingFetchSpy = null
    await import("../../../plugins/redirect/index.js");
    
    it("should register in LibResilientPluginConstructors", () => {
        init = {
            name: 'redirect',
            redirectTo: 'https://example.org/'
        }
        assertEquals(LibResilientPluginConstructors.get('redirect')(LR, init).name, 'redirect');
    });
    
    it("should fail with incorrect redirectTo config value", () => {
        init = {
            name: 'redirect',
            redirectTo: false
        }
        assertThrows(
            ()=>{
                LibResilientPluginConstructors.get('redirect')(LR, init)
            },
            Error,
            "redirectTo should be a string"
        )
    });
    
    it("should fail with incorrect redirectStatus config value", () => {
        init = {
            name: 'redirect',
            redirectTo: 'https://example.org/',
            redirectStatus: 'incorrect'
        }
        assertThrows(
            ()=>{
                LibResilientPluginConstructors.get('redirect')(LR, init)
            },
            Error,
            "redirectStatus should be a number"
        )
    });
    
    it("should fail with incorrect redirectStatusText config value", () => {
        init = {
            name: 'redirect',
            redirectTo: 'https://example.org/',
            redirectStatusText: false
        }
        assertThrows(
            ()=>{
                LibResilientPluginConstructors.get('redirect')(LR, init)
            },
            Error,
            "redirectStatusText should be a string"
        )
    });
    
    it("should register in LibResilientPluginConstructors without error even if all config data is incorrect, as long as enabled is false", () => {
        init = {
            name: 'redirect',
            redirectTo: false,
            redirectStatus: "incorrect",
            redirectStatusText: false,
            enabled: false
        }
         assertEquals(LibResilientPluginConstructors.get('redirect')(LR, init).name, 'redirect');
    });
    
    it("should return a 302 Found redirect to a configured location for any request", async () => {
        init = {
            name: 'redirect',
            redirectTo: "https://redirected.example.org/subdirectory/"
        }
        const response = await LibResilientPluginConstructors.get('redirect')(LR, init).fetch('https://resilient.is/test.json');
        assertEquals(response.status, 302)
        assertEquals(response.statusText, 'Found')
        assertEquals(response.headers.get('location'), 'https://redirected.example.org/subdirectory/test.json')
    })
})
