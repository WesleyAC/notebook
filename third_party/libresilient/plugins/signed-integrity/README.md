# Plugin: `signed-integrity`

- **status**: alpha
- **type**: [wrapping plugin](../../docs/ARCHITECTURE.md#wrapping-plugins)

The `signed-integrity` plugin provides a way to retrieve authenticated integrity data for content fetched from untrusted sources (alternative endpoints, open proxies, etc).

It does not provide for confidentiality (as this is not something LibResilient is designed to provide in general), and it does not by itself perform integrity checking — it only retrieves verified integrity data and sets it on a request.

## Configuration

The `signed-integrity` plugin supports the following configuration options:
   
 - `publicKey` (required)  
   A public key used for signature verification on integrity files, as a JSONWebKey object compatible with [SubtleCrypto `importKey()`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey). Currently the algorithm is hard-coded as `ECDSA` with the `P-384` curve; `keyUsages` must include "`verify`".
   
 - `integrityFileSuffix` (default: "`.integrity`")  
   Suffix of integrity data files. This suffix is appended to each URL being fetched in order to retrieve authenticated integrity data for it.
   
 - `requireIntegrity` (default: `false`)  
   Is integrity data *required* for all requests?  
   If set to `true`, every request needs to have integrity data associated with it, either through it being retrieved by this plugin, or by the virtue of it having been already set on the request before it started being handled by this plugin.

 - `uses` (default: "[`fetch`](../fetch/)")  
   An Array containing exactly one object: config of the wrapped plugin that will actually handle requests.  
   That wrapped plugin will handle both the integrity file requests and the actual content requests for content being handled by the `signed-integrity` plugin.  
   By default, the [`fetch`](../fetch/) plugin is used, because it relies on the Fetch API that can be expected to actually verify integrity of fetched content. If you want to use a different transport plugin, remember to make sure that it verifies subresource integrity when provided in the request data, or wrap it in an integrity-checking wrapper plugin (like [`integrity-check`](../integrity-check/)) to make sure integrity is in fact verified when available.

## Operation

The `signed-integrity` plugin demonstrates how [Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) can be used to provide verification of authenticity of resources retrieved from not entirely trusted sources (alternative endpoints, open proxies, etc). For each content URL being fetched, the plugin first fetches integrity data from an URL built by appending `integrityFileSuffix` (by default: "`.integrity`") to the content URL, expecting it to contain a [JSON Web Token (JWT)](https://en.wikipedia.org/wiki/JSON_Web_Token).

That JWT’s signature is verified using a configured public key (assumption being that it was signed with a related private key before pushing the content out to alternatve endpoints). JWT’s payload should contain an `integrity` field, which is then used to set the SRI data on the request being handled. Only then does the request for the actual content (now with [integrity data set on it](https://developer.mozilla.org/en-US/docs/Web/API/Request/integrity)) proceed.

**IMPORTANT:** This plugin does not itself *check* integrity of the response!

This is left to the wrapped plugin to perform that check. For example, integrity checks will happen automatically with [`fetch`](../fetch/) and [`alt-fetch`](../alt-fetch/) plugins, since they rely directly on the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/fetch). You can use the [`integrity-check`](../integrity-check/) plugin to perform integrity verification for transports that do cannot be assumed to perform integrity checks on their own.
