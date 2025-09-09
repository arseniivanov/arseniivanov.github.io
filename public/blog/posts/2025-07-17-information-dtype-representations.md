## Why FP4 is not a free lunch for ML

#### The March to Fewer Bits

As LLM and Stable Diffusion models are growing, the computational and memory costs are growing with them. The industry's answer? A relentless march towards lower-precision data formats. We started with 32-bit floating-point numbers (FP32), celebrated the move to FP16 and BFloat16 by designing hardware that deals with these types specifically, did it again a couple of years later for FP8 + INT8, and now again with the seemingly radical NVFP4, MXFP4, FP4, INT4 with researchers staring down at pure binary networks.

The pitch is simple and seductive: fewer bits mean less memory, less memory bandwidth, and faster computations with the same(or better, as papers often claim) performance. It’s a win-win-win-win, so much winning.
#### Is it this simple?
In our race to the bottom of the bit-count, I think we are missing two perspectives: 
1) A neural network is not an informationally homogeneous system.
2) The computational medium needs to support the computation load efficiently in relation to the informational representation that it creates.
# Information homogeneity

When reading papers about fp4, its unclear from the title, and sometimes even the abstract that the quantization is applied to a specific part of the network.
In Transformers, commonly the quantization is applied to the fully-connected layers of the network. Why is this the case?

Because different parts of the network require different informational representation and are differently sensitive to noise.
In fully connected networks, we are adding up many low-precision multiplications into a high-precision accumulator for each output. Due to the law of large numbers, we will smooth out the error signal. 

To intuitively understand this, when we are adding up contributions from a dot product with low precision into a higher-precision accumulator, the noise/quantization loss introduced by each lower precision multiplication is normally distributed around 0. We will both add errors and cancel previous errors on each accumulation with equal probability. This makes the total summed up noise grow slower(sqrt{N}) than the signal(N).

This is however not true for all layers.

What would happen if we did this precision reduction before a Softmax? Let's say we pass a FP8_E4M3(an 8-bit floating-point number with a 4-bit exponent and a 3-bit mantissa) output to the softmax. 

Softmax takes a vector of raw scores and transforms them into a probability distribution. Every 
score is exponentiated (eˣ) and then normalized by dividing by the sum of all exponentiated scores. A slightly larger score can become a much larger probability after exponentiation. This function is fundamental to how models make selections, such as choosing the next word in a sentence. It's also related to the "temperature" setting in large language models (LLMs), which adjusts the randomness of the output by altering the sampling from this probability distribution.
 
The problem with low precision arises from the limited number of values that can be represented. In the FP8_E4M3 format, there are larger gaps between representable numbers. Let's look at the values that can be represented when the exponent is 2⁻² (or 0.25). The 3-bit mantissa allows for only eight distinct steps in this range:
    
    - 0.25 * (1 + 0/8) = 0.25
    - 0.25 * (1 + 1/8) = 0.28125
    - 0.25 * (1 + 2/8) = 0.3125
    - 0.25 * (1 + 3/8) = 0.34375
    - 0.25 * (1 + 4/8) = 0.375
    - 0.25 * (1 + 5/8) = 0.40625
    - 0.25 * (1 + 6/8) = 0.4375
    - 0.25 * (1 + 7/8) = 0.46875

There is a 0.03-sized gap between each number. Any real number that falls between these steps must be rounded to the nearest available value. For example, the values 0.268, 0.275, and 0.295 would all be quantized to 0.28125.

We see that we lose all relative information between the outputs 0.268 and 0.295, which is often needed for a good probability distribution. After Softmax with quantization, we can get a sparse, spiky output where the model is certain of outputs from some specific buckets. Since this output can come from a specific, non-representative training example, we might end up degrading the network in a non-recoverable way, as the gradients have pushed the layer in a sparse way, and it cannot see other outputs than the chosen ones. In optimization terminology, quantization is changing the smoothness of the optimization landscape, which can make it harder to escape local minima.
#### Autoencoders 
Another way to understand this outside of LLMs are Autoencoders. Autoencoders are neural network architectures that impose an artificial informational bottleneck by having an architecture that forces the neural network to compress as much as possible of the training information inside the bottleneck, and then reconstruct the input from this compressed representation. 
![[Pasted image 20250718090031.png]]

