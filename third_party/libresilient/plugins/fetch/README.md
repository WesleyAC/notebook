# Plugin: `fetch`

- **status**: stable
- **type**: [transport plugin](../../docs/ARCHITECTURE.md#transport-plugins)

This transport plugin uses standard [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) to retrieve remote content from the original domain — which is exactly what would have happened normally if LibResilient was not deployed on a website.

As per LibResilient architecture, this plugin adds `X-LibResilient-Method` and `X-LibResilient-ETag` headers to the returned response.

## Configuration

The `fetch` plugin does not have any configuration options.
