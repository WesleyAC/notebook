import { assertEquals } from "https://deno.land/std@0.167.0/testing/asserts.ts";
import { main } from '../../cli/lrcli.js';

Deno.test("basic usage info", async () => {
    // init
    let r
    // no args
    r = await main([])
    assertEquals(r, 1)
    // -h/--help
    r = await main(['-h'])
    assertEquals(r, 0)
    r = await main(['--help'])
    assertEquals(r, 0)
});

Deno.test("non-existent plugin handling", async () => {
    // init
    let r
    // just the plugin name
    r = await main(['no-such-plugin'])
    assertEquals(r, 2)
    // plugin name with different combinations of help flag
    r = await main(['no-such-plugin', '--help'])
    assertEquals(r, 2)
    r = await main(['no-such-plugin', '-h'])
    assertEquals(r, 2)
    r = await main(['--help', 'no-such-plugin'])
    assertEquals(r, 2)
    r = await main(['-h', 'no-such-plugin'])
    assertEquals(r, 2)
});

// 
// tests below need an imports map
// 

Deno.test("plugin loading", async () => {
    const r = await main(['simple-plugin', '--help'])
    assertEquals(r, 0)
});

Deno.test("plugin action processing", async () => {
    // init
    let r
    // non-existent action
    r = await main(['simple-plugin', 'non-such-action'])
    assertEquals(r, 4)
    r = await main(['simple-plugin', '-h', 'non-such-action'])
    assertEquals(r, 0)
    r = await main(['simple-plugin', '--help', 'non-such-action'])
    assertEquals(r, 0)
    r = await main(['simple-plugin', 'non-such-action', '-h'])
    assertEquals(r, 4)
    r = await main(['simple-plugin', 'non-such-action', '--help'])
    assertEquals(r, 4)
    // action that exists
    r = await main(['simple-plugin', 'test-action'])
    assertEquals(r, 0)
    r = await main(['simple-plugin', 'test-action', '-h'])
    assertEquals(r, 0)
    r = await main(['simple-plugin', 'test-action', '--help'])
    assertEquals(r, 0)
});
