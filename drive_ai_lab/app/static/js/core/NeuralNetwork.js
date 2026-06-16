export class Level {
  constructor(inputCount, outputCount) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);
    this.biases = new Array(outputCount);
    this.weights = [];
    for (let i = 0; i < inputCount; i++) {
      this.weights[i] = new Array(outputCount);
    }
    Level.randomize(this);
  }

  static randomize(level) {
    for (let i = 0; i < level.inputs.length; i++)
      for (let j = 0; j < level.outputs.length; j++)
        level.weights[i][j] = Math.random() * 2 - 1;
    for (let i = 0; i < level.biases.length; i++)
      level.biases[i] = Math.random() * 2 - 1;
  }

  static feedForward(givenInputs, level) {
    for (let i = 0; i < level.inputs.length; i++)
      level.inputs[i] = givenInputs[i];
    for (let j = 0; j < level.outputs.length; j++) {
      let sum = 0;
      for (let i = 0; i < level.inputs.length; i++)
        sum += level.inputs[i] * level.weights[i][j];
      // tanh activation
      level.outputs[j] = Math.tanh(sum + level.biases[j]);
    }
    return level.outputs;
  }
}

export class NeuralNetwork {
  constructor(neuronCounts) {
    this.levels = [];
    for (let i = 0; i < neuronCounts.length - 1; i++)
      this.levels.push(new Level(neuronCounts[i], neuronCounts[i + 1]));
  }

  static feedForward(givenInputs, network) {
    let outputs = Level.feedForward(givenInputs, network.levels[0]);
    for (let i = 1; i < network.levels.length; i++)
      outputs = Level.feedForward(outputs, network.levels[i]);
    return outputs;
  }

  static mutate(network, amount = 0.25, rate = 1.0) {
    network.levels.forEach(level => {
      for (let i = 0; i < level.biases.length; i++) {
        if (Math.random() < rate)
          level.biases[i] = lerp(level.biases[i], Math.random() * 2 - 1, amount);
      }
      for (let i = 0; i < level.weights.length; i++)
        for (let j = 0; j < level.weights[i].length; j++) {
          if (Math.random() < rate)
            level.weights[i][j] = lerp(level.weights[i][j], Math.random() * 2 - 1, amount);
        }
    });
  }

  static clone(network) {
    const n = new NeuralNetwork([]);
    n.levels = network.levels.map(l => {
      const nl = new Level(l.inputs.length, l.outputs.length);
      nl.weights = l.weights.map(r => [...r]);
      nl.biases = [...l.biases];
      return nl;
    });
    return n;
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }