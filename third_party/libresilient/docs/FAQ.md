# Frequently Asked Questions

Answers to questions frequently asked about LibResilient.

## General questions

### Can LibResilient handle dynamic content?

Yes, but that depends on what alternative transports are used and how. For example, if the particular website uses the [`alt-fetch` plugin](../plugins/alt-fetch/), and all the alternative endpoints configured for it are just reverse proxies that hit the original back-end server, dynamic content would be served perfectly fine.

That approach has a downside, however: if the original backend is completely down (for example, due to hardware failure), LibResilient would not be able to fetch the content. Depending on what is the purpose of LibResilient deployment on a given site, this might or might not be acceptable.

For best resilience it is recommended to either use static sites (that is, websites whose content is served as static files, often generated with the help of static site generators) or at least to build the website in a way such that it lends itself to caching or serving out as static files.

### Can LibResilient handle comments, forms, or other types of visitor interactivity?

Assuming a pretty standard LibResilient set-up, where the [`fetch` plugin](../plugins/fetch/) is configured as the first plugin in the config file, website functionality will not differ from how it would have worked without LibResilient deployed — as long as the original domain remains accessible. When it goes down, and other plugins kick-in, interactivity that requires the original back-end to be available will not work as expected.

LibResilient *only* handles `GET` requests. `POST` requests, websocket connections, and the like are left for the browser to handle. This is done by design, to avoid interfering with website functionality that cannot be handled well by LibResilient.

Of course, any third-party dynamic content (a comment section hanlded by a third party comment interface provider, a "chat with agent" provided by a third party, website analytics solution using third-party servers, etc) will work fine. LibResilient only handles requests that go to the original domain.

LibResilient focuses on making sure that content stays online. For this it needs to make certain assumptions. One of those assumtpions is that the content is not interactive in a way that requires live contact with the back-end of a LibResilient-enabled website. You can find a more in-depth explanation of the reasons behind this [here](./PHILOSOPHY.md).

### Will LibResilient interfere with analytics on my website?

Any JavaScript-based or image-tracker-based analytics solution (including third-party and self-hosted solutions) will not be affected, unless it is hosted on the same domain as the main website LibResilient is deployed for. LibResilient only handles requests that go to URLs in the original domain of the website.

If you self-host your analytics and the API endpoint is in the same domain, or if you are doing analytics based on webserver logs — in those cases how it works depends on your LibResilient configuration. If the [`fetch`](../plugins/fetch/) plugin configured as the first one to handle requests (which is the usual way of deploying LibResilient), your analytics should not be affected.

It's worth noting that if you use third-party hosted analytics (or your own self-hosted analytics running on a different domain than the website), they will continue to work for returning visitors even if your original website is down, if LibResilient is configured to serve content from alternative transports or cache in case of main website downtime.

### How do I measure how effective LibResilient is?

This is a complicated topic, and is a topic for future testing and research. There is no built-in LibResilient analytics tool currently.

However, a good start would be to have two ways of measuring traffic deployed on your website:

1. Webserver logs analytics;
2. JavaScript- or image-tracker-based analytics hosted on a different domain than the main site (or by a third party).

If LibResilient is configured correctly, in case of a downtime you will see a drop in traffic in webserver logs, but a much smaller drop in the JavaScript- or image-tracker-based analytics.

### Will LibResilient interfere with the admin panel of my website?

No, it should not. As mentioned above, LibResilient does not handle `POST` requests nor websocket connections, leaving them to be handled by the browser, and these are the most common ways admin panels and other such tools provide interactivity.

This also means that LibResilient will not help keep your admin panel functional in case of any kind of downtime. LibResilient focuses on keeping content available in case of website availability problems, not on keeping functionality unchanged.

A good strategy, therefore, is to deploy LibResilient for the public part of a website, and use some other solution (like Tor or a VPN) to harden the admin panel separately.

### Do LibResilient's alternative transports leak cookies to third parties?

