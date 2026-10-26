# Benchmarking, validation, reward hacking and the PyTorch conference

This week I was at the PyTorch conference in San Jose. It was a great week of good talks and more importantly meeting up with old acquaintances I had only previously known online, as well as new friends.
When walking through the main conference area, I was kind of befuddled by the amount of ML inference providers. There were about 20 booths with companies that were advertising SOTA inference and 1.5x, 2x, 2.5x, 5x speedups over baseline performance on heterogeneous hardware.

While I understand that a lot of this is sales, I was quite confused, who actually has the SOTA perf? Let's say I was in the business of getting an impression from any of these companies, I would receive 0 signal from this. Maybe there should have been an H200 with a big screen above it in the room running every vendors solutions in order to establish who actually has SOTA perf and which numbers are real for some workload.

This got me thinking about benchmarks, evaluations and verification of research which similarly has a verification crisis.

LLMs are a fantastic technology that can be used to move the responsibility of verification onto the customer/information receiver. We have seen papers pop up at ICLR 2027 where the reviewers have found that some papers are just generating plausible numbers, and in this case they forgot to remove this from the table description:
![[Pasted image 20261025193537.png]]

When your reviewer is likely to be another LLM, or in general where there is 0 verification of your work, because its not rewarded or incentivized by the conferences to submit such work instead of novel techniques, we will see more and more of this. 
A good framework for academic success can then be a pipeline that pulls down 25 of the newest papers from ARXIV in your field, improves something with a theoretical addition, references all prior work correctly, adds simulated made-up numbers, tunes it to pass scrutiny by other LLM models, and sends it to some conference. 
At the ever diminishing chance of a human reading your paper, they still will not be able to test or benchmark any of your claims as the review process is not built for this, and even if it was, you can make a vibe together a framework in 10 minutes where the numbers are the way you want them to be and argue for your own benchmark using LLMs. You will get your A* conference paper acceptance and build your research career off this, or the signal papers provide stop having any value, you can guess which will come first.

With benchmarking, this is even worse because you move up another layer of abstraction.  You are inherently forced to understand what the benchmarking code is measuring in order to judge something. For example in GPU kernel inference, the thermal throttling under sustained workloads can change the performance results. 
You might even have to rerun the code yourself and debug certain points to be able to see what is going on. You might even need to pay to rent GPU servers to run some of the workloads. This is even more verification work than just verifying factual information which goes back into my blog on [[Feedback on LLM-written work]]. 
Any feedback you give will just go back into the LLM and cause another hill-climb into what you requested instead of being incorporated in the broader construction of your project. You might spend 1 hour finding a reward-hack in a PR to your framework to be hit with a 5-second-generated: "*You're absolutely right, my changes were not load-bearing, and failed under extensive scrutiny. I have rewritten the whole PR to do the same thing as before with the X+1 case added, we can now see a general 2x improvement*". 

At this point collaboration is dead, and the maintainers might as well work alone with their own LLMs as they have a better grasp of the goals and directions of the framework.

What is the solution?

---
## Competitions as sandboxes for adversarial evaluation of research 

