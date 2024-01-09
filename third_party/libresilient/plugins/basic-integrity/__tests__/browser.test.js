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
        name: 'basic-integrity',
        uses: [
            {
                name: 'resolve-all',
                description: 'Resolves all',
                version: '0.0.1',
                fetch: window.resolvingFetchSpy
            }
        ],
        integrity: {
            "https://resilient.is/test.json": "sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z"
        },
        requireIntegrity: true
    }
})

afterEach(()=>{
    window.init = null
    window.resolvingFetchSpy = null
})

describe('browser: basic-integrity plugin', async () => {
    window.LibResilientPluginConstructors = new Map()
    window.LR = {
            log: (component, ...items)=>{
                console.debug(component + ' :: ', ...items)
            }
        }
    // mocking window.location
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/location
    window.location = {
        origin: "https://resilient.is"
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
    await import("../../../plugins/basic-integrity/index.js");
    
    it("should register in LibResilientPluginConstructors", async () => {
        assertEquals(
            LibResilientPluginConstructors
                .get('basic-integrity')(LR, init)
                .name,
            'basic-integrity');
    });
    
    it("should throw an error when there aren't any wrapped plugins configured", async () => {
        init = {
            name: 'basic-integrity',
            uses: []
        }
        assertThrows( () => {
                return LibResilientPluginConstructors
                        .get('basic-integrity')(LR, init)
                        .fetch('https://resilient.is/test.json')
            },
            Error,
            'Expected exactly one plugin to wrap'
        )
    });
    
    it("should throw an error when there are more than one wrapped plugins configured", async () => {
        init = {
            name: 'basic-integrity',
            uses: [{
                name: 'plugin-1'
            },{
                name: 'plugin-2'
            }]
        }
        
        assertThrows( () => {
                return LibResilientPluginConstructors
                        .get('basic-integrity')(LR, init)
                        .fetch('https://resilient.is/test.json')
            },
            Error,
            'Expected exactly one plugin to wrap'
        )
    });
    
    it("should return data from the wrapped plugin", async () => {
        const response = await LibResilientPluginConstructors.get('basic-integrity')(LR, init).fetch('https://resilient.is/test.json');
        assertSpyCalls(resolvingFetchSpy, 1);
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should provide the wrapped plugin with integrity data for a configured URL", async () => {
        const response = await LibResilientPluginConstructors.get('basic-integrity')(LR, init).fetch('https://resilient.is/test.json');
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {
                        integrity: init.integrity['https://resilient.is/test.json']
                    }]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should error out for an URL with no integrity data, when requireIntegrity is true", async () => {
        assertThrows( () => {
                return LibResilientPluginConstructors
                        .get('basic-integrity')(LR, init)
                        .fetch('https://resilient.is/test2.json')
            },
            Error,
            'Integrity data required but not provided for'
        )
        assertSpyCalls(resolvingFetchSpy, 0)
    });
    
    it("should return data from the wrapped plugin with no integrity data if requireIntegrity is false", async () => {
        init.integrity = {}
        init.requireIntegrity = false
        
        const response = await LibResilientPluginConstructors.get('basic-integrity')(LR, init).fetch('https://resilient.is/test.json');
        
        assertSpyCalls(resolvingFetchSpy, 1)
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {}
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should return data from the wrapped plugin with no integrity data configured when requireIntegrity is true and integrity data is provided in Request() init data", async () => {
        init.integrity = {}
        
        const response = await LibResilientPluginConstructors
                                .get('basic-integrity')(LR, init)
                                .fetch('https://resilient.is/test.json', {
                                    integrity: "sha256-Aj9x0DWq9GUL1L8HibLCMa8YLKnV7IYAfpYurqrFwiQ="
                                });
                                
        assertSpyCalls(resolvingFetchSpy, 1)
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {
                        integrity: "sha256-Aj9x0DWq9GUL1L8HibLCMa8YLKnV7IYAfpYurqrFwiQ="
                    }
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should return data from the wrapped plugin with integrity data both configured and coming from Request() init", async () => {
        const response = await LibResilientPluginConstructors
                                .get('basic-integrity')(LR, init)
                                .fetch('https://resilient.is/test.json', {
                                    integrity: "sha256-Aj9x0DWq9GUL1L8HibLCMa8YLKnV7IYAfpYurqrFwiQ="
                                });
                                
        assertSpyCalls(resolvingFetchSpy, 1)
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {
                        integrity: "sha256-Aj9x0DWq9GUL1L8HibLCMa8YLKnV7IYAfpYurqrFwiQ= sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z"
                    }
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    // as per documentation, this plugin is not supposed to actualy *verify* integrity of fetched resources!
    it("should return data from the wrapped plugin even with incorrect integrity data provided", async () => {
        init.integrity = {}
        
        const response = await LibResilientPluginConstructors
                                .get('basic-integrity')(LR, init)
                                .fetch('https://resilient.is/test.json', {
                                    integrity: "sha256-INCORRECTINCORRECTINCORRECTINCORRECTINCORRECT"
                                });
                                
        assertSpyCalls(resolvingFetchSpy, 1)
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {
                        integrity: "sha256-INCORRECTINCORRECTINCORRECTINCORRECTINCORRECT"
                    }
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should set integrity data specified for absolute paths correctly on relevant requests", async () => {
        init.integrity = {
            "/test.json": "sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z"
        }
        
        const response = await LibResilientPluginConstructors
                                .get('basic-integrity')(LR, init)
                                .fetch('https://resilient.is/test.json');
                                
        assertSpyCalls(resolvingFetchSpy, 1)
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {
                        integrity: "sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z"
                    }
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });
    
    it("should concatenate integrity data specified for the same effective URL twice (by absolute path, and by URL)", async () => {
        init.integrity = {
            "/test.json": "sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z",
            "https://resilient.is/test.json": "sha256-Aj9x0DWq9GUL1L8HibLCMa8YLKnV7IYAfpYurqrFwiQ="
        }
        
        const response = await LibResilientPluginConstructors
                                .get('basic-integrity')(LR, init)
                                .fetch('https://resilient.is/test.json');
                                
        assertSpyCalls(resolvingFetchSpy, 1)
        assertSpyCall(
            resolvingFetchSpy,
            0,
            {
                args: [
                    'https://resilient.is/test.json',
                    {
                        integrity: "sha256-Aj9x0DWq9GUL1L8HibLCMa8YLKnV7IYAfpYurqrFwiQ= sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z"
                    }
                ]
            })
        assertEquals(await response.json(), {test: "success"})
    });

})
