import {
    assert,
    assertRejects,
    assertEquals,
    assertStringIncludes,
    assertObjectMatch
} from "https://deno.land/std@0.167.0/testing/asserts.ts";

// this needs to be the same as the pubkey in:
// ./__denotests__/mocks/keyfile.json
var pubkey = {
    "kty": "EC",
    "crv": "P-384",
    "alg": "ES384",
    "x": "rrFawYTuFo8ZjoDxaztUU-c_RAwjw1Y9Tp3j4nH4WsY2Zlizf40Mvz_0BUkVVZCw",
    "y": "HaFct6PVK2CQ7ZT2SHClnN-knmGfjY_DFwc6qrAu1s0DFZ8fEUuNdmkTlj9T4NQw",
    "key_ops": [
        "verify"
    ],
    "ext": true
}

/**
 * helper function — decode a b64url-encoded string
 */
let b64urlDecode = (data) => {
    data  = data.replace(/_/g, '/').replace(/-/g, '+')
    data += '='.repeat((4 - (data.length % 4)) % 4)
    return atob(data)
}

/**
 * helper function — verify a signed JWT using a provided key
 */
let verifySignedJWT = async (jwt, key) => {
    
    // working in sections
    jwt = jwt.split('.')
    
    // sections cannot be empty
    if ( (jwt[0].length == 0) || (jwt[1].length == 0) || (jwt[2].length == 0) ) {
        throw new Error('JWT is invalid, one or more sections are empty.')
    }
    
    // load the key
    key = await crypto.subtle.importKey(
                    "jwk",
                    key,
                    {
                        name: 'ECDSA',
                        namedCurve: 'P-384'
                    },
                    true,
                    ['verify']
                )
    
    // checking the header
    var header = JSON.parse(b64urlDecode(jwt[0]))
    if (!("alg" in header) || (header.alg != "ES384")) {
        throw new Error('Expected header to contain alg field set to "ES384"')
    }
    
    // get the signature in a usable format
    var signature = Uint8Array
                    .from(
                        Array
                            .from(b64urlDecode(jwt[2]))
                            .map(e=>e.charCodeAt(0))
                    ).buffer
    
    // return the result of signature verification
    return await crypto.subtle.verify(
                                    {
                                        name: "ECDSA",
                                        hash: {name: "SHA-384"}
                                    },
                                    key,
                                    signature,
                                    new TextEncoder("utf-8").encode(jwt[0] + '.' + jwt[1])
                                )
}


Deno.test("plugin loads", async () => {
    const bi = await import('../cli.js')
    assert("name" in bi)
    assert(bi.name == "signed-integrity")
    assert("description" in bi)
    assert("actions" in bi)
});

Deno.test("gen-integrity action defined", async () => {
    const bi = await import('../cli.js')
    assert("gen-integrity" in bi.actions)
    
    const gi = bi.actions["gen-integrity"]
    assert("run" in gi)
    assert("description" in gi)
    assert("arguments" in gi)
    
    const gia = gi.arguments
    assert("_" in gia)
    assert("keyfile" in gia)
    assert("algorithm" in gia)
    assert("output" in gia)
    assert("extension" in gia)
    
    assert("name" in gia._)
    assert("description" in gia._)
    
    assert("description" in gia.keyfile)
    assert("string" in gia.keyfile)
    assert(!("collect" in gia.keyfile))
    assert(gia.keyfile.string)
    
    assert("description" in gia.algorithm)
    assert("collect" in gia.algorithm)
    assert(gia.algorithm.collect)
    assert("string" in gia.algorithm)
    assert(gia.algorithm.string)
    
    assert("description" in gia.output)
    assert(!("collect" in gia.output))
    assert("string" in gia.output)
    assert(gia.output.string)
    
    assert("description" in gia.extension)
    assert(!("collect" in gia.extension))
    assert("string" in gia.extension)
    assert(gia.extension.string)
});