This technique has become much more widespread in parts of LLM architectures as well, with KV cache-projections (page 8 in the DeepSeekV3 report https://arxiv.org/pdf/2412.19437) essentially doing the same thing, utilizing the fact that KV-caches for specific MoE expert heads often have similar activations.

#### BNNs
When we go down to 1-bit binary, or 1.58-bit ternary networks, we get to an extreme stage where we no longer can have ANY magnitude information in the computation. We are only able to do selection between inputs. This means that any computation that is done in this resolution will be unable to represent any relative gradient relationship between the inputs.
#### Section summary
To close this chapter, the summary here is that different parts of a neural network architecture are representing different transformations and are at different stages of the informational flow. If we homogenously quantize the network, we might impose an informational bottleneck that will limit  how much information can reach the deeper layer of the network and limit it's performance as a whole. Its not hard to see that in the autoencoder structure above, it probably would not make sense to quantize the bottleneck if the goal was to capture more information.
#### Open research problem
An open research problem in this topic is: what is the best way, at any point during training of a neural network, to understand **where**, and **what** the informational bottleneck is for a problem? 

Assume we have the Autoencoder above, we get the **where** for free here, and let's say we can see that the bottleneck is unable to handle the rising data compression demands as the training set grow. The question is then:
Should the bottleneck layer be larger(increase from lets say 16 to 32 nodes)? Or should we have higher precision in it(increase from fp16 to fp32)? Should we perhaps add another bottleneck layer next to it(another 16 nodes in a new layer) to allow transforms of the compressed representation? 
**What yields the largest informational capacity capture increase with the least amount of bytes added? And can we somehow figure this out automatically during training?**

I believe that estimating this often requires some notion of Mutual Information between layers, which is notoriously hard to approximate due to the nature of back-propagation, I will make a separate blog about this in the future.
# Memory-boundness and informational representation

We have gone over the informational representation, and will now go to the second point of the initial suggestion, the computational medium and the informational representation.

The most famous paper on memory-boundness is the "Roofline" back from 2009.
https://dl.acm.org/doi/10.1145/1498765.1498785,
The paper showed that for then many and today most machine learning workloads on GPUs, unless you are doing raw, optimized GEMMs or crazily pipelined, specific-hardware-optimized FlashAttention transformer runs, the limit is the memory transfer and the instruction scheduling, not the computation. The units can compute incredibly fast, and the algorithm is throttled by the movement of data on the GPU and not the computation itself. This was also one of the biggest arguments for the TPU architectural design at Google.

What does this mean in relation to low-precision operators?
It means that even if we are computing more and faster with FP4, it does not matter if we were to use FP16 instead from the total time of the whole computation if we factor in the memory transfer time. At the same time, you would get a much higher informational representation in the FP16 case.

Let's say for the sakes of the argument discounting the overheads that we go from FP16 to FP4. We get a 4x computational speed improvement. However, if the memory transfer is 95% of the whole computation time, we get a 4x computational speed improvement on the final 5%. If we then consider the informational representation of a multiplication with 2 16-bit floating point values, and 2 4-bit floating point values, we have immense informational differences at a not-so-immense computational throughput gain.

#### Refutations
This is not to say that quantization and lower precision representations cant improve throughput.

Apart from the cases where the network is not memory but compute-bound, this blog from last year(https://www.thonking.ai/p/strangely-matrix-multiplications) by Horace He shows that you can get a 15-20% throughput boost if you use homogeneous input data(for example only 0s or only 1s) due to the reduced flips of the transistors which means reduced heat, which means less throttling by the hardware.
In some way this is pointing to a future where it could be more computationally efficient to use low-bit representations from a systems-optimization perspective.

However, the Tensor cores in NVIDIA 30 and 40-generation cards are working with certain dtypes, a list of them is attached in the table below. This means that every single 1-bit value will be cast to either a 8-bit char(8-bit float possible for newer 40x and 50x generations), or a 16-bit float before being sent to compute. 
Sure, we will gain the 10% throughput increase for binary networks, but could also have, in the exactly same clock-time have sent a 8-bit or a 16-bit value to the computational medium. This would again yield you a more information-rich computation at the same price from an information-theoretical perspective.

When we then factor in the throughput gains from having a binary network (10% from the blog), we can consider if its more relevant to compute 10% more values in 1-bit informational representation than 8-bit values.

![[Pasted image 20250711201100.png]]

#### Section Summary
When going to lower precision, the computational medium on which we are going to compute is not always kept in mind. It might not make sense from an informational perspective to quantize if the quantization target is memory-bound on the available computational medium, as we could have a richer capture of the information to a similar computational cost.
#### Open research problem
An open research problem in this topic is: **Is it better, or even possible, to construct neural architectures based on the computational medium provided?**

This would mean something akin running a NAS with hardware constraints, creating an architecture, or modular parts of an architecture that are not memory-bound from the get-go, and then moving the blocks around to create a meaningful architecture for ones' problem. I would almost envision a computation that is linearly separable at points by design, such that smaller hardware with smaller caches could perform the same computation, but in smaller chunks.
# Conclusion
I feel like the current view and approach to smaller datatypes disregard the informational representation that the network is holding at various stages inside itself.

Solutions like the DeepSeek KV cache low-rank projection or perhaps the best literal analog here for my comparison - LoRA, are all band-aids for an informational representation problem that could be addressed with analysis and information-flow-aware design of the NN architecture.

I think that the current approach is non-scaleable. It can't be that the best way to figure out what representation is suitable for parts of an architecture is just testing and re-training various layers with various precisions, which seems to be the lab and industry approach today. It also cant be that band-aid informational representation fixes that target existing networks will bring us closer to networks with optimal information representation.

Extrapolating from this, I feel like both of these constraints and problems that we have talked about here point to a future with more variable, and self-reorganizing neural networks. Networks that are able to figure out when their informational representation is not sufficient, and scale or connect necessary blocks of computation while keeping the hardware that its running on in mind for this.
