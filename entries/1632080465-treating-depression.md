---
{
	"timezone": "EST",
	"location": "Brooklyn, New York"
}
---
# Treating Depression

I have a crackpot theory for how to treat depression. It's probably not very useful, and it's most likely wrong (as I'm not trained in neuroscience, psychiatry, medicine, or really anything at all), but I think it's interesting and worthwhile to consider nonetheless.

First, we have to look at what depression is. There's often a tension here between the idea that depression is something that has societal and cultural roots, versus looking at depression as something that is neurological at its core (a "chemical imbalance," or similar). Both of these are clearly correct in some sense — after all, psychotherapy and antidepressants are generally considered to be two of the most effective current treatments for depression. It's important not to understate the role that either culture or chemistry plays. In fact, I think that a useful way to view depression is as a label for a type of interaction between the chemical control system
@sidenote: I mean "control system" here in the [control theory](https://en.wikipedia.org/wiki/Control_theory) sense of the phrase, as a feedback system that can be mathematically modeled and understood, given good enough tools for measurement.
of your brain and the culture and society that you're embedded within. Depression is a name for a particular way that the neurochemical feedback loops in your brain are ill-suited to the environment that you're in. Therapy can help give you tools to change the environment, drugs can change the feedback loop
@sidenote: Therapy (particularly [CBT](https://en.wikipedia.org/wiki/Cognitive_behavioral_therapy)) can also change the feedback loop, but the type of changes are limited and somewhat difficult to control.
, but neither is fundamentally more important than the other — the thing that we're trying to fix is the interface between the environment and the brain, and pushing on either side will change that interface.

Given that understanding, what should we expect a cure for depression to look like? We have two things we can push on: our environment, or our minds. While I think that there are many changes to society that would significantly decrease the prevalence of depression
@sidenote: For instance, implementing UBI or a negative income tax, increasing the walkability and amount of greenery in cities, creating more [third spaces](https://en.wikipedia.org/wiki/Third_place), etc.
, that's both speculative and difficult to change
@sidenote: That is, difficult to change on a societal scale — many of these are things that individuals can do, and it's somewhat common for, for instance, changing jobs or moving to "cure" (or catalyze) depression.
, so I'm going to focus in this post on changing the control loops in our brains.

What does changing the control loops of our brain look like? For this, I think it's illustrative to look at a disorder that I'm intimately familiar with: diabetes. One thing that people are often [surprised by](https://siderea.dreamwidth.org/1511455.html) about diabetes is how many day-to-day decisions people with type 1 diabetes have to make about self-administering medicine. People need to measure their blood sugar and what they eat, and administer insulin based on both of those things. Historically, though, this was difficult: the first techniques for measuring blood sugar were urine test strips, limiting people to a couple tests a day. The only way people managed was by eating the same thing every day, and taking the same amount of insulin, and using (fairly inaccurate) urine test strips a couple times a day to try to adjust things. Eventually, finger-prick blood sugar testing became available, and people would test in the range of three to ten times a day, and get much more accurate results. The formulations of insulin available also changed, and people started using a combination of long-acting and fast-acting insulin to be able to handle spikes in blood sugar. Eventually, insulin pumps came around, reducing the amount of effort taking insulin takes, which allowed people much more control in their doses — instead of using a single shot of long-acting insulin every day, people could control the amount of insulin they received at every moment — for instance, changing the amount of insulin at night, when the body is resting and using less energy, as well as being able to more finely control how insulin was delivered for food. Nowadays, the state of the art is a continuous glucose monitor (CGM), which measures blood sugar every five minutes, and an insulin pump that finely control the precise amounts and timing of insulin being delivered. This has resulted in astronomically better outcomes for people with diabetes, and closed-loop control is around the corner that will improve things even further.

Diabetes is unique in the amount of measurement and control we have over the feedback loops at play, but it doesn't have to be. What are the obstacles to having similar control loops for our brains?

There are a few things:

* We need a way to measure the levels of various neurotransmitters in the brain.
* We need a way to change the amounts of neurotransmitters that we want to control.
* We need a good understanding of how our body's control loops operate, and what we want to change about them.

What should we expect to want to control in order to treat depression? The answer seems pretty clear to me: the most effective current pharmaceutical treatments for depression are SSRIs, which change the way the brain regulates serotonin. Other neurotransmitters are probably also relevant (dopamine and norepinephrine seem like other promising candidates to look at), but there it's widely accepted that many cases of depression can be treated using SSRIs, which are understood to primarily change the regulation of serotonin.

There are a few drugs that are available that are useful in influencing the brain's serotonin control loop
@sidenote: I should mention that these drugs can interact with each other in ways that can kill you, so don't go playing around with them without researching for yourself what the interactions are and being very certain that what you're doing won't cause problems.
:

* 5-HTP is a chemical precursor to serotonin, which the body turns into serotonin when there isn't enough available.
* SSRIs inhibit the reuptake of serotonin, which causes it to hang around in the brain longer, and also causes the particular receptors that a given SSRI targets to behave differently.
@sidenote: I don't have a good understanding of exactly how this works, but the gist of it is that there are [many different types](https://en.wikipedia.org/wiki/Serotonin#Receptors) of serotonin receptors, and different SSRIs inhibit reuptake of serotonin into different receptors — that's what's "selective" about them.
* MDMA causes the brain to release serotonin very quickly.
@sidenote: It's generally considered that SSRIs prevent most of the effects of MDMA ([this](https://sci-hub.st/10.1177/026988110001400313) is a good RCT that shows this), but I suspect that the reality of this is more complicated — low does of SSRIs likely inhibit the effects of MDMA less, and there may be subtle effects of the combination of MDMA and SSRIs that were not measured in that study, but are still clinically relevant in the treatment of depression). There is definitely anecdotal evidence that people on low doses of SSRIs can get mild empathogenic and euphoric effects from MDMA.
* Many other drugs that I'm less familiar with also affect the serotonin system.

That gives us some pretty good tools for influencing the brain's serotonin control loop
@sidenote: With the only problem that one of them is a Schedule I controlled substance that has high abuse potential and is widely considered to be a party drug, which makes using it in this way a pretty tough sell, I think.
, but we still need a way to monitor brain serotonin levels in order to have closed loop control. Luckily, there are [devices used in medical research](https://neuronewsinternational.com/serotonin-levels-can-be-detected-and-measured-through-an-innovative-device-called-wincs/) that do this. I don't know the details of cost and accuracy, but the trajectory of these devices seem like they could be similar to CGMs — inaccurate and expensive, primarily used in medical research at first, then eventually "cheap" and accurate enough to be widely used.

That leaves the last obstacle as understanding the serotonin control loop, and its relation to clinical outcomes. My suspicion is that developing a model for how serotonin levels are affected by different drugs would be the "easy" part of this (it's not easy, the brain is extremely complicated), and determining the effect of serotonin levels (and the effects of inhibiting serotonin reuptake into different receptors) on clinical outcomes would be the hard part. But then, perhaps I'm too optimistic — we don't yet have a proper model of the insulin/carbohydrate/blood glucose response, despite having had the tools to measure it for decades.
@sidenote: We have a general understanding that insulin reduces blood glucose and carbohydrates increase it, but there are lots of specifics of how this operates that are very clear to people with diabetes who have CGMs and insulin pumps and years or decades of experience managing their blood sugar, but are completely undocumented in medical literature, and doctors will often tell you that you don't know what you're talking about if you bring them up, since they only learned the simple textbook model.

In general, dosing of medicine seems ridiculous to me, given my experience with diabetes and designing control systems, but I think it'll take us a long while to figure out which disorders will benefit most from having more precise closed-loop control. It's possible the cost-benefit is only worth it for diabetes, but that would be surprising to me — there's a history of medicines becoming significantly more useful when we discover better ways of dosing them (various extended-release formulations, for instance), and infusion pumps are the best current technology we have for fine-tuning dosages.

There are a lot of obstacles to this sort of thing being more common: the FDA being wary of closed-loop devices, the effort involved in maintaining an infusion pump and CGM sensor, the social stigma of being seen as reliant on a medical device. But I don't think those obstacles are insurmountable, and at the very least, these sorts of control-theoretic experiments seem critical to developing a better understanding of our bodies, and how medicine interacts with them.