// this is a separate test in order to catch any changing defaults
Deno.test("gen-integrity action defaults", async () => {
    const bi = await import('../cli.js')
    const gia = bi.actions["gen-integrity"].arguments
    assert("default" in gia.algorithm)
    assert(gia.algorithm.default == "SHA-256")
    assert("default" in gia.output)
    assert(gia.output.default == "json")
    assert("default" in gia.extension)
    assert(gia.extension.default == ".integrity")
});

Deno.test("gen-integrity verifies arguments are sane", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["gen-integrity"]
    assertRejects(gi.run, Error, "Expected non-empty list of paths to process.")
    assertRejects(async ()=>{
        await gi.run(['no-such-file'])
    }, Error, "No keyfile provided.")
    assertRejects(async ()=>{
        await gi.run(['no-such-file'], 'irrelevant')
    }, Error, "No such file or directory")
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], 'irrelevant', [])
    }, Error, "Expected non-empty list of algorithms to use.")
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], 'irrelevant', ['SHA-384'], false)
    }, Error, "Expected 'json', 'text', or 'files' as output type.")
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], 'irrelevant', ['SHA-384'], 'files', false)
    }, Error, "No extension provided.")
    // extension is ignored even if incorrect when output is not 'files'
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], 'irrelevant', ['SHA-384'], 'text', false)
    }, Error, "Failed to load private key from 'irrelevant': No such file or directory")
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], 'irrelevant', ['SHA-384'], 'json', false)
    }, Error, "Failed to load private key from 'irrelevant': No such file or directory")
});

Deno.test("gen-integrity handles paths correctly", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["gen-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    const mk = import.meta.resolve('./mocks/keyfile.json').replace(/^file:\/\//gi, "")
    assertRejects(async ()=>{
        await gi.run(['./'], 'non-existent')
    }, Error, "Failed to load private key from 'non-existent'")
    assertRejects(async ()=>{
        await gi.run(['./'], './')
    }, Error, "Failed to load private key from './': Is a directory")
    assertEquals(
        await gi.run(['./'], mk),
        '{}'
    )
    assertStringIncludes(
        await gi.run([mh], mk),
        '"' + mh + '":"eyJhbGciOiAiRVMzODQifQ.eyJpbnRlZ3JpdHkiOiAic2hhMjU2LXVVMG51Wk5OUGdpbExsTFgybjJyK3NTRTcrTjZVNER1a0lqM3JPTHZ6ZWs9In0.'
    )
});

Deno.test("gen-integrity handles algos argument correctly", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["gen-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    const mk = import.meta.resolve('./mocks/keyfile.json').replace(/^file:\/\//gi, "")
    assertRejects(async ()=>{
        await gi.run([mh], mk, ['BAD-ALG'])
    }, Error, 'Unrecognized algorithm name')
    
    // helper function
    let getGeneratedTestIntegrity = async (algos) => {
        let integrity = JSON.parse(await gi.run(
                        [mh],
                        mk,
                        algos)
                    )
        integrity = b64urlDecode(integrity[mh].split('.')[1])
        return integrity
    }
    
    assertEquals(await getGeneratedTestIntegrity(['SHA-256']), '{"integrity": "sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek="}')
    assertEquals(await getGeneratedTestIntegrity(['SHA-384']), '{"integrity": "sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9"}')
    assertEquals(await getGeneratedTestIntegrity(['SHA-512']), '{"integrity": "sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw=="}')
    assertEquals(await getGeneratedTestIntegrity(['SHA-256', 'SHA-384', 'SHA-512']), '{"integrity": "sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek= sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9 sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw=="}')
});

