import numpy as np
import copy
import matplotlib.pyplot as plt
import pandas as pd
from time import time

# --- CONFIGURATION ---
CONFIG = {
    'time_range': (5, 20),
    'Generations': 100,      # Max iterations
    'N_RUNS': 1,            # Independent runs per instance
    
    # Algo Params
    'PopSize_Standard': 80,  
    'NSP': 4,                # DGA: Sub-pops
    'SPS': 20,               # DGA: Individuals per sub-pop
    'MR': 0.1,               
    'MI': 5,                 
    'F': 0.8,                
    'CR': 0.9                
}

# --- PROBLEM DEFINITION ---
class CloudHealthcareProblem:
    def __init__(self, nP, nD, time_range):
        self.nP = nP
        self.nD = nD
        self.patient_times = np.random.randint(time_range[0], time_range[1] + 1, size=nP)

    def calculate_tf(self, assignment):
        doctor_times = np.zeros(self.nD)
        for p_idx, d_idx in enumerate(assignment):
            doctor_times[d_idx] += self.patient_times[p_idx]
        return np.std(doctor_times)

class Individual:
    def __init__(self, nP, nD, genes=None):
        if genes is None:
            self.genes = np.random.randint(0, nD, size=nP)
        else:
            self.genes = np.array(genes)
        self.fitness = 0.0

    def evaluate(self, problem):
        self.fitness = problem.calculate_tf(self.genes)

# --- ALGORITHMS ---

class Greedy_Solver:
    def run(self, problem):
        # Deterministic run
        doctor_loads = np.zeros(problem.nD)
        assignment = np.zeros(problem.nP, dtype=int)
        for p_idx in range(problem.nP):
            best_doc = np.argmin(doctor_loads)
            assignment[p_idx] = best_doc
            doctor_loads[best_doc] += problem.patient_times[p_idx]
        return problem.calculate_tf(assignment)

class Random_Solver:
    def run(self, problem, iterations):
        genes = np.random.randint(0, problem.nD, size=problem.nP)
        best_tf = problem.calculate_tf(genes)
        history = [best_tf]
        for _ in range(iterations):
            genes = np.random.randint(0, problem.nD, size=problem.nP)
            tf = problem.calculate_tf(genes)
            if tf < best_tf: best_tf = tf
            history.append(best_tf) 
        return history

class DE_Solver:
    def run(self, problem, config):
        population = [Individual(problem.nP, problem.nD) for _ in range(config['PopSize_Standard'])]
        for ind in population: ind.evaluate(problem)
        best_ind = min(population, key=lambda x: x.fitness)
        history = [best_ind.fitness]
        
        for _ in range(config['Generations']):
            new_population = []
            for i in range(config['PopSize_Standard']):
                target = population[i]
                idxs = [idx for idx in range(config['PopSize_Standard']) if idx != i]
                r1_idx, r2_idx = np.random.choice(idxs, 2, replace=False)
                r1, r2 = population[r1_idx], population[r2_idx]
                
                # Mutation & Crossover
                diff = (r1.genes.astype(float) - r2.genes.astype(float))
                mutant_vec = best_ind.genes.astype(float) + config['F'] * diff
                cross_mask = np.random.rand(problem.nP) < config['CR']
                mutant_disc = np.round(mutant_vec).astype(int) % problem.nD
                trial_genes = np.where(cross_mask, np.abs(mutant_disc), target.genes)
                
                trial = Individual(problem.nP, problem.nD, trial_genes)
                trial.evaluate(problem)
                
                # Selection
                if trial.fitness <= target.fitness:
                    new_population.append(trial)
                    if trial.fitness < best_ind.fitness: best_ind = copy.deepcopy(trial)
                else:
                    new_population.append(target)
            population = new_population
            history.append(best_ind.fitness)
        return history

class GA_Solver:
    def run(self, problem, config):
        population = [Individual(problem.nP, problem.nD) for _ in range(config['PopSize_Standard'])]
        for ind in population: ind.evaluate(problem)
        best_global = min(population, key=lambda x: x.fitness).fitness
        history = [best_global]
        
        for _ in range(config['Generations']):
            new_pop = []
            for _ in range(config['PopSize_Standard']):
                # Tournament
                p1, p2 = np.random.choice(population, 2, replace=False)
                parent = p1 if p1.fitness < p2.fitness else p2
                child = Individual(problem.nP, problem.nD, copy.deepcopy(parent.genes))
                
                # Mutation
                if np.random.rand() < config['MR']:
                    idx = np.random.randint(0, problem.nP)
                    child.genes[idx] = np.random.randint(0, problem.nD)
                child.evaluate(problem)
                new_pop.append(child)
            population = new_pop
            current = min(population, key=lambda x: x.fitness).fitness
            if current < best_global: best_global = current
            history.append(best_global)
        return history

