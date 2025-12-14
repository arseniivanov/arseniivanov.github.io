# On Attention and its Hardware

In this blog, I will try to explain the arguments for various attention mechanisms and go into the future of similarity measures based on how our computational hardware is evolving.
#### Attention
Put simply, attention is a similarity measure between information in some frame of reference such as an embedding space. In basic Linear Algebra, this is for example expressed as a dot product between two vectors, where one is projected on the other, and a magnitude of similarity can be retrieved from this.
![[Pasted image 20251214114957.png]]

The purple projection arrow is the projection of the red vector onto the blue vector. If the red vector would be orthogonal to the blue vector, this similarity would be 0. If they were the same, it would be large and positive(1 in the special case of unit vectors and cosine similarity).

In Transformers, this idea is scaled with data and large matrices, allowing multiple pieces of information to share the same similarity and for massive matrices to capture how different words and tokens appear together. Anthropic also found that sometimes, concepts share the same neurons for different similarities, this is called superposition. Anthropic has a nice blog on [this topic](https://transformer-circuits.pub/2022/toy_model/index.html).

---
#### Linear Attention

As I mentioned briefly in my previous blog [[What does attention represent and why do we need softmax?]], [Linear Attention](https://github.com/fla-org/flash-linear-attention) is a research paradigm where attention similarity framework [is generalized](https://arxiv.org/pdf/2505.19488v1), and then used to build other similarity measures that contain qualities that can either solve certain problems standard attention cannot, or to compress the attention over long contexts by controlling the information and the updates/forgetting that go into the matrices. 

Linear attention has successfully been utilized in certain LLMs, such as the [QWEN-Next](https://qwen.ai/blog?id=4074cca80393150c248e508aa62983f9cb7d27cd&from=research.latest-advancements-list) to reduce cost of training. In the Flash-Linear-Attention community Discord, it seems like often-most it is more beneficial to mix both linear and standard attention layers. Experiments seem to place the number of linear to standard attention layers around a [3:1 to 6:1](https://huggingface.co/papers/2507.06457) ratio. This can be theoretically motivated by the fact that some of the benchmark tasks need precise recall, and averaged/estimated keys need to be mapped into a more detailed space that benefit from hard choices such at the ones enforced by softmax.

---
#### Rejection of Linear Attention
At the same time as ByteDance and Alibaba seem to advertise the Linear Attention paradigm, some other Chinese labs, such as Minimax, who by the way current have one of the best [text-to-speech models](https://artificialanalysis.ai/text-to-speech/models) share their [reasoning](https://www.minimax.io/news/why-did-m2-end-up-as-a-full-attention-model) about why they choose to not do linear attention, citing unstable training, over-convergence to benchmarks and computational inefficiency as the main challenges. 

Also, the [subjectively best github blog of the year](https://github.com/zartbot/blog/issues/3) from a senior Huawei researcher goes into the topic of linear attention not having a place in the current LLM landscape. This blog has compelling arguments about why:

> Of course, some people might say, "What's the problem? We can just use Linear Attention." Indeed, recent changes in Attention have brought some controversy. On one hand, there are Qwen-Next's GDN and Kimi Linear's KDA. On the other hand, Minimax M2 has abandoned Linear Attention. Another path is seen in Google/DeepMind's [MoR](https://arxiv.org/pdf/2507.10524v1) and the rumored [Universal Transformer](https://arxiv.org/pdf/1807.03819) in GPT-5, which seem to be further strengthening the computational power of the Attention block.

And DeepSeek-V3.2's approach, which as-today is the 6th most powerful LLM, with [DSA](https://arxiv.org/abs/2512.02556) building on the previous [NSA](https://arxiv.org/pdf/2502.11089) are heading down the path of Sparse Attention instead of linear attention. The goal is to keep using the existing hardware but achieve the same goal as linear attention, different importance to different parts of the context. 

The author finishes:
> My personal view aligns with DeepSeek's: Linear Attention does not solve the memory access bottleneck well. Computation itself is easy to scale, but memory access is very difficult. Therefore, choosing Sparse Attention is the right path.

This holds true for almost all workloads on GPU's. If we proxy intelligence by the amount of computation we can do(which might or might not be true), and by the power used by the computation, Linear attention is a bottleneck, 20% of your GPU is sitting idle when it could serve predictions or train models, as well as using more memory access which means less compute/watt. Even if we were to engineer a FlashLinearAttention 3 variant that uses 100% of the GPU, the inherent more frequent memory accesses will still make the paradigm more expensive from a computation/watt perspective. This brings us to the next topic.

---
#### The Role of Hardware for Attention
A [paper](https://gwern.net/doc/cs/hardware/2014-horowitz-2.pdf) on energy efficiency has this picture below showing the energy expenditure of an integer addition. The operation analyzed is a simple addition, the cache access is the energy needed to fetch the data into register memory, the register file access is energy needed to use the registers on the ALU, and the control is the energy needed to schedule things in the correct order.

You can imagine that Linear Attention, which loops/iterates on its context, will do less computation, and more memory reads/writes, which is inherently more expensive on both CPUs and GPUs. When we look at computations/watt, which will be inherent OPEX for datacenters, the goal will be to minimize this, meaning that standard attention will likely win over it's variants in the short term.
![[Pasted image 20251214143447.png]]
### The Role of Softmax in Attention
Previously, when I made the blog on [[What does attention represent and why do we need softmax?]], I was perplexed by the amount of scheduling needed to be done to estimate Softmax on the B200. However, when writing that blog, I did not have the full picture for the reason. Now, it's quite apparent, NVIDIA made a mistake when designing the B200, look:
![[Pasted image 20251214113232.png]]
As you can see the relative amount of FP8 dense compute grows 250% between Hopper and Blackwell, meanwhile, the amount of SFU exponent (used in Attention) grows 11%. This creates a massive bottleneck, since the majority of the workloads are just running LLMs on the cards, which for FP8 and FP4 use Scaled Dot Product followed by Softmax. So the throughput is increased more than twofold for the GEMM, but just above 10% for the Softmax which is inherently following the GEMM in the relevant workloads. 

Luckily, NVIDIA realized their mistake, and the Blackwell Ultra variant of the GPU has a two-fold increase in SFU Exponential calculation capacity, better matching up to the increase in GEMM compute. 

This was the reason for the convoluted Softmax dynamics on the B200 cards. And also showcases the strength of NVIDIA with a willingness to move fast and adapt to the market. 

As a curiosity, this year, there has been interesting [theoretical research](https://arxiv.org/pdf/2508.08369) done linking Scaled Dot Product + Softmax in Deep Learning to One-Sided Entropic Optimal transport in statistic/information theory, which is the most efficient theoretical way to move between distributions of information. This gives Softmax a really good theoretical grounding. This [WeChat blog](https://mp.weixin.qq.com/s?__biz=MzUxNzQ5MTExNw==&mid=2247494688&idx=1&sn=3d589f6d4be56ee372d5db4f8631b0cc&chksm=f995fce2cee275f443bfdbd1d210519296688922f823527210cbd6d6c1cba17aa4072ccff21a&scene=178&cur_album_id=3210156532718403586&search_click_id=#rd) does a fantastic breakdown of the maths for anyone interested.
### Summary
1) Attention is a measure of similarity between different pieces of information that can be learned in various ways for big data. Most methods have some kind of equivalence between them.
2) The drive to replace attention and softmax with an easier method or estimation is well-grounded, but it comes from a research perspective that does not think in terms of more fundamental causes such as computation/watt, or even memory/compute bottlenecks.
3) Softmax has theoretical grounding and is probably here to stay.
4) Hardware is a fundamental piece in design of DNN architectures.
---
### Reflection and future
Finishing off, let's speculate and guess what this means for the future.

As we concluded, hardware is integral to the architectures. The addition of Tensor Cores 8 years ago to the Volta architecture from NVIDIA has moved the whole field of deep neural networks into a certain paradigm that is almost impossible to get out of. All hardware manufacturers need to support efficient GEMM + Softmax to stay competitive, from Cerebras that has built it into their silicon to do it incredibly efficiently, to AMD that have been playing catch-up with the same features as NVIDIA but 2 years later.

There is an interesting philosophical note on this phenomena in the [github blog](https://github.com/zartbot/blog/issues/3) I linked earlier that quotes leadership writer John C Maxwell:

> One step ahead makes you a pioneer, but half a step ahead makes you a god

If NVIDIA filled the die with Tensor Cores back in Volta to the extent that it is today, it would not have been well-accepted, as engineers and programmers would struggle to understand and express workloads with the new APIs. Instead, the slow and incremental addition half-a-step at a time has allowed NVIDIA to be patient and completely decide the direction of DNN research. 

The next Rubin NVIDIA arch seems to mostly scale the same concepts we already have. 2CTA memory fetches might go to 4CTA, and we will have more GEMM throughput.
The only possible change of the NVIDIA status-quo domination we can see in terms of hardware is Google with the TPU.

For anyone interested about that a TPU is, and what Google has been doing, [here is a](https://considerthebulldog.com/tte-tpu/) fantastic breakdown of the concept from start to finish following the evolution of the TPU. Google was surprisingly open about the architecture of this hardware for a while, despite not providing or selling it to others.

Inherently, the TPU is also a GEMM machine, however the way the physical structure of the TPU cluster differs from GPUs which creates a possibility for a paradigm change. Here is an image from the blog of 9 locally interconnected GPUs:
![[Pasted image 20251214153539.png]]
Quote from the blog:

> Let’s imagine that we’re playing a game of telephone. You and 8 friends are arranged in a 3x3 grid, and you can only communicate with your adjacent neighbors. Your goal is to send a message from the person at (0,0) to the person at (2,2) in the fewest messages. Many paths achieve this, but the shortest one is always four. Now imagine that the people on the left edge of the grid can wrap messages around to people on the right edge of the grid. This is logically like mirroring you and all your friends over that wraparound axis. These 3 new connections make our shortest path 3 instead of 4.

A 3D stacking of the TPU's allows this path to be shortened to 2.

I think that this can make concepts like Distributed MoE with large experts much more compute-friendly and realistic. Today for example, the experts in MoE cannot share information during activations efficiently because they live on different GPUs, and layer-wise communication would require remote, sparse SRAM-allocation requests between GPUs and control for this which would clog up the whole optimization pipeline at every layer.

If instead MoE layers could communicate on every abstraction level/layer of the architecture, you could have phenomena like gating/inhibition on an expert level. A physics-processing expert could modulate the signal of the biology-processing expert if it was certain that the information better belongs to it, leading to a better information flow mapping of the query in the embedding space.

This is an example of something that the TPU architecture would allow, since experts are guaranteed to have a small maximum amount of steps between each other, and communication and routing becomes possible. More importantly, all of this is at a lower cost of compute/watt because of the GEMM systolic array design of the TPU.

The big question here is if Google will make the TPU more available by for example selling it to other companies and provide good stable software integration. I believe they need to do this ASAP, because otherwise they will miss the gradual training of engineers into the MIMD compute paradigm mindset who instead will embrace the NVIDIA GPU SIMT + warp-scheduling paradigm that is readily available and necessary for efficient compute these days.