Deno.test("gen-integrity text output is correct", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["gen-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    const mk = import.meta.resolve('./mocks/keyfile.json').replace(/^file:\/\//gi, "")
    
    let getGeneratedTestIntegrity = async (algos) => {
        let result = await gi.run(
                        [mh],
                        mk,
                        algos,
                        'text'
                    )
        result = result.split(' ')
        return [result[0], b64urlDecode(result[1].split('.')[1])]
    }
    
    assertEquals(
        await getGeneratedTestIntegrity(['SHA-256']),
        [
            mh + ":",
            '{"integrity": "sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek="}'
        ]
    )
    assertEquals(
        await getGeneratedTestIntegrity(['SHA-384']),
        [
            mh + ":",
            '{"integrity": "sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9"}'
        ]
    )
    assertEquals(
        await getGeneratedTestIntegrity(['SHA-512']),
        [
            mh + ":",
            '{"integrity": "sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw=="}'
        ]
    )
    
    
    assertEquals(
        await getGeneratedTestIntegrity(['SHA-256', 'SHA-384', 'SHA-512']),
        [
            mh + ":",
            '{"integrity": "sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek= sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9 sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw=="}'
        ]
    )
});

// TODO: "files" output mode, which will require mocking file writing routines

Deno.test("gen-integrity signs the data correctly", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["gen-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    const mk = import.meta.resolve('./mocks/keyfile.json').replace(/^file:\/\//gi, "")
    let jwt = JSON.parse(await gi.run([mh], mk))
    assert(
        await verifySignedJWT(
            jwt[mh],
            pubkey))
})

Deno.test("get-pubkey works correctly", async () => {
    const bi = await import('../cli.js')
    const gp = bi.actions["get-pubkey"]
    const mk = import.meta.resolve('./mocks/keyfile.json').replace(/^file:\/\//gi, "")
    assertRejects(gp.run, Error, "No keyfile provided.")
    assertRejects(async ()=>{
        await gp.run('no-such-file')
    }, Error, "No such file or directory")
    assertRejects(async ()=>{
        await gp.run(['no-such-file'])
    }, Error, "No such file or directory")
    assertEquals(
        await gp.run(mk),
        '{"kty":"EC","crv":"P-384","alg":"ES384","x":"rrFawYTuFo8ZjoDxaztUU-c_RAwjw1Y9Tp3j4nH4WsY2Zlizf40Mvz_0BUkVVZCw","y":"HaFct6PVK2CQ7ZT2SHClnN-knmGfjY_DFwc6qrAu1s0DFZ8fEUuNdmkTlj9T4NQw","key_ops":["verify"],"ext":true}'
    )
    assertEquals(
        await gp.run([mk, 'irrelevant']),
        '{"kty":"EC","crv":"P-384","alg":"ES384","x":"rrFawYTuFo8ZjoDxaztUU-c_RAwjw1Y9Tp3j4nH4WsY2Zlizf40Mvz_0BUkVVZCw","y":"HaFct6PVK2CQ7ZT2SHClnN-knmGfjY_DFwc6qrAu1s0DFZ8fEUuNdmkTlj9T4NQw","key_ops":["verify"],"ext":true}'
    )
});

Deno.test("gen-keypair works correctly", async () => {
    const bi = await import('../cli.js')
    const gk = bi.actions["gen-keypair"]
    const keypair = JSON.parse(await gk.run())
    assert('privateKey' in keypair)
    assert('x' in keypair.privateKey)
    assert('y' in keypair.privateKey)
    assert('d' in keypair.privateKey)
    assertObjectMatch(
        keypair.privateKey,
        {
            kty: "EC",
            crv: "P-384",
            alg: "ES384",
            key_ops: [
                "sign"
            ],
            ext: true
        }
    )
    assert('publicKey' in keypair)
    assert('x' in keypair.publicKey)
    assert('y' in keypair.publicKey)
    assert(!('d' in keypair.publicKey))
    assertObjectMatch(
        keypair.publicKey,
        {
            kty: "EC",
            crv: "P-384",
            alg: "ES384",
            key_ops: [
                "verify"
            ],
            ext: true
        }
    )
    assert((keypair.privateKey.x == keypair.publicKey.x))
    assert((keypair.privateKey.y == keypair.publicKey.y))
});
