import { Car } from './Car.js';
import { NeuralNetwork } from './NeuralNetwork.js';

export function createPopulation(size, startX, startY, cfg) {
  return Array.from({ length: size }, () => new Car(startX, startY, cfg));
}

export function evolvePopulation(population, size, startX, startY, cfg, seedBrain = null) {
  const scored = population.map((c) => ({ car: c, fit: c.fitness(cfg) }));
  scored.sort((a, b) => b.fit - a.fit);

  const elite = scored[0]?.car ?? null;
  const eliteBrain = elite ? NeuralNetwork.clone(elite.brain) : seedBrain;
  const bestFit = scored[0]?.fit ?? 0;
  const successCount = scored.filter(s => s.car.reachedGoal).length;
  const avgSteps = scored.reduce((a, s) => a + s.car.steps, 0) / Math.max(1, scored.length);

  const next = [];
  // Top quarter act as parents (elitism + tournament-ish)
  const parentPool = scored.slice(0, Math.max(2, Math.floor(size / 4))).map(s => s.car.brain);

  for (let i = 0; i < size; i++) {
    const car = new Car(startX, startY, cfg);
    if (i === 0 && eliteBrain) {
      car.brain = NeuralNetwork.clone(eliteBrain);
    } else {
      const parent = parentPool[Math.floor(Math.random() * parentPool.length)] || eliteBrain;
      car.brain = NeuralNetwork.clone(parent);
      NeuralNetwork.mutate(car.brain, cfg.mutationStrength, cfg.mutationRate);
    }
    next.push(car);
  }

  return {
    population: next,
    bestBrain: eliteBrain ? NeuralNetwork.clone(eliteBrain) : null,
    bestFitness: bestFit,
    successCount,
    avgSteps,
  };
}
