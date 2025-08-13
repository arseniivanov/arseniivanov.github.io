Recently, Stephen Welch and his team produced this video about deep learning and how the activation function folds each neuron's output representation plane in space. I highly recommend anyone interested in deep learning fundamentals to watch it and get a feeling on how DNN decisions are made on a toy level.
https://www.youtube.com/watch?v=qx7hirqgfuU

This inspired me to look a bit into different activation functions and see how they fold their space, and what could be beneficial where and why.

In both industry and academia, the prevailing practice is to ‘ "just use some activation", that it does not matter that much in practice and that you can test different ones and see what works for you. While I support this view because the training dynamics usually converge fine, there are also realities such as hardware efficiency and informational representations that should be thought about. If you have a function that runs 10% slower for a million dollar job, it starts to matter. If you have a function that should be able to extrapolate seamlessly at any point in its embedding space, it matters. If you are going to quantize your network later on, it matters.

To test this out, I create a small fully connected network (2->8->8->8->1) and train it to estimate red islands in a blue sea created by [Perlin noise](https://en.wikipedia.org/wiki/Perlin_noise). We input a coordinate (x, y) and predict if its supposed to be red or blue.
![[Pasted image 20250813215330.png]]

I plot the most complex-looking neuron chain of folds for each network below for the activations:

PReLU(ReLU/LeakyReLU estimator)

Swish

GeLU

HardSwish

HardGeLU

The first fold represents the first layer of neurons from the input. They have a representation of plane, that they modify, and then pass on a copy of to each of the 8 following neurons. We can see how the representation of the plane evolves as we go down the network.

![[Pasted image 20250813150917.png]]

We can see that the first row essentially just applied the activation function to a random plane, its the shape of the function itself mapped onto the plane.
The second row has taken the 8, the bolded neuron layer here, (2->**8**->8->8->1) of the first shapes/neurons, and summed them up, and then applied the activation function again to fold the space.
The final row is starting to get to the complexity we need to start representing the random island-like shapes of the GT. 
8 of the final-row representations are taken, summed up, applied with an activation, and then passed through a sigmoid to determine if its a 0(blue) or a 1(red).

The final outputs are heavily influenced by hyper-parameters like learning rate, epoch amount, scheduling, etc. The goal of this exploration is not to find the best Perlin-noise-island-estimator, but to look at the underlying representations and trying to understand what the limitations and qualities of each activation are, and when they can be applied.

---
## What problems do the different activations have?

**The ReLU problem**:

Dead neurons. ReLU inherently kills off informational representation when they wander into the negatives, creating parts of the network that are not contributing to anything. You will lose the information on whether the neuron was -10 or -2. This is not good if our goal is to represent information efficiently with the network.

**The LeakyReLU problem**:

No single-neuron gating. Since LeakyReLU activation is unbounded and non-zero on the edges, we are never able to gate the output for certain inputs using a single neuron. Lets say that a single neuron is responsible for outputting a specific value at some input, and 0 at a different input, you will need the gating functionality, however the network will then need to balance multiple different neurons to "cancel out" each other to simulate gating. This is hard because the network also then has to learn to change these two neurons at the same time each time it makes changes to one of them.

Both of the ReLUs also share the problem of being linear activations. Its clear from both the intermediate steps, and the output, that we can only draw straights lines. Enough straight lines can eventually become rounded, but it can be a limitation depending on your use-case and network size/depth.

**The Swish/GeLU problem**:

Hardware inefficiency. Both GeLU and Swish are slightly less hardware efficient, as they require the use of exp and tanh, which are SFU(Special function unit) hardware that uses a look-up table on the GPU to compute the functions. This cannot be done by the normal CUDA-cores with ALUs, and reduces performance a bit. Furthermore, both ReLU and LeakyReLU are monotonic, so they can both calculate their gradients in-place. We only need the output tensor to be able to calculate the gradient for them, while Swish and GeLU we need to know both the input and the output to know the gradient, hence there is much more data/activations that needs to be saved and shuffled back and forth during training.

Its however worth to note that modern ML compilers, and ML DSLs such as Triton can be used to fuse these operations into the prior computation, removing some of the memory movement costs.

Another thing that goes hand-in-hand with current trends is the sensitivity to quantization. Smooth, unbounded activations have a high dynamic output range and subtle curvature that inevitably gets distorted/suffers information loss in 8 or 4-bit representations. 

**The Hard-estimator problem**:

Bounded search space + non-smoothness. This makes us converge faster to good solutions, but it makes the representation of the information/manifold more constrained. It will yield us faster convergence to better representations on bounded problems, but will fail to construct a representation space that is expandable/formable beyond the task at hand.

HardGeLU is taken from the [NTC paper](https://research.nvidia.com/labs/rtr/neural_texture_compression/) and looks like this:

```
class HardGELU(nn.Module):
    def __init__(self):
        super(HardGELU, self).__init__()
        self.min_val = -3/16
        self.max_val = 3.0
        
    def forward(self, x):
        return torch.clamp(
            torch.where(x > 1.5, x, (x / 3) * (x + 1.5) * (x >= -1.5)),
            min=self.min_val, max=self.max_val
        )

```
 ---
### What do we objectively want from an activation regardless of objective:

In-place gradients (Smaller memory footprint)

Cheap to run (No SFU calls)

Gating (needs to be able to go to 0 to avoid having to learn a neuron coupling for this)

Efficient informational parameter representation (no dead neurons)
### What can we want depending on our network goals:

Smoothness (valid gradients everywhere)

Fast convergence (bounded)

Robustness to quantization (less information loss)

---
### Implications for our Perlin noise task

For the Perlin-noise task at hand, we have the same Perlin noise that we are trying to estimate in every step, it does not change, so there is no need in trying to make a general smooth solution, we can very quickly get to a good-enough bounded hardware-efficient solution.

If we instead had a requirement to for example make the Perlin-space evolve with time by adjusting the network. Making the water level rise and sink and the islands take on different shapes by ONLY adjusting the network weights, we would most likely end up doing better with a continuous smooth solution.

---
### Implications for information representation and embedding space exploration

A lot of AGI hype relies on models that are able to learn by themselves, this means exploring their own embedding spaces, finding knowledge gaps, combining folded representations from various locations and seeing what can be expressed with the sum of them, etc.

Looking at what we have gone through today, we can see that most likely, for any complex networks that are able to meaningfully test new hypotheses, create new ideas and reflect, we will need a fully differentiable, smooth landscape.

From an information-theoretical point of view, continuous representations also make more sense. When you bound space, you are bound to end up with the dead-neuron ReLU-like issues where neurons lose informational representation in parts of their space. So if you want your network to completely maximize its informational capacity, you should train with a smooth, unbounded function and all the regularization and other tricks in the book that can be used to find the global minima. 

However for inference, efficient prediction, serving, and time-critical performances, we will most likely quantize the network to lower precisions, which can be done with a minimal information loss with more evenly placed buckets if we have trained with a bounded function such as HardGELU. 
