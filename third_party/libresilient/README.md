# LibResilient

A browser-based decentralized content delivery network, implemented as a JavaScript library to be deployed easily on any website. LibResilient uses [ServiceWorkers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and a suite of unconventional in-browser delivery mechanisms, with a strong focus on decentralized tools like [IPFS](https://ipfs.io/).

Ideally, users should not need to install any special software nor change any settings to continue being able to access an overloaded LibResilient-enabled site as soon as they are able to access it *once*.

**Project website: https://resilient.is  
Documentation: https://resilient.is/docs**

A [Quickstart Guide is available](https://resilient.is/docs/QUICKSTART/), along with [Frequently Asked Questions](https://resilient.is/docs/FAQ/). These are good places to start. You can also read a more in-depth overview of LibResilient [here](https://resilient.is/docs/ARCHITECTURE/). And [here](https://resilient.is/docs/PHILOSOPHY/) is a document describing the philosophy influencing project goals and relevant technical decisions.

## Current status

LibResilient is currently considered *beta*: the code works, and the API is mostly stable, but it has not yet been deployed in production on a reasonably high-traffic site and would benefit from real-world testing. During development it has been tested on Firefox, Chromium and Chrome on desktop, as well as Firefox for mobile on Android, but it should work in any browser implementing the Service Worker API.

If you'd like to get in touch, please email create an [issue](https://gitlab.com/rysiekpl/libresilient/-/issues/new).

## Rationale

While a number of content delivery technologies exist, these typically require enormous centralized services. This creates opportunities for gate-keeping, and [causes any disruption at these centralized providers to become a major problem for thousands of websites](https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/).

On the other hand, visitors have at their disposal many tools that allow them to work around potential localized problems with availability of certain websites — for example, Tor, proxies, VPNs, etc. These tools, however, require the visitors to install and configure them. While useful for few dedicated users, it is unreasonable to expect large part of the Internet using public to switch to them just to access certain websites.

LibResilient explores the possibility of solving this conundrum in a way that would not require website visitors to install any special software or change any settings; the only things that are needed are a modern Web browser and the ability to visit a website once, so that the JavaScript ServiceWorker kicks in.

## Development

To test the service worker locally you will need a minimal web server. Probably the simplest way is to start one directly in the project directory, either using Python:

```bash
python3 -m http.server
```

...or Docker:

```bash
docker run --publish 8000:80 --volume="$PWD:/usr/share/nginx/html" nginx
```

In both cases you will end up with a very basic webserver running locally on port `8000/tcp`. You will be able to access it under: `http://localhost:8000/`.

### Running the test suite

Tests are written in [Deno](https://docs.deno.com/runtime/manual/basics/testing/). You can run them using this command in the project directory:

```bash
deno test --allow-read --importmap=./__tests__/importmap.json
```

If you don't have Deno on your machine, you can run them by using Docker (also in the project directory):

```bash
docker run -ti --rm --volume "${PWD}:/code" denoland/deno:1.37.0 \
    /bin/bash -c 'cd /code && deno test --allow-read --importmap=./__tests__/importmap.json'
```

## Related developments

 - https://ipfs.io/ipfs/QmNhFJjGcMPqpuYfxL62VVB9528NXqDNMFXiqN5bgFYiZ1/its-time-for-the-permanent-web.html
 - https://blog.archive.org/2015/02/11/locking-the-web-open-a-call-for-a-distributed-web/

## Funding

This project is funded through the [NGI Assure Fund](https://nlnet.nl/assure), a fund established by [NLnet](https://nlnet.nl) with financial support from the European Commission's [Next Generation Internet](https://ngi.eu) program. Learn more on the [NLnet project page](https://nlnet.nl/project/libresilient#ack).
