# Plugin: `cache`

- **status**: stable
- **type**: [stashing plugin](../../docs/ARCHITECTURE.md#stashing-plugins)

The `cache` plugin uses the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) to save content in visitor's browser for later use (when offline or when the website is down for whatever reason, for instance).

As a stashing plugin, it is handled in a special way by LibResilient:
 - if any plugin configured *before* `cache` returns a successful response, the `cache` plugin caches it for later use.
 - if no plugin configured before `cache` succeeds, `cache` returns the cached response; afterwards, plugins configured *after* `cache` are run in the background to try retrieving a fresher response; if any of them succeeds, `cache` plugin caches it for later use.

## Configuration

The `cache` plugin does not have any configuration options.