class DGA_Solver:
    def run(self, problem, config):
        sub_pops = []
        for _ in range(config['NSP']):
            pop = [Individual(problem.nP, problem.nD) for _ in range(config['SPS'])]
            for ind in pop: ind.evaluate(problem)
            sub_pops.append(pop)
        
        global_best = float('inf')
        for pop in sub_pops:
            local = min(pop, key=lambda x: x.fitness).fitness
            if local < global_best: global_best = local
        history = [global_best]
        
        for g in range(config['Generations']):
            # Local Evolution
            for p_idx in range(config['NSP']):
                current_pop = sub_pops[p_idx]
                new_sub_pop = []
                for _ in range(config['SPS']):
                    # Tournament
                    i1, i2 = np.random.choice(config['SPS'], 2, replace=False)
                    p1 = current_pop[i1] if current_pop[i1].fitness < current_pop[i2].fitness else current_pop[i2]
                    i3, i4 = np.random.choice(config['SPS'], 2, replace=False)
                    p2 = current_pop[i3] if current_pop[i3].fitness < current_pop[i4].fitness else current_pop[i4]
                    
                    # Crossover
                    child = Individual(problem.nP, problem.nD)
                    mask = np.random.rand(problem.nP) < 0.5
                    child.genes = np.where(mask, p1.genes, p2.genes)
                    
                    # Mutation
                    if np.random.rand() < config['MR']:
                        idx = np.random.randint(0, problem.nP)
                        child.genes[idx] = np.random.randint(0, problem.nD)
                    child.evaluate(problem)
                    new_sub_pop.append(child)
                sub_pops[p_idx] = new_sub_pop

            # Migration
            if g % config['MI'] == 0 and g > 0:
                elites = [min(p, key=lambda x: x.fitness) for p in sub_pops]
                for k in range(config['NSP']):
                    target_idx = (k + 1) % config['NSP']
                    target_pop = sub_pops[target_idx]
                    best_in_target_idx = np.argmin([ind.fitness for ind in target_pop])
                    possible_indices = list(range(config['SPS']))
                    possible_indices.remove(best_in_target_idx)
                    replace_idx = np.random.choice(possible_indices)
                    target_pop[replace_idx] = copy.deepcopy(elites[k])

            # Update Global Best
            current_gen_best = float('inf')
            for pop in sub_pops:
                local = min(pop, key=lambda x: x.fitness).fitness
                if local < current_gen_best: current_gen_best = local
            if current_gen_best < global_best: global_best = current_gen_best
            history.append(global_best)
            
        return history

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    
    # Setup Instances (T1 - T16)
    instances = []
    idx = 1
    for nP in [100, 200, 300, 400]:
        for nD in [10, 20, 30, 40]:
            instances.append({'id': f"T{idx}", 'nP': nP, 'nD': nD})
            idx += 1
            
    # Targets for Fig 6
    plot_targets = ['T2', 'T5', 'T6', 'T10', 'T13', 'T14']
    plot_data = {}

    print(f"=== Starting Simulation (T1-T16) x {CONFIG['N_RUNS']} Runs ===")

    table_results = []

    for inst in instances:
        inst_id = inst['id']
        nP, nD = inst['nP'], inst['nD']
        
        # Result containers
        results_rand = []
        results_de = []
        results_ga = []
        results_dga = []
        greedy_val = 0 
        
        # Plot containers
        hist_sum_rand = np.zeros(CONFIG['Generations'] + 1)
        hist_sum_de = np.zeros(CONFIG['Generations'] + 1)
        hist_sum_ga = np.zeros(CONFIG['Generations'] + 1)
        hist_sum_dga = np.zeros(CONFIG['Generations'] + 1)
        
        problem = CloudHealthcareProblem(nP, nD, CONFIG['time_range'])
        
        # Run Greedy (Once)
        greedy_val = Greedy_Solver().run(problem)

        for r in range(CONFIG['N_RUNS']):
            # Run Algos
            h_rand = Random_Solver().run(problem, iterations=CONFIG['Generations'])
            h_de = DE_Solver().run(problem, CONFIG)
            h_ga = GA_Solver().run(problem, CONFIG)
            h_dga = DGA_Solver().run(problem, CONFIG)
            
            # Store final values
            results_rand.append(h_rand[-1])
            results_de.append(h_de[-1])
            results_ga.append(h_ga[-1])
            results_dga.append(h_dga[-1])
            
            # Accumulate history for plots
            if inst_id in plot_targets:
                hist_sum_rand += h_rand
                hist_sum_de += h_de
                hist_sum_ga += h_ga
                hist_sum_dga += h_dga
        
        # Calculate Stats
        row = {
            'Instance': inst_id,
            'Rand_Avg': np.mean(results_rand), 'Rand_Std': np.std(results_rand),
            'Greedy': greedy_val,
            'DE_Avg': np.mean(results_de), 'DE_Std': np.std(results_de),
            'GA_Avg': np.mean(results_ga), 'GA_Std': np.std(results_ga),
            'DGA_Avg': np.mean(results_dga), 'DGA_Std': np.std(results_dga)
        }
        table_results.append(row)
        
        # Store avg plot data
        if inst_id in plot_targets:
            plot_data[inst_id] = {
                'rand': hist_sum_rand / CONFIG['N_RUNS'],
                'de': hist_sum_de / CONFIG['N_RUNS'],
                'ga': hist_sum_ga / CONFIG['N_RUNS'],
                'dga': hist_sum_dga / CONFIG['N_RUNS'],
                'nP': nP, 'nD': nD
            }
            
        print(f"  > Done {inst_id}...")

    # --- PRINT TABLE ---
    print("\n" + "="*115)
    print("REPLICATION TABLE 2 (Improved Formatting)")
    print("="*115)
    
    header = (
        f"{'Inst':<6} | "
        f"{'Random (Avg   Std)':<20} | "
        f"{'Greedy':<10} | "
        f"{'DE (Avg   Std)':<20} | "
        f"{'GA (Avg   Std)':<20} | "
        f"{'DGA (Avg   Std)':<20}"
    )
    
    print(header)
    print("-" * 115)
    
    for r in table_results:
        rand_str = f"{r['Rand_Avg']:.2E} {r['Rand_Std']:.2E}"
        de_str   = f"{r['DE_Avg']:.2E} {r['DE_Std']:.2E}"
        ga_str   = f"{r['GA_Avg']:.2E} {r['GA_Std']:.2E}"
        dga_str  = f"{r['DGA_Avg']:.2E} {r['DGA_Std']:.2E}"
        
        line = (
            f"{r['Instance']:<6} | "
            f"{rand_str:<20} | "
            f"{r['Greedy']:.2E}   | "
            f"{de_str:<20} | "
            f"{ga_str:<20} | "
            f"{dga_str:<20}"
        )
        print(line)
    
    print("="*115)
        
    # --- PLOT FIGURE 6 ---
    print("\nGenerating Grid Plot (Fig. 6)...")
    
    fig, axs = plt.subplots(2, 3, figsize=(15, 8))
    axs = axs.flatten()
    
    for i, target in enumerate(plot_targets):
        data = plot_data[target]
        ax = axs[i]
        x_ax = range(len(data['ga']))
        
        mark_every = 10 
        
        ax.plot(x_ax, data['rand'], label='Random', color='cyan', marker='s', markevery=mark_every, markersize=5, linewidth=1)
        ax.plot(x_ax, data['de'], label='DE', color='#ff4d4d', marker='o', markevery=mark_every, markersize=5, linewidth=1)
        ax.plot(x_ax, data['ga'], label='GA', color='#2ecc71', marker='^', markevery=mark_every, markersize=5, linewidth=1)
        ax.plot(x_ax, data['dga'], label='DGA', color='orange', marker='d', markevery=mark_every, markersize=5, linewidth=1.5)
        
        ax.set_title(f"({chr(97+i)}) {target}") 
        ax.set_xlabel('Generations')
        ax.set_ylabel('TF')
        ax.grid(True, linestyle='--', alpha=0.5)
        
        if i == 0: 
            ax.legend()

    plt.suptitle('Convergence curves of DGA and compared algorithms on six typical test instances', y=0.98, fontsize=14)
    plt.tight_layout()
    plt.show()