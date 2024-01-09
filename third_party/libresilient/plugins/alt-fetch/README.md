# Plugin: `alt-fetch`

- **status**: stable
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This transport plugin uses standard [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) to retrieve remote content from alternative endpoints — that is, HTTPS endpoints that are not in the original domain. This enables retrieving content even if the website on the original domain is down for whatever reason. The list of alternative endpoints is configured via LibResilient config file, `config.json`.

Compare: [`dnslink-fetch`](../dnslink-fetch/).

As per LibResilient architecture, this plugin adds `X-LibResilient-Method` and `X-LibResilient-ETag` headers to the returned response.

## Configuration

The `alt-fetch` plugin supports the following configuration options:

 - `endpoints` (required)  
   Array of strings, each string is an URL of an alternative endpoints to use.
   
 - `concurrency` (default: 3)  
   Number of alternative endpoints to attempt fetching from simultaneously.  
   If the number of configured alternative endpoints is *lower* then `concurrency`, all are used for each request. If it is *higher*, only `concurrency` of them, chosen at random, are used for any given request.
   
## Operation

When fetching an URL, `alt-fetch` removes the scheme and domain component. Then, for each alternative endpoint that is used for this particular request (up to `concurrency` of endpoints, as described above), it concatenates the endpoint with the remaining URL part. Finally, it performs a [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) request for every URL construed in such a way.

Let's say the plugin is deployed for website `https://example.com`, with `concurrency` set to `2` and these configured alternative endpoints:
 - `https://example.org/`
 - `https://example.net/alt-example/`
 - `https://eu.example.cloud/`
 - `https://us.example.cloud/`
 
A visitor, who has visited the `https://example.com` website at least once before (and so, LibResilient is loaded and working), tries to access it. For whatever reason, the `https://example.com` site is down or otherwise inaccessible, and so the `alt-fetch` plugin kicks in.

The request for `https://example.com/index.html` is being handled thus:

1. scheme and domain removed: `index.html`
2. two random alternative endpoints selected:
   - `https://example.net/alt-example/`
   - `https://example.org/`
3. `fetch()` request issued simultaneously for:
   - `https://example.net/alt-example/index.html`
   - `https://example.org/index.html`
4. the first successful response from either gets returned as the response for the whole plugin call.
 
