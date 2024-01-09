# Example Deployment

Let's do an example [Gitlab Pages](https://docs.gitlab.com/ee/user/project/pages/) deployment of a simple [Jekyll](https://jekyllrb.com/) site that uses LibResilient. Assumptions made here are:

1. website's code is hosted on Gitlab;
2. Gitlab Pages is used as main hosting for the generated website;
3. website administrator has `rsync`/SSH access to a separate system that can host the website files.

These assumptions are made only to help illustrate a specific deployment scenario used as an example here. There are other possible deployment scenarios for LibResilient-enabled websites, and they do not necessarily include static site generators like Jekyll, hosting on Gitlab Pages, nor having SSH access to alternative endpoint servers. Please consult the [FAQ](./FAQ.md) to learn more.

We will start roughly where the [Quickstart Guide](./QUICKSTART.md) left off, so consider reading it to understand the basics of how LibResilient operates and how it is configured.

## The Website

The website we will be deploying is a pretty standard Jekyll site, you can find the whole example project [here](https://gitlab.com/rysiekpl/libresilient-example-jekyll). Style and layout modifications have been made to make it similar to the [main project site](https://resilient.is/).

It has LibResilient already included in the code tree, as discussed in [First Steps section of the Quickstart Guide](QUICKSTART.md#1-first-steps). This includes the [`libresilient.js`](../libresilient.js) file, the [`service-worker.js`](../service-worker.js) file, and the `plugins` directory (containing [`fetch`](../plugins/fetch/), [`cache`](../plugins/cache/), and [`alt-fetch`](../plugins/alt-fetch/) plugins), all in the root directory of the project (and thus, also the resulting built website).

The `libresilient.js` file needs to be included by the generated HTML files, so we need to add it to the `<head>` section of the base layout (in our case, [`_layouts/base.html`](https://gitlab.com/rysiekpl/libresilient-example-jekyll/-/blob/master/_layouts/base.html)):

```html
    <script defer src="{{ "/libresilient.js" | relative_url }}"></script>
```

## The Infrastructure

For this guide, specific example infrastructure has been set-up. When deploying your own website, remember to adjust the relevant settings according to your own set-up!

Website code is hosted on Gitlab, allowing us to use Gitlab Pages for main website hosting. For our example project, this results in the website being available as:  
[`https://rysiekpl.gitlab.io/libresilient-example-jekyll/`](https://rysiekpl.gitlab.io/libresilient-example-jekyll/)

We also need asingle alternative endpoint to be used in case the main website is down. In the case of the example project that's hosted on:  
`libresilient-example-jekyll.resilient.is`

We have access to the alternative endpoint host via SSH (in our case, on port`9508`), and the directory that we will be deploying to on that host (in our case, `/srv/libresilient-example-jekyll.resilient.is/`) is also served out via HTTPS, as:  
`https://libresilient-example-jekyll.resilient.is/`

> **NOTICE:** In this example the alternative endpoint host is *only* used for the example website deployment. If you want to use a host also used for other websites or projects too, please carefully review the security implications of the set-up, especially related to providing SSH access to that host within the CI/CD pipeline context.

## LibResilient Configuration

This combination of plugins will be used such that once the service worker is installed in a visitor's browser, any request started in that browser for any resource within the website's origin will first go to that origin (using the `fetch` plugin), and if that fails it will be served from cache (thanks to the `cache` plugin), and fetched from an alternative endpoint (by the `alt-fetch` plugin).

> **NOTICE:** Please consult the [FAQ](./FAQ.md#service-workers) to learn more about service workers, and how they are used in LibResilient.

For this to work as expected, and taking into account the alternative HTTPS endpoint information above, the `config.json` configuration file (also placed in the project's root directory) [should look like this](https://gitlab.com/rysiekpl/libresilient-example-jekyll/-/blob/master/config.json):

```json
{
    "plugins": [{
        "name": "fetch"
    },{
        "name": "cache"
    },{
        "name": "alt-fetch",
        "endpoints": [
            "https://libresilient-example-jekyll.resilient.is/"
        ]
    }],
    "loggedComponents": ["service-worker", "fetch", "cache", "alt-fetch"]
}
```

## Gitlab Pages Deployment

Once we have the Jekyll project, including the necessary LibResilient files and config, ready we can move to setting up the deployment pipeline. For this we can use a standard `.gitlab-ci.yml` file for Jekyll deployments on Gitlab Pages, taken from [here](https://gitlab.com/pages/jekyll/-/blob/master/.gitlab-ci.yml).

> **NOTICE:** Diving into the specifics of general Gitlab Pages deployments is beyond the scope of this guide; you can find relevant documentation for Gitlab Pages [here](https://docs.gitlab.com/ee/user/project/pages/).

This will deploy our site to Gitlab Pages and make it available on the main URL ([`https://rysiekpl.gitlab.io/libresilient-example-jekyll/`](https://rysiekpl.gitlab.io/libresilient-example-jekyll/)), but will not yet make the data available on the alternative endpoint. With our `config.json` the site will work, and in case of a downtime it will be available offline to returning visitors (thanks to using cache), but will not yet allow fetching new content from our alternative endpoint.

## Alternative Endpoint Deployment

To complete our set-up we need to make sure that the resulting built site is also deployed correctly to the alternative endpoint. We have access to that host via SSH, so we can use [`rsync`](https://en.wikipedia.org/wiki/Rsync), which will help us ensure that everything is transferred and that old files (if any) are deleted from the alternative endpoint host.

> **NOTICE:** You can find a more in-depth guide on deploying things using `rsync` and SSH from Gitlab CI/CD pipelines [here](https://www.howtogeek.com/devops/how-to-use-rsync-and-ssh-in-a-dockerized-gitlab-ci-pipeline/). 

For this to work we need:
 - **the alternative endpoint host's SSH public key**  
   Save it in the `$SSH_HOST_KEY` [Gitlab project variable](https://docs.gitlab.com/ee/ci/variables/#add-a-cicd-variable-to-a-project);
 - **SSH keypair to use for authentication with the host**  
   Add the public key to `authorized_keys` file on the alternative endpoint host, and add the private key as the `$SSH_PRIVATE_KEY` Gitlab project variable. Make sure that [the variable is "protected"](https://docs.gitlab.com/ee/ci/variables/#protected-cicd-variables).  
   *It is strongly recommended that this is a fresh, newly generated keypair that is not used for anything else!*

Once this is all done, we need to add the following at the end of the `.gitlab-ci.yml` file:

```yaml
rsync-deploy:
  stage: deploy
  image: alpine:latest
  needs:
    - pages
  dependencies: 
    - pages
  before_script:
    - apk update && apk add openssh-client rsync
    - mkdir ~/.ssh/
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
    - echo "[libresilient-example-jekyll.resilient.is]:9508 $SSH_HOST_KEY" > ~/.ssh/known_hosts
  script:
    - rsync -atv --delete --progress -e 'ssh -p 9508' ./public/ libresilient@libresilient-example-jekyll.resilient.is:/srv/websites/libresilient-example-jekyll.resilient.is/libresilient-example-jekyll/
  rules:
    - if: $CI_COMMIT_REF_NAME == $CI_DEFAULT_BRANCH
```

Let's unpack this!

### Job definition and dependencies

```yaml
rsync-deploy:
  stage: deploy
  image: alpine:latest
```

This just creates a new job (called `rsync-deploy`) in the pipeline, in the `deploy` stage (same as the `pages` job that builds the site using Jekyll is in). It uses the `alpine:latest` docker image.

```yaml
  needs:
    - pages
  dependencies: 
    - pages
```

The `rsync-deploy` job needs to run after the `pages` job, and needs artifacts created in that job.

### Setting up SSH

```yaml
  before_script:
    - apk update && apk add openssh-client rsync
    - mkdir ~/.ssh/
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
    - echo "[libresilient-example-jekyll.resilient.is]:9508 $SSH_HOST_KEY" > ~/.ssh/known_hosts
```

To be able to deploy to our alternative endpoint host via SSH using `rsync` we need a few things. First, we need the `openssh-client` and `rsync` packages installed; then the `~/.ssh/` directory must exist, and the `ssh-agent` must be running. We also need the SSH private key (from the `$SSH_PRIVATE_KEY` project variable) added to the user's SSH config.

Finally, we need to add the alternative endpoint host's SSH key to the known hosts file. This is a tiny it more tricky, as it needs to be added there along with with the address and port it is to be valid for (in our case, `libresilient-example-jekyll.resilient.is` and `9508`, respectively).

### Deploying to alternative endpoint host

```yaml
  script:
    - rsync -atv --delete --progress -e 'ssh -p 9508' ./public/ libresilient@libresilient-example-jekyll.resilient.is:/srv/websites/libresilient-example-jekyll.resilient.is/libresilient-example-jekyll/
```

Finally, this is the actual `rsync` command. It syncs the `./public/` directory (which is automatically populated by artefacts from the `pages` build job) to the alternative endpoint host, deleting any files that are not present in the source directory.

The specific directory is the webroot (in our case, `/srv/libresilient-example-jekyll.resilient.is/`) with `libresilient-example-jekyll/` appended to it. That's because of how `alt-fetch` and Gitlab Pages both work. The `alt-fetch` plugin removes the scheme and domain component from a given URL, and appends the remainder to the alternative endpoint address being used to handle a given request. Gitlab Pages serves our example project as `https://rysiekpl.gitlab.io/libresilient-example-jekyll/`, which means that in our case, the URL remainder appended to our alternative endpoint will always contain `libresilient-example-jekyll/`.

For example, a request for the logo (`https://rysiekpl.gitlab.io/libresilient-example-jekyll/assets/img/resilient-is-logo.svg`) that gets handled by `alt-fetch` using our alternative endpoint (`https://libresilient-example-jekyll.resilient.is/`) ends up becoming:  
`https://libresilient-example-jekyll.resilient.is/libresilient-example-jekyll/assets/img/resilient-is-logo.svg`

> **NOTICE:** This can be a common pitfall, especially for sites that are served from a sub-directory of a website (like in our case with Gitlab Pages).

### Running only on default branch

```yaml
  rules:
    - if: $CI_COMMIT_REF_NAME == $CI_DEFAULT_BRANCH
```

This ensures that only commits to the default branch (as defined in project settings, usually `main` or `master`) will be acted upon by this job. In other words, it stops development branches from being deployed to the alternative endpoint host.

## Recap

What this gives us is a static website that is deployed to Gitlab Pages using standard Gitlab CI/CD set-up for Jekyll, which also has all files and assets deployed to a separate host which is then used as an alternative endpoint. If for whatever reason the website goes down, returning visitors will still experience it working, including having access to new content.

This is of course just an example deployment, and any real-life production use of LibResilient will almost certainly require a different set-up. The aim is to show step by step how to deploy a LibResilient-enabled website.
