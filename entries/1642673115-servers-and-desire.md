---
{
	"timezone": "Asia/Taipei",
	"location": "Taipei, Taiwan"
}
---
# Servers and Desire

I've [been](https://blog.wesleyac.com/posts/consider-sqlite) [writing](https://blog.wesleyac.com/posts/no-static-websites) recently about internet infrastructure, and how we can make running (and building) websites easier and more accessible. One of the posts on my queue on this topic is "here's why managing your own servers is easy and rewarding." It was interesting, then, to see a couple recent posts that touch on this.

A few weeks ago, Moxie Marlinspike [wrote](https://moxie.org/2022/01/07/web3-first-impressions.html) "People don’t want to run their own servers, and never will." In the context he's writing in, this seems like a fair statement. He went on:

> Even nerds do not want to run their own servers at this point. Even organizations building software full time do not want to run their own servers at this point. If there’s one thing I hope we’ve learned about the world, it’s that people do not want to run their own servers. The companies that emerged offering to do that for you instead were successful, and the companies that iterated on new functionality based on what is possible with those networks were even more successful.

This, clearly, is largely accurate. A few days ago, I read [this article about the covidtests.gov website](https://adhoc.team/2022/01/18/covidtests-usps-aws-managed-services/) explaining that the United States government apparently also does not want to run their own servers. The person writing that article suggests that this is a good thing: "This affords agencies the space to focus on improved user experience and service delivery, rather than consuming large resources keeping sites up and running."

It was startling to read that — while I think it's reasonable to say that building covidtests.gov on AWS was a good tactical decision, given the resources available, suggesting that the United States government is better off for outsourcing the infrastructure that runs its critical functions seems like a sad sign of the ideological success of the [bipartisan project to reduce state capacity as much as possible](https://en.wikipedia.org/wiki/Neoliberalism) (and not in the cool anarchist way).

These two examples are interesting, though, because they illustrate two different errors in thinking about this topic.

First, Moxie's claim that "people don't want to run their own servers, and never will" — this assumes that the difficulty and pain involved in running a server is a constant (or at least that the lower bound is high enough that it doesn't matter), which is clearly untrue — I've been managing servers for a decade, and even in that (relatively short) amount of time, a lot of things have gotten easier: Let's Encrypt has made getting HTTPS certs trivial, nginx added dynamic module loading, dependency management has become much easier, whether via containers or static linking, and many other things quietly improved in small ways.

These changes were made because people cared about these things being easier, and went and put in the work to make that happen. Let's Encrypt in particular is a great example to emulate — they realized what the barriers were in the way to making encryption ubiquitous on the web (cost, difficulty of configuration, etc), realized that those were solvable problems, and aggressively focused on solving them, to an extent that most people didn't realize was possible. People don't know how to configure their servers to use the HTTPS certs that certbot just got? That's fine, certbot will write the config file for you!

There's a large gradient of skill in system administration, which means that making modest changes in how easy it is for people to self-host software can have a significant impact on the number of people who will actually go do that — I regularly choose not to self-host software that looks like it will be extremely complex to set up or maintain, and just one or two dependencies can make the difference between "this seems like a pain in the ass, I'm just going to use something else" and "sure, I'll try it out."

The second error, illustrated by the covidtests.gov article, is thinking of one's skills as static. The idea that it takes "large resources" to keep a non-cloud-based site up and running is true if you don't have any experience doing so, but once you do have that experience, it largely fades into the background. The first time I set up a webserver, it took me several days and multiple tries to get everything working. Now, it usually takes me about 10 minutes, and I could easily hold a conversation while I set up a server in the background.

This is even more true of organizations than it is of individuals — organizations are good at what they have institutional experience doing, and generally bad at things they don't. But it's an error to think that means organizations should only focus on what they have institutional experience with. You can choose what institutional experience to develop, and exercise with larger and larger projects to slowly build your capacity.
@sidenote: Whether the United States government should be building the institutional experience to run their own servers is a reasonable question — the me, the tail risks of *not* doing so seem to show that it's clearly worth it, but I can see how people come to other conclusions, even if I disagree.
One of the most important parts of running an organization is actively making strategic decisions about what institutional experience and capacity you want to build.

Let's zoom back in, though, and return to individuals. Moxie writes "People don’t want to run their own servers, and never will."

This is fundamentally a statement about desire, and one that ignores the ways in which [desire is socially constructed](https://www.goodreads.com/book/show/56347680-the-right-to-sex). What people "want" does not exist in a vacuum. What people want changes over time, and we have the ability to shape and direct that change, both individually and collectively.

The question is not "what do we want," but rather "what should we want?"
