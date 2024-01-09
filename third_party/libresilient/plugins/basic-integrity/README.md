# Plugin: `basic-integrity`

- **status**: beta
- **type**: [wrapping plugin](../../docs/ARCHITECTURE.md#wrapping-plugins)

This plugin sets statically configured [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) hashes on requests performed by configured wrapped transport plugins.

This allows plugins that know how to handle it (or that use underlying browser APIs that automatically handle SRI, like [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch)) to verify integrity of retrieved content before returning it as a response.

**IMPORTANT NOTE:** this plugin, by itself, does *not* verify the integrity of fetched resources; it merely sets the integrity data on the requests. It's up to the wrapped plugin to actually use that data to verify integrity (like the [`integrity-check`](../integrity-check/) plugin) or rely on browser APIs like `fetch()` to handle this automatically.

## Configuration

The `basic-integrity` plugin supports the following configuration options:

 - `uses` (required)  
   Array containing exactly one object which is in turn a configuration of a wrapped plugin. This plugin will be used to actually handle any requests.
   
 - `integrity` (default: empty)  
   An object mapping URLs (e.g. "`https://example.com/img/test.png`") and absolute paths (e.g. "`/img/test.png`") to integrity hashes (e.g. "`sha384-kn5dhxz4RpBmx7xC7Dmq2N43PclV9U/niyh+4Km7oz5W0FaWdz3Op+3K0Qxz8y3z`"). Supported integrity hash algorithms [as per SRI specification](https://w3c.github.io/webappsec-subresource-integrity/#terms): `sha256`, `sha384`, `sha512`.  
   The integrity string can contain multiple hashes, space-separated, [as per the standard](https://w3c.github.io/webappsec-subresource-integrity/#agility).  
   When integrity data is specified twice for the same effective URL (once using full URL, once using absolute path), it is concatenated before passing the request on to the wrapped plugin.  
   Using absolute paths instead of URLs as keys is useful when hosting the same website content under multiple domain names, assuming the same paths are used across all domains.
   
 - `requireIntegrity` (default: `true`)  
   Boolean value specifying if integrity data is required for a request to handled. That is: if a request is being handled for a URL that does not have integrity data associated with it, should the request be processed, or errored out?  
   By default, `basic-integrity` plays it safe and assumes you want integrity data to be present for all resources being fetched; if you only want certain resources to have integrity verified, set this to `false`.  
   Importantly, integrity data does not need to be explicitly configured in this plugin's config — if integrity data is available in the request already, that also counts, even if no specific data is configured for this URL in this plugin's config.
