# Architecture

A [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) is used as a way to persist the library after the initial visit to a website that deployed it.

After the Service Worker is downloaded and activated, it handles all `fetch()` events by running plugins in the configured order. These plugins can attempt fetching the resource directly from the website (the [`fetch` plugin](../plugins/fetch/)), or from alternative endpoints (the [`alt-fetch`](../plugins/alt-fetch/) plugin), or using alternative transports (for example, the [`dnslink-ipfs`](../plugins/dnslink-ipfs/) plugin); they can also cache the retrieved content for later (the [`cache` plugin](../plugins/cache/)) or verify that content (like [``](../plugins/basic-integrity/)).

## Plugins

You can find the list of available plugins along with documentation on them [here](../plugins/). You might also want to check out the [Quickstart Guide](./QUICKSTART.md) for a walk-through explanation of how plugin configuration and composition works. 

There are three kinds of plugins:

- **Transport plugins**  
  Plugins that *retrieve* remote content by any means, for example by using regular HTTPS [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), or by going through [IPFS](https://js.ipfs.io/). They *should* also offer a way to *publish* content by website admins (if relevant credentials or encryption keys are provided, depending on the method).  
Methods these plugins implement:
  - `fetch` - fetch content from an external source (e.g., from IPFS)
  - `publish` - publish the content to the external source (e.g., to IPFS)

- **Stashing plugins**  
  Plugins that *stash* content locally (for example, in the [browser cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)). This is useful when no *transport plugin* works, or before remote content is received.  
Methods these plugins implement:
  - `fetch` - fetch the locally stored content (e.g., from cache)
  - `stash` - stash the content locally (e.g., in cache)
  - `unstash` - clear the content from the local store (e.g., clear the cache)

- **Composing plugins** and **Wrapping plugins**  
  Plugins that *compose* multiple other plugins (for example, by running them simultaneously to retrieve content from whichever succeeds first); or that *wrap* other plugins, applying some action to the results returned by the wrapped plugin (for instance, checking known resource integrity hashes on returned content).  
Methods these plugins implement depend on which plugins they compose. Additionally, plugins being composed the `uses` key, providing the configuration for them the same way configuration is provided for plugins in the `plugins` key of `LibResilientConfig` (which is configurable via `config.json`).

Every plugin needs to be implemented as a constructor function that is added to the `LibResilientPluginConstructors` [Map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) object for later instantiation.

The constructor function should return a structure as follows (fields depending on the plugin type):

```javascript
{
    name: 'plugin-name',
    description: 'Plugin description. Just a few words, ideally.',
    version: 'any relevant plugin version information',
    fetch: functionImplementingFetch,
    publish|stash|unstash: functionsImplementingRelevantFunctionality,
    uses: []
}
```

### Transport plugins

Transport plugins *must* add `X-LibResilient-Method` and `X-LibResilient-ETag` headers to the response they return, so as to facilitate informing the user about new content after content was displayed using a stashing plugin.

 - **`X-LibResilient-Method`**:  
   contains the name of the plugin used to fetch the content.

 - **`X-LibResilient-ETag`**:  
   contains the [ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) for the content; this can be an actual `ETag` header for HTTPS-based plugins, or some arbitrary string identifying a particular version of the resource (e.g., for IPFS-based plugins this can be the IPFS address, since that is based on content and different content results in a different IPFS address).

### Stashing plugins

Stashing plugins *must* stash the request along with the `X-LibResilient-Method` and `X-LibResilient-ETag` headers.

### Composing plugins

Composing plugins work by composing other plugins, for example to: run them simultaneously and retrieve content from the first one that succeeds; or to run them in a particular order. A composing plugin needs to set the `uses` key in the object returned by it's constructor. The key should contain mappings from plugin names to configuration:

```javascript
uses: [{
          name: "composed-plugin-1",
          configKey1: "whatever-data-here"
      },{
          name: "composed-plugin-2",
          configKey2: "whatever-data-here"
      },
      {...}
}]
```

If these mappings are to be configured via the global configuration file (which is most often the case), the `uses` key should instead point to `config.uses`:

```javascript
uses: config.uses
```

### Wrapping plugins

Wrapping plugins wrap other plugins, in order to performing some actions on request data sent to them, or on response data received from them.
A wrapping plugin needs to set the `uses` key in the object returned by it's constructor. The key should contain a mapping from wrapped plugin name to configuration:

```javascript
uses: [{
          name: "composed-plugin-1",
          configKey1: "whatever-data-here"
      }
}]
```

If this mapping is to be configured via the global configuration file (which is most often the case), the `uses` key should instead point to `config.uses`:

```javascript
uses: config.uses
```

## Fetching a resource via LibResilient

Whenever a resource is being fetched on a LibResilient-enabled site, the `service-worker.js` script dispatches plugins in the set order. This order is configured via the `plugins` key of the `LibResilientConfig` variable, usually set via the `config.json` config file.

A minimal default configuration is hard-coded in case no site-specific configuration is provided. This default configuration runs these plugins:

1. `fetch`, to use the upstream site directly if it is available,
1. `cache`, to display the site immediately from the cache in case regular `fetch` fails (if content is already cached from previous visit).

A more robust configuration could look like this:

```json
{
    "plugins": [{
            "name": "fetch"
        },{
            "name": "cache"
        },{
            "name": "alt-fetch",
            "endpoints": [
                "https://fallback-endpoint.example.com"
            ]
        }]
}
```

For each resource, such a config would:

1. Perform a regular `fetch()` to the main site domain first; if that succeeds, content is added to cache and displayed to the user.
1. If the `fetch()` failed, the cache would be checked.
   1. If the resource was cached, it would be displayed; at the same time, a background request for that resource would be made to `fallback-endpoint.example.com` instead of the (failing) main domain; if that succeeded, the new version of the resource would be cached.
   1. If the resource was not cached, a request for that resource would be made to `fallback-endpoint.example.com`; if that succeded, the resource would be displayed and cached.

## Stashed versions invalidation

Invalidation heuristic is rather naïve, and boils down to checking if either of `X-LibResilient-Method` or `X-LibResilient-ETag` differs between the response from a transport plugin and whatever has already been stashed by a stashing plugin. If either differs, the transport plugin response is considered "*fresher*".

This is far from ideal and will need improvements in the long-term. The difficulty is that different transport plugins can provide different ways of determining the "*freshness*" of fetched content -- HTTPS-based requests offer `ETag`, `Date`, `Last-Modified`, and other headers that can help with that; whereas IPFS can't really offer much apart from the address which itself is a hash of the content, so at least we know the content is *different* (but is it *fresher* though?).

### Content versioning

Content versioning has not been implemented in any plugin yet, but might be necessary at some point. Some delivery mechanisms (IPFS, BitTorrent) might be slow to pick up newly published content, and while information about this might be available, it might be faster to fetch and display older content that has already propagated across multiple peers or network nodes, with a message informing the reader that new content is available and that they might want to retry fetching it.

An important consideration related to content versioning is that it needs to be consistent across a full set of published pieces of content.

For example, consider a simple site that consists of an `index.html`, `style.css`, and `script.js`. Non-trivial changes in `index.html` will render older versions of `style.css` and `script.js` broken. A particular version of the whole published site needs to be fetched, otherwise things will not work as expected.

This will probably need to be fleshed out later on, but the initial API needs to be designed in a way where content versioning can be introduced without breaking backwards compatibility with plugins.

## Status information

Status information should be available to users, informing them that the content is being retrieved using non-standard means that might take longer.

LibResilient information is kept per-request in the Service Worker, meaning it is transient and does not survive Service Worker restarts, which might happen multiple times over the lifetime of an open tab. The Service Worker can communicate with the browser window using the [`Client.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Client/postMessage) to post messages to the browser window context using the relevant [`Client ID`](https://developer.mozilla.org/en-US/docs/Web/API/Client/id), retrieved from the fetch event object. This is also how information on Service Worker commit SHAs and available plugins are made available to the browser window context.

The data provided (per each requested URL handled by the Service Worker) is:
 - `clientId` &ndash; the [Client ID](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/clientId) for the request (that is, the Client ID of this browser window)
 - `url` &ndash; the URL of the request
 - `Service Worker` &ndash; the commit SHA of the Service Worker that handled the request
 - `fetchError` &ndash; `null` if the request completed successfully via regular HTTPS; otherwise the error message
 - `method` &ndash; the method by which the request was completed: "`fetch`" is regular HTTPS `fetch()`, `gun-ipfs` means Gun and IPFS were used, etc.
 - `state` &ndash; the state of the request (`running`, `error`, `success`)

The code in the browser window context is responsible for keeping a more permanent record of the URLs requested, the methods used, and the status of each, if needed.

When the browser window context wants to message the service worker, it uses the [`Worker.postMessage()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage) call, with `clientId` field set to the relevant client ID if a response is expected. Service Worker then again responds using `Client.postMessage()` using the `clientId` field as source of the `Client ID`.

## MIME type guessing

Some plugins (for example, those based on IPFS, like [`dnslink-ipfs`](../plugins/dnslink-ipfs/)), receive content without a `Content-Type` header, because the transport simply does not support it. That's problematic, as the `Content-Type` header is used by the browser to decide what can be done with a file -- display it if it's an image, run it if it's a JavaScript file, and so on.

For the purpose of guessing the MIME type of a given piece of content (in order to populate the `Content-Type` header) the LibResilient's Service Worker implements the `guessMimeType()` function, available to any plugin.

By default the function attempts to guess the MIME type of content only by considering the file extension of the path used to retrieve it. There is a hard-coded list of extension-to-MIME-type mappings that should cover most file types relevant on the Web.

This might not be enough, however. So, the Service Worker can *optionally* load an external library that can establish a MIME type based on the actual content. Currently that is [`file-type`](https://github.com/sindresorhus/file-type/), distributed along with LibResilient in the `lib/` directory).

To enable content-based MIME type guessing, set the `useMimeSniffingLibrary` to `true` in `config.json`.

By default, content-based MIME guessing is *disabled*, because it is somewhat slower (content needs to be read, inspected, and compared to a lot of signatures), and relies on an external library that needs to be distributed along with LibResilient, while not being needed for most plugins, nor necessary for those that do actually need to guess content MIME types.

When enabled, content-based MIME guessing is attempted first for any given piece of content that requires it. If it fails, extension-based MIME guessing is then used.