No. Currently alternative transport plugins have no access to any headers of the original [Request object](https://developer.mozilla.org/en-US/docs/Web/API/Request) passed on to LibResilient when handling a `fetch` event. Therefore they cannot leak any cookies or any other headers to any third parties they might rely on for content retrieval (like the alternative endpoints when using the [`alt-fetch` plugin](../plugins/alt-fetch/)).

This is another reason why, as discussed above, LibResilient cannot help keep available any interactive functionality of a website that relies on availability of the original back-end (self-hosted comment sections, admin panel, etc).

## Service workers

### What is a service worker?

Service worker is a piece of JavaScript code that is served by the website and registered with the browser, and runs whenever the user tries to visit a website. Service workers can do many things, but most importantly they can manage caches and they can handle `fetch` events. The latter means that the service worker for a given website can be made to handle *all* requests originating from that website, which would otherwise be handled by the browser's built-in `fetch` handler.

More information on the Service Worker API [is available in MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).

### How do I update LibResilient's service worker code?

For most use-cases it's enough to deploy the new code and let visitor's browser update the service worker automatically. Browsers of returning visitors will load the new version on the first visit that happens after the cache expires, no longer than 24 hours though (as per Service Workers API). LibResilient *does not* handle requests for the `service-worker.js` script nor for any of the loaded plugins: in accordance to the API specification, a service worker cannot handle requests for its own code (this is enforced by the browser itself).

The update can also be triggered by the [`update()` method of the `ServiceWorkerRegistration`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update) interface, but that too complies with the HTTP caching headers for caching up to 24 hours.

It is not adviseable to change the name of the service worker script after deployment. This can lead to multiple service workers loaded in visitor's clients simultaneously.

When debugging code on a developer machine, you can disable cache in your browser's developer tools, which will make the service worker script load as soon as it changes. Please remember that loading and activating a service worker are two different things! See the answer on debugging service workers lower in this FAQ.

### Can LibResilient's service worker be updated when the original domain is not accessible?

No, it cannot. This is clearly specified in the API. Until the website on the original domain becomes available again, the code associated with the service worker cannot be updated or modified.

In the context of LibResilient, this means that even when LibResilient is deployed on a website, and works as expected (pulling content from alternative endpoints or through alternative transports), as long as the original domain is down it is *impossible* to update the service worker or load new plugins.

Please note: if the original domain is hijacked or otehrwise taken over, whoever controls it can deploy their own service worker code that will be loaded by visitor's clients, as long as they use the same path and file name of the service worker script. In a situation where the original domain has been taken over or can be expected to be taken over, it is strongly advised to deploy configuration changes that redirect visitors to a new domain (for example, by using the [`redirect` plugin](../plugins/redirect/)).

It is possible, with some caveats (see below), to change LibResilient's configuration (including configuration of already loaded plugins) even if the original domain is down, as `config.json` is not a JavaScript file and therefore it is *not* treated as code by browsers. You can read more on updating LibResilient's configuration during disruption [here](./UPDATING_DURING_DISRUPTION.md).

### Can LibResilient's plugins be updated, or new plugins loaded, when the original domain is not accessible?

No. As discusse above, the Service Worker API does not allow any code to be loaded otherwise than via direct request to the original website.

On the other hand, configuration changes that *do not* require loading new (previously not loaded) plugins or loading new versions of already loaded plugins, [are possible](./UPDATING_DURING_DISRUPTION.md) even if the original website is down, as long as content is available through any of alternative transport plugins.

### Can LibResilient's configuration be updated while the original domain is not accessible?

Yes, configuration changes that *do not* require loading new (previously not loaded) plugins or loading new versions of already loaded plugins, [are possible](./UPDATING_DURING_DISRUPTION.md) even if the original website is down, as long as content is available through any of alternative transport plugins.

### Can a buggy service worker be removed from clients?

Yes, as long as the website on the original domain is up. The Service Worker API only allows installing, updating, and removing service workers for a given website based on requests made to that website directly.

A browser will periodically check if a new version of the registered service worker script is available, and if so it will fetch it directly form the website, side-stepping the service worker for that request. This happens when the user navigates to the website and the time passed since the last check is longer than 24 hours.

So a buggy service worker would be deployed for a given user at least for 24 hours (or longer, if they visit the website less frequently).

You can use the [`remove-service-worker.js` script](../lib/remove-service-worker.js) to remove buggy or misconfigured LibResilient service workers from visitor's clients. To do so, replace the contents of `libresilient.js` and `service-worker.js`, as deployed on your site, with the contents of that script. Visitor's clients will periodically check if a new version of the service worker script is available, and eventually load the self-destructing service worker script. How long it takes depends on how often a given visitor visits your site, though.

However, this only relates to the *code* of the service worker (and in case of LibResilient, the code of the plugins). As discussed above, LibResilient allows for *configuration* updates even if the main website is unreachable for whatever reason. Configuration changes (even during disruption) can *disable* plugins. In other words, in certain situations it might be possible to deploy a configuration-based fix to a problem (either by disabling a problematic plugin, or changing the problematic settings).

### If the original domain is down and the service worker is buggy, how long until it gets automatically removed by the browser?

Eventually the browser will remove a service worker. It is unlcear after how long, exactly, but probably a few weeks. If the site is not available anyway (for reasons unrelated to the service worker), this does not seem like a serious downside.

If the site is available but the service worker code is buggy for whatever reason, it is possible to remove/update it (see above).

### Can the service worker be deployed only for a specific subdirectory of a website?

Yes, in two ways:

 - Implicitly, by simply placing the `libresilient.js` loader file and the `service-worker.js` service worker script in a subdirectory of the website; LibResilient will be then scoped to that directory.
 - Explicitly, by using the [`scope` option when registering the service worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#scope); see the [`libresilient.js` loader script](../libresilient.js) for example how that parameter is used.

Important note: the Service Worker API does not allow a service worker to handle any requests that originate higher in the directory structure than where the service worker script is hosted itself. In other words, a service worker script under `/some-place/service-worker.js` will *not* be allowed to handle requests for `/some-file.png`, nor `/other-place/index.html`.

By using the `scope` parameter you can further limit the scope of Libresilient's service worker. For example, with the service worker script at `/some-place/service-worker.js` and scope set to `/some-place/go-deeper/`, LibResilient will *only* handle requests for `/some-place/go-deeper/` and below, and will *not* be used to handle requests for `/some-place/other-area/`.

Please note that the `scope` option to the `register()` method is a string. This means that it's impossible to scope a service worker to *multiple* scopes, and that's defined as part of the Service Workers API, so there's not much LibResilient can do about that. There is an [open issue about implementing a way around it](https://gitlab.com/rysiekpl/libresilient/-/issues/53), though.

### What if the original domain is irrevocably lost/made inaccessible, but the service worker makes the website still work for visitors who had visited before?

On one hand, that's a good thing: LibResilient is making content available for returning visitors even though the website is down. On the other, if the domain gets taken over, the new domain owner could push any service worker updates they want. And even without anyone taking over the domain, after a few weeks the LibResilient service worker will just be removed by each visitor's browser.

A good way of dealing with that is by redirecting them to the new domain using the [`redirect` plugin](../plugins/redirect/). The LibResilient service worker will continue to work for some time (probably a few weeks) for visitors who had visited the site at least once before it went offline. This makes it easier to help them move on to a new domain.

Crucially, that plugin needs to have been loaded by the service worker when the original website was still up. This means that if you expect that at some point the website might become permanently inaccessible, make sure to add the `redirect` plugin to your LibResilient `config.json` file, but set `enabled` configuration field for that plugin to `false`. That way the plugin code gets loaded into the service worker, but plugin is not actually used to handle any requests.

This gives you the chance to update the `config.json` file when the website is down (using any of the alternative transport plugins that were configured and enabled) to enable the `redirect` plugin and configuring where the redirect should lead.

A deeper dive into updating LibResilient during disruption is available [here](./UPDATING_DURING_DISRUPTION.md).

### How do I debug issues with the LibResilient service worker?

LibResilient strives to provide ample logging (using the [`console.debug()`](https://developer.mozilla.org/en-US/docs/Web/API/console/debug) method). However, it only does so for components that are explicitly configured to be logged (using the `loggedComponents` configuration field discussed [here](./QUICKSTART.md#1-first-steps)).

Debugging service workers in general is a topic that is much broader than what a short FAQ item can handle. Good place to start is [this set of notes](https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9). There is also a good guide for [debugging service workers in Firefox](https://firefox-source-docs.mozilla.org/devtools-user/application/service_workers/index.html) and [a FAQ about debugging them in Chromium](https://www.chromium.org/blink/serviceworker/service-worker-faq/).

When debugging service workers please keep in mind the [service worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#basic_architecture):

1. First, the code is fetched and loaded by the browser.  
   *LibResilient is not yet processing requests.*
2. Upon a reload or a new visit the service worker gets activated.  
   *This is when LibResilient starts to process requests, apart from requests for the service worker code and the plugins loaded directly by it; the Service Workers API explicitly bans service workers from handling these requests.*
3. At some point, the service worker gets killed.  
   *Browser might kill a running service worker at any moment, especially after all relevant tabs are closed. All context is lost, including local and global variables. What remains is cached code.*
4. Service worker gets reactivated.  
   *As soon as the user navigates to an URL that the service worker is registered for, the service worker is reactivated to handle that request. Code of the service worker (including any loaded plugins) is run as part of that process.*

### How do I completely remove the LibResilient service worker for all visitors?

You can use the [`unregister()` method of the `ServiceWorkerRegistration`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/unregister) interface. [Here](https://love2dev.com/blog/how-to-uninstall-a-service-worker/) is a good howto on that. There is also a more immediately effective way, as explored [in this project](https://github.com/NekR/self-destroying-sw).

LibResilient will at some point provide a standard way to remove the service worker.
