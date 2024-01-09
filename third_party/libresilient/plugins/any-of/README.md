# Plugin: `any-of`

- **status**: stable
- **type**: [composing plugin](../../docs/ARCHITECTURE.md#composing-plugins)

The `any-of` composing plugin runs all plugins configured in its `uses:` configuration field simultaneously (using [`Promise.any()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any)), and returns the firs successful response it receives.

In other words, it makes it possible to *simultaneously* try several different transport plugins, and return the response as soon as the first one succeeds.

## Configuration


The `any-of` plugin supports the following configuration options:

 - `uses` (required)  
   Array of objects, each object being in turn a configuration of a plugin. All configured plugins are used simultaneously to handle any `fetch()` requests, returning the first successful response received.


## Performance and usability considerations

It is important to understand that using this plugin in conjunction with resource-intensive transport plugins might lead to a degraded performance in visitors' browsers, as all plugins configured for use by `any-of` will be processing the requests *at the same time*.

On the other hand, some transport plugins are slower than others while being more resilient to network issues. So using `any-of` and mixing slow-but-resilient transport plugins with fast-but-less-resilient ones might actually *improve* user experience: content is retrieved by the faster plugin when possible, otherwise it is retrieved by a slower plugin without waiting for the faster plugin to time out and only then starting the request using the slower one.

In the end, as is often the case, this is a balancing act.
