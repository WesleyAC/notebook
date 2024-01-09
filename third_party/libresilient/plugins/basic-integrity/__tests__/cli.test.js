import {
    assert,
    assertRejects,
    assertEquals
} from "https://deno.land/std@0.167.0/testing/asserts.ts";

Deno.test("plugin loads", async () => {
    const bi = await import('../cli.js')
    assert("name" in bi)
    assert(bi.name == "basic-integrity")
    assert("description" in bi)
    assert("actions" in bi)
});

Deno.test("get-integrity action defined", async () => {
    const bi = await import('../cli.js')
    assert("get-integrity" in bi.actions)
    const gi = bi.actions["get-integrity"]
    assert("run" in gi)
    assert("description" in gi)
    assert("arguments" in gi)
    const gia = gi.arguments
    assert("_" in gia)
    assert("algorithm" in gia)
    assert("output" in gia)
    assert("name" in gia._)
    assert("description" in gia._)
    assert("description" in gia.algorithm)
    assert("collect" in gia.algorithm)
    assert(gia.algorithm.collect)
    assert("string" in gia.algorithm)
    assert(gia.algorithm.string)
    assert("description" in gia.output)
    assert("collect" in gia.output)
    assert(!gia.output.collect)
    assert("string" in gia.output)
    assert(gia.output.string)
});

// this is a separate test in order to catch any changing defaults
Deno.test("get-integrity action defaults", async () => {
    const bi = await import('../cli.js')
    const gia = bi.actions["get-integrity"].arguments
    assert("default" in gia.algorithm)
    assert(gia.algorithm.default == "SHA-256")
    assert("default" in gia.output)
    assert(gia.output.default == "json")
});

Deno.test("get-integrity verifies arguments are sane", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["get-integrity"]
    assertRejects(gi.run, Error, "Expected non-empty list of files to generate digests of.")
    assertRejects(async ()=>{
        await gi.run(['no-such-file'])
    }, Error, "No such file or directory")
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], [])
    }, Error, "Expected non-empty list of algorithms to use.")
    assertRejects(async ()=>{
        await gi.run(['irrelevant'], ['SHA-384'], false)
    }, Error, "Expected either 'json' or 'text' as output type to generate.")
});

Deno.test("get-integrity handles paths in a sane way", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["get-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    assertEquals(await gi.run(['./']), '{}')
    assertEquals(await gi.run([mh]), '{"' + mh + '":["sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek="]}')
    assertEquals(await gi.run(['./', mh]), '{"' + mh + '":["sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek="]}')
}, );

Deno.test("get-integrity handles algos argument in a sane way", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["get-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    assertRejects(async ()=>{
        await gi.run([mh], ['BAD-ALG'])
    }, Error, 'Unrecognized algorithm name')
    assertEquals(await gi.run([mh], ['SHA-256']), '{"' + mh + '":["sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek="]}')
    assertEquals(await gi.run([mh], ['SHA-384']), '{"' + mh + '":["sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9"]}')
    assertEquals(await gi.run([mh], ['SHA-512']), '{"' + mh + '":["sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw=="]}')
    assertEquals(await gi.run([mh], ['SHA-256', 'SHA-384', 'SHA-512']), '{"' + mh + '":["sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=","sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9","sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw=="]}')
});

Deno.test("get-integrity handles output argument in a sane way", async () => {
    const bi = await import('../cli.js')
    const gi = bi.actions["get-integrity"]
    const mh = import.meta.resolve('./mocks/hello.txt').replace(/^file:\/\//gi, "")
    assertEquals(await gi.run([mh], ['SHA-256'], 'text'), '' + mh + ': sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=\n')
    assertEquals(await gi.run([mh], ['SHA-384'], 'text'), '' + mh + ': sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9\n')
    assertEquals(await gi.run([mh], ['SHA-512'], 'text'), '' + mh + ': sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw==\n')
    assertEquals(await gi.run([mh], ['SHA-256', 'SHA-384', 'SHA-512'], 'text'), '' + mh + ': sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek= sha384-/b2OdaZ/KfcBpOBAOF4uI5hjA+oQI5IRr5B/y7g1eLPkF8txzmRu/QgZ3YwIjeG9 sha512-MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw==\n')
});
