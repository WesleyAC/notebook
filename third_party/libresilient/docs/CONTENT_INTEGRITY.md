# Security and Content Integrity

Security of content pulled through LibResilient depends on the transport plugins used.

For example, using the regular `fetch` plugin provides pretty decent security, as we can rely on the HTTPS connection to the site's main domain, which we implicitly trust anyway. When using a transport plugin which utilizes IPFS directly (that is, without gateways), we can be reasonably sure that files we requested using IPFS CIDs are exactly the files we get, thanks because IPFS is content-addressed. 

On the other hand, when using `alt-fetch` and fetching content from multiple endpoints which we do not fully control (for example, using random IPFS gateways or file storage services), we must consider that a potentially malicious operator of such an endpoint is able to modify content being fetched. After all, HTTPS ensures we're talking to that endpoint, but not what is actually being hosted on it.

## Subresource Integrity

[Subresource Integrity (SRI)](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) can help fix it to some extent.

It was introduced to provide assurances when including content hosted on third-party endpoints, like major CDNs. In the HTML code, not just an URL for a `<script>` or `<link>` element would be specified, but also an `integrity` value. The browser then fetches the content and immediately checks if the hash matches the `integrity` value set on the relevant element.

## SRI and LibResilient

SRI can of course be used with LibResilient directly, by specifying the `integrity` value on `<script>` and `<link>` elements in HTML. These values will be provided by the Service Worker to each plugin that is handling the request. If integrity verification fails, the plugin returns an error, and the next plugin takes over, as per regular LibResilient request handling flow.

However, whether or not integrity is *actually* verified depends on the plugins used.

