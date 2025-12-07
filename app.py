"""
Flask Backend for Healthcare Scheduler
Connects the web interface to Python optimization algorithms
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import sys
import os

# Add current directory to path to import main.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import algorithms from main.py
from main import (
    CloudHealthcareProblem,
    Random_Solver,
    Greedy_Solver,
    DE_Solver,
    GA_Solver,
    DGA_Solver,
    CONFIG
)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Test instance configurations (T1-T16)
SCENARIOS = {
    'T1': {'nP': 100, 'nD': 10}, 'T2': {'nP': 100, 'nD': 20},
    'T3': {'nP': 100, 'nD': 30}, 'T4': {'nP': 100, 'nD': 40},
    'T5': {'nP': 200, 'nD': 10}, 'T6': {'nP': 200, 'nD': 20},
    'T7': {'nP': 200, 'nD': 30}, 'T8': {'nP': 200, 'nD': 40},
    'T9': {'nP': 300, 'nD': 10}, 'T10': {'nP': 300, 'nD': 20},
    'T11': {'nP': 300, 'nD': 30}, 'T12': {'nP': 300, 'nD': 40},
    'T13': {'nP': 400, 'nD': 10}, 'T14': {'nP': 400, 'nD': 20},
    'T15': {'nP': 400, 'nD': 30}, 'T16': {'nP': 400, 'nD': 40}
}


@app.route('/')
def home():
    """Health check endpoint"""
    return jsonify({
        'status': 'running',
        'message': 'Healthcare Scheduler Backend API',
        'endpoints': ['/api/simulate']
    })


@app.route('/api/simulate', methods=['POST'])
def simulate():
    """
    Run optimization simulation
    
    Request JSON:
    {
        "algorithms": ["Random", "Greedy", "DE", "GA", "DGA"],
        "generations": 100,
        "runs": 1,
        "scenario": "T5"  // or "CUSTOM" with nP, nD, time_range
        "mode": "single"  // or "batch" with scenarios array
    }
    
    Response JSON:
    {
        "instance": {"id": "T5", "nP": 200, "nD": 10},
        "results": {
            "Random": {"avg": 12.34, "std": 0.56, "best": 11.8, "history": [...]},
            ...
        }
    }
    """
    try:
        # Get request data
        data = request.get_json()
        algorithms = data.get('algorithms', [])
        generations = int(data.get('generations', 100))
        runs = int(data.get('runs', 1))
        mode = data.get('mode', 'single')
        
        # Check if batch mode
        if mode == 'batch':
            # Batch mode - process multiple scenarios
            scenarios = data.get('scenarios', [])
            
            if not scenarios:
                return jsonify({'error': 'No scenarios provided for batch mode'}), 400
            
            # Results storage for all scenarios
            batch_results = {}
            
            for scenario in scenarios:
                if scenario not in SCENARIOS:
                    continue
                
                # Get problem parameters for this scenario
                nP = SCENARIOS[scenario]['nP']
                nD = SCENARIOS[scenario]['nD']
                time_range = CONFIG['time_range']
                
                # Update CONFIG
                config = CONFIG.copy()
                config['Generations'] = generations
                
                # Results for this scenario
                scenario_results = {}
                scenario_convergence = {}  # Track convergence histories
                
                # Run selected algorithms for this scenario
                for algo in algorithms:
                    print(f"Running {algo} for {scenario}...")
                    
                    if algo == 'Random':
                        all_finals = []
                        all_histories = []
                        for run in range(runs):
                            problem = CloudHealthcareProblem(nP, nD, time_range)
                            history = Random_Solver().run(problem, iterations=generations)
                            all_finals.append(history[-1])
                            all_histories.append(history)
                        
                        scenario_results['Random'] = {
                            'avg': float(np.mean(all_finals)),
                            'std': float(np.std(all_finals))
                        }
                        # Store average convergence
                        if all_histories:
                            avg_conv = np.mean(all_histories, axis=0).tolist()
                            scenario_convergence['Random'] = avg_conv
                    
                    elif algo == 'Greedy':
                        problem = CloudHealthcareProblem(nP, nD, time_range)
                        greedy_val = Greedy_Solver().run(problem)
                        scenario_results['Greedy'] = {
                            'avg': float(greedy_val),
                            'std': 0.0
                        }
                    
                    elif algo == 'DE':
                        all_finals = []
                        all_histories = []
                        for run in range(runs):
                            problem = CloudHealthcareProblem(nP, nD, time_range)
                            history = DE_Solver().run(problem, config)
                            all_finals.append(history[-1])
                            all_histories.append(history)
                        
                        scenario_results['DE'] = {
                            'avg': float(np.mean(all_finals)),
                            'std': float(np.std(all_finals))
                        }
                        if all_histories:
                            scenario_convergence['DE'] = np.mean(all_histories, axis=0).tolist()
                    
                    elif algo == 'GA':
                        all_finals = []
                        all_histories = []
                        for run in range(runs):
                            problem = CloudHealthcareProblem(nP, nD, time_range)
                            history = GA_Solver().run(problem, config)
                            all_finals.append(history[-1])
                            all_histories.append(history)
                        
                        scenario_results['GA'] = {
                            'avg': float(np.mean(all_finals)),
                            'std': float(np.std(all_finals))
                        }
                        if all_histories:
                            scenario_convergence['GA'] = np.mean(all_histories, axis=0).tolist()
                    
                    elif algo == 'DGA':
                        all_finals = []
                        all_histories = []
                        for run in range(runs):
                            problem = CloudHealthcareProblem(nP, nD, time_range)
                            history = DGA_Solver().run(problem, config)
                            all_finals.append(history[-1])
                            all_histories.append(history)
                        
                        scenario_results['DGA'] = {
                            'avg': float(np.mean(all_finals)),
                            'std': float(np.std(all_finals))
                        }
                        if all_histories:
                            scenario_convergence['DGA'] = np.mean(all_histories, axis=0).tolist()
                
                batch_results[scenario] = {
                    'nP': nP,
                    'nD': nD,
                    'results': scenario_results,
                    'convergence': scenario_convergence
                }
            
            # Return batch results
            return jsonify({
                'mode': 'batch',
                'results': batch_results
            })
        
        # Single mode (existing code)
        scenario = data.get('scenario', 'T5')
        
        # Handle custom vs predefined scenarios
        if scenario == 'CUSTOM':
            # Custom scenario - get parameters from request
            nP = int(data.get('nP', 100))
            nD = int(data.get('nD', 10))
            time_range = tuple(data.get('time_range', [5, 20]))
            
            print(f"Custom scenario: {nP}P × {nD}D, time range: {time_range}")
        else:
            # Predefined scenario - validate
            if scenario not in SCENARIOS:
                return jsonify({'error': f'Invalid scenario: {scenario}'}), 400
            
            # Get problem parameters
            nP = SCENARIOS[scenario]['nP']
            nD = SCENARIOS[scenario]['nD']
            time_range = CONFIG['time_range']
            
            print(f"Predefined scenario: {scenario} ({nP}P × {nD}D)")
        
        # Update CONFIG with user-specified values
        config = CONFIG.copy()
        config['Generations'] = generations
        
        # Results storage
        results = {}
        
        # Run selected algorithms
        for algo in algorithms:
            print(f"Running {algo}...")
            
            if algo == 'Random':
                # Run Random solver multiple times
                all_finals = []
                all_histories = []
                
                for run in range(runs):
                    # Create NEW problem instance per run (like main.py)
                    problem = CloudHealthcareProblem(nP, nD, time_range)
                    history = Random_Solver().run(problem, iterations=generations)
                    all_finals.append(history[-1])
                    all_histories.append(history)
                
                # Average histories
                avg_history = np.mean(all_histories, axis=0).tolist()
                
                results['Random'] = {
                    'avg': float(np.mean(all_finals)),
                    'std': float(np.std(all_finals)),
                    'best': float(np.min(all_finals)),
                    'history': avg_history
                }
            
            elif algo == 'Greedy':
                # Greedy is deterministic, but still create problem instance
                problem = CloudHealthcareProblem(nP, nD, time_range)
                greedy_val = Greedy_Solver().run(problem)
                results['Greedy'] = {
                    'avg': float(greedy_val),
                    'std': 0.0,  # No variation
                    'best': float(greedy_val),
                    'history': []  # No convergence history
                }
            
            elif algo == 'DE':
                # Run DE multiple times
                all_finals = []
                all_histories = []
                
                for run in range(runs):
                    # Create NEW problem instance per run (like main.py)
                    problem = CloudHealthcareProblem(nP, nD, time_range)
                    history = DE_Solver().run(problem, config)
                    all_finals.append(history[-1])
                    all_histories.append(history)
                
                avg_history = np.mean(all_histories, axis=0).tolist()
                
                results['DE'] = {
                    'avg': float(np.mean(all_finals)),
                    'std': float(np.std(all_finals)),
                    'best': float(np.min(all_finals)),
                    'history': avg_history
                }
            
            elif algo == 'GA':
                # Run GA multiple times
                all_finals = []
                all_histories = []
                
                for run in range(runs):
                    # Create NEW problem instance per run (like main.py)
                    problem = CloudHealthcareProblem(nP, nD, time_range)
                    history = GA_Solver().run(problem, config)
                    all_finals.append(history[-1])
                    all_histories.append(history)
                
                avg_history = np.mean(all_histories, axis=0).tolist()
                
                results['GA'] = {
                    'avg': float(np.mean(all_finals)),
                    'std': float(np.std(all_finals)),
                    'best': float(np.min(all_finals)),
                    'history': avg_history
                }
            
            elif algo == 'DGA':
                # Run DGA multiple times
                all_finals = []
                all_histories = []
                
                for run in range(runs):
                    # Create NEW problem instance per run (like main.py)
                    problem = CloudHealthcareProblem(nP, nD, time_range)
                    history = DGA_Solver().run(problem, config)
                    all_finals.append(history[-1])
                    all_histories.append(history)
                
                avg_history = np.mean(all_histories, axis=0).tolist()
                
                results['DGA'] = {
                    'avg': float(np.mean(all_finals)),
                    'std': float(np.std(all_finals)),
                    'best': float(np.min(all_finals)),
                    'history': avg_history
                }
        
        # Prepare response
        response = {
            'instance': {
                'id': scenario,
                'nP': nP,
                'nD': nD
            },
            'results': results
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("Healthcare Scheduler Backend Server")
    print("=" * 60)
    print("Server running at: http://localhost:5000")
    print("API endpoint: http://localhost:5000/api/simulate")
    print("=" * 60)
    print("\nReady to accept requests from the web interface!\n")
    
    # Run Flask app
    app.run(debug=True, port=5000, host='0.0.0.0')
