# Efficiency vs. Resiliency

One of the most fundamental tradeoffs in decentralization is trading efficiency for resiliency. Centralized systems tend to be efficient but prone to single points of failure,
@sidenote: In the ideal case — obviously there are many cases of inefficient centralized systems, just as there are many cases of inefficient decentralized systems.
while decentralized systems are less efficient, since they cannot take advantage of economies of scale, but are more resilient, since there are fewer single points of failure.

One place that this is very visible is energy generation infrastructure — being off the grid is often less efficient, since it means using a generator when you don't have enough solar
@sidenote: Or whatever other energy generation method you use
— but it means that you won't be affected by grid-wide blackouts and brownouts. This is also visible in software — shared hosting, and running in VMs in shared environments is usually more efficient than running on baremetal, but it means that if the host machine goes down, that causes many websites or VMs to go down, whereas with bare metal hosting, only the thing being hosted on the physical machine that failed would go down.

One thing that complicates thinking about this is that things are rarely completely centralized or completely decentralized — it's common for decentralized systems to have a few less-decentralized points of failure that could be highly correlated — for instance, even if people host their websites on different servers in different datacenters, if everyone is using the same server software, a single security bug can take them all down. An important skill in system design is figuring out where the resiliency that decentralization provides is worth it, and where the efficiency of centralization is more useful.

Making a decentralized system is often a claim that we should bias more towards resiliency than efficiency, and I think we'd do well to acknowledge that tradeoff.
