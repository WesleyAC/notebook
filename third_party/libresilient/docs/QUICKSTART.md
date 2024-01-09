# Quickstart guide

This is a quickstart guide for deploying LibResilient on a website. This guide makes a couple of assumptions:
1. the website in question is a static site;
2. LibResilient is going to be deployed for the whole site.

These assumptions are made to simplify this quickstart guide and are *not necessary* for LibResilient to be usable with a website: LibResilient can be effectively used with dynamic websites, and it can be deployed just for certain subdirectories of a given website. Please consult the [FAQ](./FAQ.md) to learn more. You might also be interested in a deeper dive into the the [architecture of LibResilient](./ARCHITECTURE.md), and in the project's [philosophy](./PHILOSOPHY.md).

[TOC]

## The website

We are going to assume a simple website, consisting of:

 - `index.html`
 - `favicon.ico`
 - an `assets/` directory, containing:
   - `style.css`
   - `logo.png`
   - `font.woff`
 - a `blog/` directory, containing two blog posts:
   - `01-first.html`
   - `02-second.html`

In fact, this hypothetical website is very similar to (and only a bit simpler than) [Resilient.Is](https://resilient.is/), the homepage of this project. For the purpose of this tutorial, we will assume we are hosting our website on [`example.org`](https://en.wikipedia.org/wiki/Example.org) as the primary original domain.

## 1. First steps

We shall start with a completely minimal (but not really useful) deployment of LibResilient, and then gradually add functionality.

To start, we need:

 - [`libresilient.js`](../libresilient.js)\
   This script is responsible for loading the service worker script. It can be included using a `<script>` tag or copy-pasted into the HTML. We'll go with the `<script>` tag.\
   the `libresilient.js` script should be located in the same directory as the `service-worker.js` script.
   
 - [`service-worker.js`](../service-worker.js)\
   This is the heart of LibResilient. Once loaded, it will use the supplied configuration (in `config.json`) to load and configure plugins. Plugins in turn will perform actual requests and other tasks.
   
 - the [`fetch` plugin](../plugins/fetch/)\
   This LibResilient plugin uses the basic [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to retrieve content.\
   LibResilient expects plugins to be in the `plugins/` subdirectory of the directory where the `service-worker.js` script is located; each plugin is a directory with at least the file `index.js` in it (containing plugin code). In our case this means `/plugins/fetch/index.js` should exist for our hypothetical website.
   
 - `config.json`\
   That's the config file, and should also reside in the same directory as `service-worker.js`.\
   We will write it from scratch, although an example is available [here](../config.json.example).
   
Our `config.json` has to be a [valid JSON file](https://jsonlint.com/); for now it should only contain this:

```json
{
    "plugins": [{
        "name": "fetch"
    }],
    "loggedComponents": ["service-worker", "fetch"]
}
```

Let's unpack this:

 - The `plugins` key contains an array of objects.\
   Each object defines configuration for a plugin. For simplest plugins, the minimal configuration is just the name of the plugin. Based on the name `service-worker.js` establishes which file to load for a given plugin — in this case, it will be `./plugins/fetch/index.js` (relative to where `service-worker.js` script is located).
   
 - The `loggedComponents` key is an array of strings.\
   It lists the components whose logs should be visible in the deveoper console in the browser. The `service-worker.js` script logs messages as the "service-worker" component, the `fetch` plugin as (you guessed it!) "fetch".\
   We want the log messages visible for both of them, just so that we know what's going on. In a production environment we would perhaps want to limit the log messages to only some components.

With all this, our website structure now looks like this:

 - `index.html`
 - `favicon.ico`
 - `assets/`
   - `style.css`
   - `logo.png`
   - `font.woff`
 - `blog/`
   - `01-first.html`
   - `02-second.html`
 - **`config.json`**
 - **`libresilient.js`**
 - **`service-worker.js`**
 - **`plugins/`**
   - **`fetch/`**
     - **`index.js`**

We also need to add this to the `<head>` section of our `index.html`, and HTML files in the `blog/` directory:

```html
<script defer src="/libresilient.js"></script>
```

Once we deploy these changes, our HTML files will load `libresilient.js` for each visitor, which in turn will register `service-worker.js`. That code in turn will load `config.json`, and based on it, will load `/plugins/fetch/index.js`.

Each user of our website, after visiting any of the HTML pages, will now have their browser load and register the Libresilient service worker, as configured. From that point on all initiated in the context of our website will always be handled by LibResilient, and in this particular configuration — the `fetch` plugin.

This doesn't yet provide any interesting functionality, though. So how about we do that next.

## 2. Adding cache

Bare minimum would be to add offline cache to our website. This would at least allow our visitors to continue to browse content they've already loaded once even if they are offline or if our site is down for whatever reason.

This is now easy to do. We need just two things:

 - the [`cache` plugin](../plugins/cache/)\
   This LibResilient plugin makes use of the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) to store and retrieve content offline.\
   As with `fetch` plugin before, we need it in the `plugins/` subdirectory of our website.
   
 - a small modification of our `config.json` to enable the `cache` plugin.

Our website structure is now:

 - `index.html`
 - `favicon.ico`
 - `assets/`
   - `style.css`
   - `logo.png`
   - `font.woff`
 - `blog/`
   - `01-first.html`
   - `02-second.html`
 - `config.json`
 - `libresilient.js`
 - `service-worker.js`
 - `plugins/`
   - `fetch/`
     - `index.js`
   - **`cache/`**
     - **`index.js`**
 
Our `config.json` should now look like this:

```json
{
    "plugins": [{
        "name": "fetch"
    },{
        "name": "cache"
    }],
    "loggedComponents": ["service-worker", "fetch", "cache"],
    "defaultPluginTimeout": 1000
}
```

Note the addition of the `cache` plugin config, and a "cache" component in `loggedComponents`. The `cache` plugin does not require any other configuration to work, so everything remains nice and simple.

When handling a request, LibResilient tries to retrieve the content using plugins in order as they are specified in the `config.json` file. Specifying `fetch` before `cache` effectively means: try retrieving the content using the `fetch` plugin, and if that fails, use the `cache` plugin.

You will also note the additional key in the config file: `defaultPluginTimeout`. This defines how long (in ms; `1000` there means "1 second") does LibResilient wait for a response from a plugin before it decides that it is not going to work, and moves on to the next plugin. By default this is set to `10000` (so, 10s), which is almost certainly too long for a website as simple as in our example. One second seems reasonable.

What this gives us is that any content successfully retrieved by `fetch` will now be cached for offline use. If the website goes down for whatever reason (and the `fetch` plugin starts returning errors or just times out), users who had visited before will continue to have access to content they had already accessed.

> #### Note on plugin types
> 
> The `cache` plugin is a **"stashing"** plugin in LibResilient nomenclature. Such plugins have no way of accessing remote content, they are only good at saving such content locally for later, offline use. Currently there are no other stashing plugins, but anything that can save data locally and is available in Service Workers could be used to write new ones.
> 
> Other types of plugins are:
>
> - **"transport"** plugins\
>   These are the plugins that are able to access content remotely, by whatever means; `fetch` plugin is an example of a transport plugin. There are others, and we will use them later on.
>   
> - **"composing"** and **"wrapping"** plugins\
>   These are plugins that wrap other plugins to add functionality. To function, composing/wrapping plugins need other plugins to "compose"/"wrap". We will cover this later.

### Cache-first?

What if we do it the other way around, and specify the `cache` plugin before the `fetch` plugin? In that case we end up with a so-called ["cache-first"](https://apiumhub.com/tech-blog-barcelona/service-worker-caching/#Cache_first) strategy.

In case of LibResilient this means that the first time a visitor loads our example website, as their cache is empty, the `cache` plugin will fail to return content. This will lead LibResilient to try the next configured plugin, which in this case is `fetch`. Content will get fetched by it, and then stashed locally by the `cache` plugin.

Next time that same visitor loads that particular resource, it will be served from cache, so response will be instantaneous. In the background, however, LibResilient will still use the `fetch` plugin to try to retrieve newer version of that content. If it is retrieved and indeed newer, it will be stashed by the `cache` plugin.

> #### Note on stashing in LibResilient
> 
> LibResilient treats stashing plugins in a special way. If the configuration includes multiple transport plugins, and a stashing plugin (like the `cache`) between them, then:
>
> - when content is retrieved by a transport plugin (like `fetch`) specified *before* a stashing plugin, that content is then stashed by the stashing plugin for later offline use.
> - if all transport plugins specified *before* a stashing plugin fail and stashed content exists, it is provided as the response; LibResilient will then run any transport plugins specified *after* the stashing plugin, in the background to try to retrieve a fresh version of the content; if any of these succeeds, the response will be stashed by the stashing plugin.

For the time being, let's keep using the `fetch`-then-`cache` option, though.

## 3. An alternative transport

We have a working Service Worker, we have it configured to retrieve content using the standard HTTPS fetch, and we made sure that successful requests are stashed for later use (using the `cache` stashing plugin). This makes it possible for our visitors to access content they have already accessed, even if our website is unavailable for whatever reason.

But it does not let them get new content in such a case. For that we need an alternative transport plugin.

The simplest available is the `alt-fetch` transport plugin. It still uses the Fetch API, but instead of fetching content from the original website address, it uses other, configured endpoints. We will need:

 - the [`alt-fetch` plugin](../plugins/alt-fetch/)\
   This LibResilient plugin performs [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) to configured alternative endpoints in order to retrieve content.
   
 - some actual alternative endpoint where our website content can be made available\
   This obviously should be not within our domain nor hosted on our main hosting, as the whole point of this is to have an alternative, independent location where content is available in case of any problems with the primary way of accessing our website.\
   Let's assume we're using [Gitlab Pages](https://docs.gitlab.com/ee/user/project/pages/), as `example.gitlab.io`; of course, any static hosting location would do just fine!
   
 - relevant configuration changes to `config.json` to enable `alt-fetch` plugin and tell it where it should be able to find the content; and to add `alt-fetch` to `loggedComponents` so that we get some debug information in the browser console, in case we need it.

Updated website structure looks like this now:

 - `index.html`
 - `favicon.ico`
 - `assets/`
   - `style.css`
   - `logo.png`
   - `font.woff`
 - `blog/`
   - `01-first.html`
   - `02-second.html`
 - `config.json`
 - `libresilient.js`
 - `service-worker.js`
 - `plugins/`
    - `fetch/`
     - `index.js`
   - `cache/`
     - `index.js`
   - **`alt-fetch/`**
     - **`index.js`**
 
And the `config.json` file contains:

```json
{
    "plugins": [{
        "name": "fetch"
    },{
        "name": "cache"
    },{
        "name": "alt-fetch",
        "endpoints": [
            "https://example.gitlab.io/"
        ]
    }],
    "loggedComponents": ["service-worker", "fetch", "cache", "alt-fetch"],
    "defaultPluginTimeout": 1000
}
```

The `alt-fetch` plugin *requires* the `endpoints` configuration key. That key contains (as you might have guessed) endpoints to try to retrieve the content from. There can be many of them — we will use that later on — but for now we are only going to define one.

> #### Note on making content available on alternative entpoints
> 
> We need to also make sure that our content is available at `https://example.gitlab.io/`.
>
> LibResilient can't really help with that, it's up to the website administrator to make sure that content ends up where it needs to be for LibResilient to be able to access and retrieve it.

Once our website content is available on both `https://example.org/` *and* `https://example.gitlab.io/`, this configuration finally makes it possible to provide new content to visitors of our site, who have visited it at least once before, *even if the main domain is down, blocked, or unavailable for any other reason*.

From the perspective of the visitor, the site will work normally, some content will just be slower to retrieve. How much slower? That depends on the exact way our site is unavailable, and the value of `defaultPluginTimeout`:
 - if the `example.org` server is rejecting connections, or there are TLS certificate problems, or such, the `fetch` plugin will fail instantenously, and the `cache` and then `alt-fetch` plugins will kick in quickly;
 - if the `example.org` server is overloaded and takes seconds to respond, or for whatever reason the IP packets are and never responed to, LibResilient will give the `fetch` plugin `defaultPluginTimeout` (in our case, 1s) and then will move to trying `cache`, and `alt-fetch` afterwards.
 
> #### Note on content versions
> 
> LibResilient does not have a reliable way of comparing versions of content available through different transport plugins. When the original website happens to be down or unavailable, the content from alternative transports will be provided to the user even if it is *older* than what was available on the website.
> 
> From the visitors' perspecive stale content might still be better than no content. It is up to the website admins to ensure that the configured alternative transports do not serve stale content.

## 4. Multiple different alternative endpoints

Having one alternative endpoint is good. But having multiple is better! The `alt-fetch` plugin can be onfigured to use multiple endpoints simultaneously.

Let's say we have:
 - a [reverse proxy](https://en.wikipedia.org/wiki/Reverse_proxy) node (like [Fasada](https://0xacab.org/rysiek/fasada/)), using our main site as the back-end, running an additional VPS under:\
   `https://somevps1.hostingprovider.example`;
 - an endpoint on a big service like [CloudFront](https://en.wikipedia.org/wiki/Amazon_CloudFront), where we can host static content of our site, available under:\
   `https://d11ipsexample.cloudfront.net`.

We can add these endpoints to our `config.json`:

```json
{
    "plugins": [{
        "name": "fetch"
    },{
        "name": "cache"
    },{
        "name": "alt-fetch",
        "endpoints": [
            "https://example.gitlab.io/",
            "https://somevps1.hostingprovider.example/",
            "https://d11ipsexample.cloudfront.net"
        ],
        "concurrency": 2
    }],
    "loggedComponents": ["service-worker", "fetch", "cache", "alt-fetch"],
    "defaultPluginTimeout": 1000
}
```

Of course this requires us to push our static website content also to our CloudFront account when publishing, and to manage the reverse proxy node. This up to the website administrator and is out of scope for this document.

In the `alt-fetch` plugin config, note the VPS and CloudFront addresses in the `endpoints` key; you can add as many endpoints as you like. Also there, note the `concurrency` key. This key defines how many of the configured endpoints are used *simultaneously* to handle a request. In our case, the value `concurrency: 2` means that out of the three endpoints configured for `alt-fetch`, each time LibResilient uses this plugin to try and retrieve content, *two* random endpoints will be used simultaneously. The response to the first request that returns successfully is then used (and other responses are discarded).

This allows us to have some additional resilience in case any of the endpoints fail. The downside is additional use of resources on the user side. Making two simultaneous connections is almost certainly fine, making ten would probably be ill-advised.

At this point, for anyone who has visited our site once in a given browser, if our main website `example.org` is unavailable for whatever reason, each request will be made to two of the three alternative endpoints, and response stashed locally for offline use.

Even if one of the alternative endpoints starts experiencing issues, such visitors will still be able to use the site and access new content, none the wiser that the website is experiencing an outage.

On the other hand, anyone who would want to maliciously take our website down, would need to inspect our `config.json`, make a list of alternative endpoints configured there, and make sure they are also taken down — which might be difficult in case of large providers like CloudFront or GitLab.

> #### Note on config changes during disruption
> 
> This set-up also allows us to [deploy changes to `config.json`, including new endpoints](./UPDATING_DURING_DISRUPTION.md). Such changes can be deployed even if our original website is unavailable.
> 
> This lets us swap out endpoints dynamically for visitors who had visited our website at least once, as long as at least some of the currently-configured endpoints remain operational and accessible.
