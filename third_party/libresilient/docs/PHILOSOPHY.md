# Project's Philosophy

LibResilient's philosophy can be boiled down to a single sentence:  
**Information must remain easily accessible.**

The choice of words here is very deliberate.

## Information vs. communication

LibResilient purposely focuses on ***making information accessible***, as opposed to facilitating *live two-way communication flow*.

There is plenty of misinformation to go around, and plenty of communication that is meant solely to muddy the waters and create a toxic information environment. Those who organize such disingenuous communication and participate in it often rely on it being two-way, fast-paced, and emotional, intentionally leaving as little space for calm rational thought as possible.

There is a meaningful difference between a debate of ideas, and a shouting match or a lynch mob. LibResilient is not interested in supporting the latter. While discriminatory content does also come in the form of articles on websites, it becomes truly toxic when live mass communication can be employed in an aggressive manner.

This is where LibResilient draws a line by making specific architectural decisions. We cannot stop bigots from using LibResilient on their websites, but we can make LibResilient less useful for specific strategies often employed by them.

## Centralization as a dis-service

LibResilient grew out of the experience of managing websites that experience huge traffic spikes, and the frustration regarding options available to website admins in who find their websites became unavailable, entirely or only to certain groups of visitors, be it via direct malicious actions (like DDoS), or organic traffic overwhelming the webserver.

These options tend to be limited to a few massive gatekeepers like CloudFlare, and a few smaller ethical providers like [Deflect](https://deflect.ca/).

In practice, website owners are incentivised to use the massive gatekeepers' services, which [gradually centralizes the Internet](https://iscloudflaresafeyet.com/). Such centralization then becomes a problem itself, when these gatekeepers [find themselves under pressure to drop protection for specific sites](https://www.techrepublic.com/article/as-google-and-aws-kill-domain-fronting-users-must-find-a-new-way-to-fight-censorship/), leaving website owners with nowhere to go.

LibResilient is explicitly focusing on decentralized tools like [IPFS](https://ipfs.io); in some cases and for certain very specific threats using the biggest gatekeepers might still make sense, and LibResilient might facilitate that. But whenever that is the case, care will be taken to do it in a way that is not tied to particular service or company.