A thing we can do to see what can be done to battle this spam of unclear and unverified results is to look at good examples where benchmarks have been successful in providing value.
#### Qualitative benchmarking
A good way to do qualitative benchmarking at a large-scale for software are arena-style competitions. You make a tool, or an interface where you pin solutions against each other, and you make actual users of the solutions vote for A or B by just looking at the output. [arena.ai](https://arena.ai/), previously known as LMArena do this, and in my experience it reflects the capacity of the LLMs better than benchmaxxable dataset benchmarks. For example the [Gemini models end up on top of the chat application](https://arena.ai/leaderboard/chat/text) which is not reflected in pure benchmark data from [epoch.ai](https://epoch.ai/benchmarks?view=graph&tab=eci) or the intelligence score on Artificial Analyisis.

Artificial Analysis also has for a long time had the [image arena](https://artificialanalysis.ai/image/arena), where you can evaluate unknown models on image generation. 

There are of course issues, such as that there is no real incentive for users to do this indirect model labeling. Also, you can end up with biased human opinions, for example code snippet A can look and feel better than code snippet B to the user, but B might be the only functional one. Because of this, qualitative benchmarking is often insufficient on its own for verifiable problems but works good for questions of taste such as image or video generation.
#### Quantitative benchmarking
A much harder thing is to perform meaningful quantitative benchmarking. The LLMs are fantastic hill-climbers, and will optimize any metric you throw at it ad infinitum. The previously mentioned example of the speedups is one such example. Another can be all of the reward-hacking we have seen LLMs do in [GPU inference competitions](https://x.com/myainotez/article/2037258418843771349).

I think that in this area, an unsolved, meaningful goal definition and benchmark construction that is able to capture a wide set of solutions under a single umbrella is an incredible contribution. A good example of this are: Kaggle competitions such as [ARC-AGI 3](https://www.kaggle.com/competitions/arc-prize-2026-arc-agi-3/leaderboard),  GPUMODE competitions such as the [Linear Algebra series](https://www.gpumode.com/), somewhat the [Hutter Prize competition](http://prize.hutter1.net/), and the [modded-nanogpt repo](https://github.com/KellerJordan/modded-nanogpt).

These competitions have tried to embody: abstract reasoning, hardware scheduling/compute efficiency, information compression, and learning as quite broad concepts, and set up environments where you can try out your techniques meaningfully against others. You are allowed to use any technique, and in general be creative and inventive about solutions.

Even in these competitions, we see quite a bit of reward hacking going on, which deviate from the goals of the projects. 

-  Only 1 out of 10 of the best solutions for the GPUMODE QR linalg competition were able to generalize beyond the competition shapes. Also, the GPU kernels are still optimized to the benchmarking setup for the specific isolated kernel, and might not generalize to for example full end-to-end workloads where thermal throttling and other factors kicks in.
-  The recent largest step-sizes in modded-nanogpt have come from storage use rather than learning improvements. Some groups using LLMs figured out that the H100s that run the learning have massive amounts of free VRAM for this task, and did a classic compute-storage trade-off by expanding the bi/tri-gram embedding hash-table by 2000x to use all this available VRAM on the hardware. This in itself is an interesting finding, but you can imagine that it starts to move the benchmark goalposts from being about efficient learning to being about the hardware limitations, which kills the initial purpose of the competition and other potential learning alphas since it might not transfer to actual training tasks as the memory is often needed there for other things like data and activations.
#### Competition improvements

As we see from above, none of these are silver-bullets, but they are much closer to creating a meaningful output, with or without LLMs, than it is to make up a new benchmark that is exclusively aligned to your research problem or accelerate a non-used subset of some problem as people often do today.
Below are some subjective thoughts of what I think would further benefit the competition setup.

1)  I think that the competitions that have any kind of monetary incentives should either have:
	-  Multiple stages, similar to how GPUMODE did it with the 1.1M$ AMD kernel competition where winners of the first stage 1 have to do an integration into the end-to-end use-case for a bulk of the prize, or with multiple stages as in the NVIDIA competition, elaborated upon further down.
	- Or they should reward people who held the 1st spot during the duration of the competition, even with sub-optimal solutions when looking at the end result. This is because the 1st spot is providing valuable information to the other contestants of what is possible. 
	In most such competitions at the edges of science and human knowledge, everyone is walking in a mist of uncertainty. You sometimes do not know if your target is possible at all, and you might give up if you see that you are not able to make meaningful further progress. 
	If you have a time-restricted competition, it does not make sense for the competitor to submit any solution until the last possible moment as you would provide a signal of what is possible to the other contestants.
	
	I think that the NVIDIA GPUMODE competition this spring did a fairly good trade-off on this topic. The 4 problems posed were given sequentially, building upon each other, and solutions were available to see when the next competition started. This ensured that competitors that had good ideas but a bad base were able to compete meaningfully at next stages of the competition by building upon the best solutions from phase 1, and the top competitors from the first phases were forced to dig deeper and push the limits even further to keep up. 

2)   Competitions should provide some kind of resources/infra for everyone to be able to compete. This is something that is really tricky in the age of LLMs. GPUMODE competitions for example have almost exclusively become LLM-looped submissions that have to run on rented GPUs, which costs the organizers quite a lot of money which is often paid out of pocket unless sponsors are present.
	If you rate-limit contestants, you will end up benefiting the contestants with compute and capital, as they can loop their solutions on their own, and utilize this asymmetry to be able to crush competition. However unless you have good sponsors, it's not economically feasible in the long run to not rate-limit, this choice should probably be done given the financials.
3) Continuous evaluation of the benchmarking process during the competition. GPUMODE has a [kernelguard](https://github.com/gpu-mode/kernelguard) that is being used to flag potential reward hacks. In general, in most competitions I have participated in, this is an on-going process. This is of course hard to control especially during competitions with monetary incentives, as people then have incentive to argue for the rules not being fair, but in my public experience on Discord, such events are quite rare, and most competitors are understanding in that there is a spirit to the competition.
4) Good submission UX/UI. This is honestly my biggest quip around Kaggle competitions, and similarly around the latest FlashInfer competition from MLSYS 2026. GPUMODE is lucky in the sense that you can submit your solution in a single file. But for example on Kaggle, it's not always fully intuitive for a new user on how to handle submissions. What should be pulled down from HuggingFace, what should be connected to in the UI, how do you define an RL-in-context learning loop in a Jupyter-notebook, what file types are you allowed to submit, is the workspace connected to the web, how is the dataset handled, etc.

#### Hot take/digression:

I would personally and idealistically claim that it is meaningful for an accelerated output of a competition to incentivize people to share their progress during the competition itself. I would even go as far as suggesting that you should open-source all solutions immediately upon submission, in order to let others build upon what you did. This, however strikes the human ego and classic competition incentives. If you are not rewarded in any way for sharing alpha, and when your work is simply added to the pile of LLM-parsed knowledge, your contribution will immediately be reused and overwritten, which probably does not feel meaningful. It might be that your solution is subpar but your ideas end up being the necessary information to drive the future best solutions.  This is good to think about philosophically IMO, because LLMs don't have these ego issues. If we have automated research in this environment, humans with their ego and desire for attribution are subpar researchers to an LLM research swarm that does not care about attribution or clout. There are some really stacked [startsups working on this](https://www.coreauto.com/).

---
### Ending notes

I think this will get much better as the compute infrastructure build-out expands around the world. With cheaper computation, we will be able to easier host this kind of open problems, and I personally believe that by setting up the competition and goals in a good way where the community of researchers agree that its a meaningful, we will be able to have more verifiable solutions in science.
