// =====================================================
// Training Page JavaScript
// Handles simulation API calls and results visualization
// =====================================================

let convergenceChart = null;

document.addEventListener('DOMContentLoaded', function() {
    
    const form = document.getElementById('simulationForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');
    const btnText = document.getElementById('btnText');
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect form data
        const selectedAlgorithms = Array.from(
            document.querySelectorAll('input[name="algorithms"]:checked')
        ).map(cb => cb.value);
        
        const generations = parseInt(document.getElementById('generations').value);
        const runs = parseInt(document.getElementById('runs').value);
        const scenario = document.getElementById('scenario').value;
        
        // Validation
        if (selectedAlgorithms.length === 0) {
            alert('Please select at least one algorithm');
            return;
        }
        
        if (generations < 10 || generations > 500) {
            alert('Generations must be between 10 and 500');
            return;
        }
        
        if (runs < 1 || runs > 30) {
            alert('Number of runs must be between 1 and 30');
            return;
        }
        
        // Run simulation
        runSimulation(selectedAlgorithms, generations, runs, scenario);
    });
    
});

// Run simulation function
async function runSimulation(algorithms, generations, runs, scenario) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');
    const btnText = document.getElementById('btnText');
    
    // Show loading
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    btnText.textContent = 'Running...';
    
    try {
        // Prepare request data
        const requestData = {
            algorithms: algorithms,
            generations: generations,
            runs: runs,
            scenario: scenario
        };
        
        // API call to Python backend
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('Simulation failed: ' + response.statusText);
        }
        
        const data = await response.json();
        
        // Display results
        displayResults(data, scenario);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Simulation error: ' + error.message + '\n\nNote: Make sure the Python backend server is running at /api/simulate endpoint.');
        
        // Show demo data instead (for testing UI without backend)
        console.log('Showing demo data for UI testing...');
        showDemoResults(algorithms, generations, scenario);
    } finally {
        // Hide loading
        loadingSpinner.classList.add('hidden');
        btnText.textContent = 'Run Simulation';
    }
}

// Display results in table and chart
function displayResults(data, scenario) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsSummary = document.getElementById('resultsSummary');
    const tableBody = document.getElementById('resultsTableBody');
    
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Update summary
    const instanceInfo = data.instance || { id: scenario, nP: '?', nD: '?' };
    resultsSummary.textContent = `Instance: ${instanceInfo.id} | ${instanceInfo.nP} patients, ${instanceInfo.nD} doctors`;
    
    // Clear and populate table
    tableBody.innerHTML = '';
    
    const algorithmColors = {
        'Random': 'cyan',
        'Greedy': '#2ecc71',
        'DE': '#ff4d4d',
        'GA': '#2ecc71',
        'DGA': 'orange'
    };
    
    const chartDatasets = [];
    
    for (const [algo, result] of Object.entries(data.results)) {
        // Add table row
        const row = document.createElement('tr');
        
        // Greedy is deterministic (no std dev)
        const avgTF = result.avg !== undefined ? result.avg.toExponential(2) : 'N/A';
        const stdTF = result.std !== undefined ? result.std.toExponential(2) : 'N/A';
        const bestTF = result.best !== undefined ? result.best.toExponential(2) : avgTF;
        
        row.innerHTML = `
            <td><strong>${algo}</strong></td>
            <td>${avgTF}</td>
            <td>${algo === 'Greedy' ? '-' : stdTF}</td>
            <td>${bestTF}</td>
        `;
        tableBody.appendChild(row);
        
        // Prepare chart data (only for algorithms with history)
        if (result.history && result.history.length > 0) {
            chartDatasets.push({
                label: algo,
                data: result.history,
                borderColor: algorithmColors[algo] || '#666',
                backgroundColor: algorithmColors[algo] + '20' || '#66620',
                borderWidth: algo === 'DGA' ? 2 : 1.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                tension: 0.1
            });
        }
    }
    
    // Draw convergence chart
    drawConvergenceChart(chartDatasets);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Draw convergence chart using Chart.js
function drawConvergenceChart(datasets) {
    const ctx = document.getElementById('convergenceChart').getContext('2d');
    
    // Destroy existing chart if any
    if (convergenceChart) {
        convergenceChart.destroy();
    }
    
    // Create new chart
    convergenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datasets[0] ? Array.from({length: datasets[0].data.length}, (_, i) => i) : [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                title: {
                    display: true,
                    text: 'Convergence Curves - TF (Objective Function) over Generations',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Generation',
                        font: { size: 14, weight: 'bold' }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'TF (Standard Deviation of Doctor Times)',
                        font: { size: 14, weight: 'bold' }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Demo data for testing UI without backend
function showDemoResults(algorithms, generations, scenario) {
    // Parse scenario to get nP and nD
    const scenarioMap = {
        'T1': {nP: 100, nD: 10}, 'T2': {nP: 100, nD: 20}, 'T3': {nP: 100, nD: 30}, 'T4': {nP: 100, nD: 40},
        'T5': {nP: 200, nD: 10}, 'T6': {nP: 200, nD: 20}, 'T7': {nP: 200, nD: 30}, 'T8': {nP: 200, nD: 40},
        'T9': {nP: 300, nD: 10}, 'T10': {nP: 300, nD: 20}, 'T11': {nP: 300, nD: 30}, 'T12': {nP: 300, nD: 40},
        'T13': {nP: 400, nD: 10}, 'T14': {nP: 400, nD: 20}, 'T15': {nP: 400, nD: 30}, 'T16': {nP: 400, nD: 40}
    };
    
    const instance = scenarioMap[scenario] || {nP: 200, nD: 10};
    
    // Generate demo data
    const demoData = {
        instance: {
            id: scenario,
            nP: instance.nP,
            nD: instance.nD
        },
        results: {}
    };
    
    // Generate realistic demo values
    algorithms.forEach(algo => {
        let startValue, endValue, variance;
        
        switch(algo) {
            case 'Random':
                startValue = 50 + Math.random() * 20;
                endValue = 40 + Math.random() * 15;
                variance = 5;
                break;
            case 'Greedy':
                demoData.results[algo] = {
                    avg: 25 + Math.random() * 10,
                    best: 25 + Math.random() * 10
                };
                return;
            case 'DE':
                startValue = 45 + Math.random() * 10;
                endValue = 18 + Math.random() * 8;
                variance = 2;
                break;
            case 'GA':
                startValue = 48 + Math.random() * 10;
                endValue = 20 + Math.random() * 8;
                variance = 2.5;
                break;
            case 'DGA':
                startValue = 46 + Math.random() * 10;
                endValue = 12 + Math.random() * 6;
                variance = 1.5;
                break;
            default:
                startValue = 50;
                endValue = 25;
                variance = 3;
        }
        
        // Generate convergence curve
        const history = [];
        for (let i = 0; i <= generations; i++) {
            const progress = i / generations;
            const value = startValue - (startValue - endValue) * Math.pow(progress, 0.7) + (Math.random() - 0.5) * 2;
            history.push(Math.max(endValue * 0.8, value));
        }
        
        demoData.results[algo] = {
            avg: endValue,
            std: variance,
            best: endValue * 0.95,
            history: history
        };
    });
    
    displayResults(demoData, scenario);
}
