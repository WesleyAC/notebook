# Plugin: `integrity-check`

- **status**: beta
- **type**: [wrapping plugin](../../docs/ARCHITECTURE.md#wrapping-plugins)

This plugin implements [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) checking using the [SubtleCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto).

It can be used in conjunction with plugins that set SRI data on requests (like [`basic-integrity`](../basic-integrity/)) to verify integrity of data retrieved via transport plugins that cannot be expected to verify integrity automatically.

## Configuration

The `integrity-check` plugin supports the following configuration options:

 - `uses` (required)  
   An Array containing exactly one object: config of the wrapped plugin that will actually handle the request.  
   For any request, once a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) is returned from that wrapped plugin, the `integrity-check` plugin will calculate the hash of the content and compare it to integrity data available in the Request.
   
 - `requireIntegrity` (default: `false`)  
   A flag signalling whether every requested URL has to have integrity data available.  
   If there is no integrity data available for an URL, and `requireIntegrity` is set to `true`, the request will not be allowed to proceed.

## Operation

The checks are performed based on the [`integrity` field of the Request object](https://developer.mozilla.org/en-US/docs/Web/API/Request/integrity), against the data returned from the configured wrapped plugin.

If `requireIntegrity` configuration flag is set to `true`, requests with no `integrity` field will not be allowed to proceed; an error is returned instead.

## Performance and usability considerations

Calculating integrity hashes is CPU-intensive and while on most devices for small files (CSS, HTML, JS, images) it will be almost unnoticable to the user, enforcing integrity checks on large content (videos, etc.) might lead to considerable spike in reasource use.