For example, integrity (when set for a given request) *will* be verified when using `fetch` and `alt-fetch` plugins, simply because under the hood these plugins use the regular [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), as implemented by the browser. The Fetch API [`fetch()` method](https://developer.mozilla.org/en-US/docs/Web/API/fetch) accepts an `integrity` init param, and is expected to use it to verify integrity.

A plugin that does not rely on the Fetch API will not benefit from this automatic integrity checking by the browser. In such cases, the `integrity-check` plugin can be used to wrap a such a transport plugin. The `integrity-check` plugin wraps a transport plugin, and when that transport plugin returns a successful `Response`, checks the integrity of the body of that response based on [integrity data set in the `Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request/integrity).

If the integrity check fails, an error is returned.

## General Content Integrity

SRI is sadly quite limited. It only applies to `<script>` and `<link>` elements. For LibResilient we need something more general.

Thankfully nothing is stopping us from using the `integrity-check` plugin for any kind of request. As long as `integrity` init param is set on the `Request`, the `integrity-check` plugin *will* check the integrity of the returned data. And we can set `integrity` init param on the `Request` at any time if we choose so.

This is exactly what the `basic-integrity` plugin does. It allows website admins to configure integrity data for any specific URL. When handling a `fetch` for that URL, the `basic-integrity` plugin will set the `integrity` parameter on the `Request` to the configured value, and used a wrapped plugin to fetch the content.

This means that now we can have a very static (change of content requires modification of LibResilient configuration) but workable way of ensuring content integrity for any content, fetched using any plugin.

As both `basic-integrity` and `integrity-check` plugins support `requireIntegrity` config parameter, it is even possible to explicitly block *any* content that does *not* have integrity data associated with it.

### Scenario 1. `alt-fetch`

If using `alt-fetch` as the transport pluging, we can rely on the Fetch API implementation of SRI. This works for any kind of content (not just resources included using `<script>` and `<link>` tags!), as long as integrity data is provided with the `Request`. By wrapping `alt-fetch` in `basic-integrity` and specifying integrity data for all resources we can ensure that even if one of the alternative endpoints turns malicious, we will *not* serve compromised (or just corrupted) content to the user.

The minimal config could in such a case look something like this:

```json
{
    "plugins": [{
        "name": "basic-integrity",
        "integrity": {
            "/some/image.png":        "sha256-<integrity-data>",
            "/index.html":            "sha384-<integrity-data>",
            "/css/style.css":         "sha512-<integrity-data>",
            "/documents/example.pdf": "sha384-<integrity-data> sha256-<integrity-data>"
        },
        "uses": [{
            "name": "alt-fetch",
            "endpoints": [
                "https://<CIDv1>.ipns.dweb.link/",
                "https://ipfs.kxv.io/ipns/<CIDv0-or-CIDv1>/",
                "https://jorropo.net/ipns/<CIDv0-or-CIDv1>/",
                "https://gateway.pinata.cloud/ipns/<CIDv0-or-CIDv1>/",
                "https://<CIDv1>.ipns.bluelight.link/"

            ]
        }]
    }]
}
```

### Scenario 2. `non-fetch`, a hypothetical plugin not based on Fetch API

When *not* using a Fetch API based plugin as the transport pluging, we must explicity verify integrity. By wrapping such a transport plugin (let's call it `non-fetch` for example) in `integrity-check`, and then wrapping that in `basic-integrity`, we can ensure that any integrity data configured will be used to check content integrity even though `not-fetch` does not support integrity checks by itself.

Example minimal config:

```json
{
    "plugins": [{
        "name": "basic-integrity",
        "integrity": {
            "/some/image.png":        "sha256-<integrity-data>",
            "/index.html":            "sha384-<integrity-data>",
            "/css/style.css":         "sha512-<integrity-data>",
            "/documents/example.pdf": "sha384-<integrity-data> sha256-<integrity-data>"
        },
        "uses": [{
            "name": "integrity-check",
            "uses": [{
                "name": "not-fetch"
            }]
        }]
    }]
}
```

## Integrity data for dynamic resources

Ideally, there would be a way to fetch integrity data dynamically, such that it would not have to be configured for each resource beforehand. This would enable SRI to be used to also secure dynamic websites that use LibResilient. This would require a way of fetching the integrity data for each URL, and then authenticating it -- after all, the *reason* why we need SRI is *because* we don't trust the transports.

The `signed-integrity` proof-of-concept plugin implements exactly that. For each URL, it implicitly tries to first fetch that URL combined with `.integrity` (so, for `/favicon.ico` it would first try to fetch `/favicon.ico.integrity`). It expects it to contain a [JSON Web Token](https://en.wikipedia.org/wiki/JSON_Web_Token), signed by an ECDSA private key (controlled by the website admin and not accessible to anyone else). The related public key is added to `signed-integrity` configuration.

The JWT is verified using that configured public key; its payload should contain an `integrity` field with the integrity data for the target URL (so, for `favicon.ico` in our example above). That integrity data is then added to the request for the target URL that is then handled by a wrapped transport plugin.

This way, the `signed-integrity` plugin would replace the `integrity` plugin in scenarios above, making it possible to provide SRI for dynamic resources. It is up to the wrapped plugin to actually verify the integrity based on data in the request.

## Downsides

The downside of the **`integrity-check`** plugin is that performance can be expected to be worse than if integrity checking was done directly by the browser (as part of a Fetch API `fetch()` call).

The plugin uses the [SubtleCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) to minimize that penalty, but it is not clear how performant it is, especially in the context of large files (for example, video content).

The downside of the **`basic-integrity`** plugin is that it requires the integrity data to be configured directly in the LibResilient config. Currently, this means that a change in content requires a modification of the config file, and until the new config file gets deployed in Service Workers on users' browsers, the new or modified content might be inaccessible for them.

This makes it very static, and not very useful for most (rather dynamic) websites.

The downside of the **`signed-integrity`** plugin, apart from it being a proof-of-concept currently, is the added complexity and effectively doubling of the number of requests (for each URL, an additional integrity URL is also fetched).

As with any security measure, the plugin offers additional protection (in this case, from Person-in-the-Middle attacks by the transport providers) at the cost of reliability -- for example, bad configuration (incorrect public key) might mean content that is possible to fetch will be inaccessible.

## Future development

There are a few potential avenues of making content integrity more useful in LibResilient:

1. [Making config updates possible during disruption](%3) (that is, even if the site's main domain is inaccessible), and generally making the config more dynamic and easy to push changes to, would make `basic-integrity` plugin considerably more useful.
1. For IPFS-based transport plugins, [integrity data could be extracted directly from the CID](https://gitlab.com/rysiekpl/libresilient/-/issues/1#note_727844150). This would make it possible to verify integrity of content fetched using them (if we don't trust it for whatever reason) without providing integrity data separately.
