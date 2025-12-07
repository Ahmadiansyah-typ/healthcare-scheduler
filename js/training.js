// =====================================================
// Training Page JavaScript
// Handles simulation API calls and results visualization
// =====================================================

let convergenceChart = null;

// Toggle between predefined and custom scenario inputs
function toggleScenarioInputs() {
    const scenarioType = document.querySelector('input[name="scenarioType"]:checked').value;
    const predefinedContainer = document.getElementById('predefinedScenarioContainer');
    const customContainer = document.getElementById('customScenarioContainer');
    
    if (scenarioType === 'custom') {
        predefinedContainer.classList.add('hidden');
        customContainer.classList.remove('hidden');
    } else {
        predefinedContainer.classList.remove('hidden');
        customContainer.classList.add('hidden');
    }
}

// Toggle between single and batch run mode
function toggleRunMode() {
    const runMode = document.querySelector('input[name="runMode"]:checked').value;
    const scenarioGroup = document.getElementById('scenarioSelectionGroup');
    const batchScenarioGroup = document.getElementById('batchScenarioGroup');
    
    if (runMode === 'batch') {
        // Hide single scenario selection, show batch scenario selector
        scenarioGroup.classList.add('hidden');
        batchScenarioGroup.classList.remove('hidden');
    } else {
        // Show single scenario selection, hide batch scenario selector
        scenarioGroup.classList.remove('hidden');
        batchScenarioGroup.classList.add('hidden');
    }
}

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
        const runMode = document.querySelector('input[name="runMode"]:checked').value;
        
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
        
        // Check run mode
        if (runMode === 'batch') {
            // Batch mode - collect selected scenarios
            const selectedScenarios = Array.from(
                document.querySelectorAll('input[name="batchScenarios"]:checked')
            ).map(cb => cb.value);
            
            // Validate at least one scenario selected
            if (selectedScenarios.length === 0) {
                alert('Please select at least one test instance for batch mode');
                return;
            }
            
            // Run batch simulation
            runBatchSimulation(selectedAlgorithms, generations, runs, selectedScenarios);
        } else {
            // Single mode - check scenario type
            const scenarioType = document.querySelector('input[name="scenarioType"]:checked').value;
            let scenarioData;
            
            if (scenarioType === 'custom') {
                // Custom scenario
                const nP = parseInt(document.getElementById('customPatients').value);
                const nD = parseInt(document.getElementById('customDoctors').value);
                const complexity = document.getElementById('customComplexity').value;
                
                // Validate custom inputs
                if (nP < 10 || nP > 1000) {
                    alert('Number of patients must be between 10 and 1000');
                    return;
                }
                if (nD < 1 || nD > 100) {
                    alert('Number of doctors must be between 1 and 100');
                    return;
                }
                
                scenarioData = {
                    type: 'custom',
                    nP: nP,
                    nD: nD,
                    complexity: complexity
                };
            } else {
                // Predefined scenario
                scenarioData = {
                    type: 'predefined',
                    scenario: document.getElementById('scenario').value
                };
            }
            
            // Run single simulation
            runSimulation(selectedAlgorithms, generations, runs, scenarioData);
        }
    });
    
});

// Run simulation function
async function runSimulation(algorithms, generations, runs, scenarioData) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');
    const btnText = document.getElementById('btnText');
    
    // Show loading
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    btnText.textContent = 'Menghitung...';
    
    try {
        // Prepare request data based on scenario type
        const requestData = {
            algorithms: algorithms,
            generations: generations,
            runs: runs
        };
        
        if (scenarioData.type === 'custom') {
            // Custom scenario
            requestData.scenario = 'CUSTOM';
            requestData.nP = scenarioData.nP;
            requestData.nD = scenarioData.nD;
            
            // Map complexity to time range
            const complexityMap = {
                'low': [5, 10],
                'medium': [5, 20],
                'high': [10, 30]
            };
            requestData.time_range = complexityMap[scenarioData.complexity];
        } else {
            // Predefined scenario
            requestData.scenario = scenarioData.scenario;
        }
        
        // API call to Python backend
        const response = await fetch('http://localhost:5000/api/simulate', {
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
        displayResults(data, scenarioData);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Simulation error: ' + error.message + '\n\nNote: Make sure the Python backend server is running at /api/simulate endpoint.');
        
        // Show demo data instead (for testing UI without backend)
        console.log('Showing demo data for UI testing...');
        showDemoResults(algorithms, generations, scenarioData);
    } finally {
        // Hide loading
        loadingSpinner.classList.add('hidden');
        btnText.textContent = 'Mulai Simulasi';
    }
}

// Run batch simulation for multiple scenarios
async function runBatchSimulation(algorithms, generations, runs, scenarios) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsSection = document.getElementById('resultsSection');
    const batchResultsSection = document.getElementById('batchResultsSection');
    const btnText = document.getElementById('btnText');
    
    // Show loading
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    batchResultsSection.classList.add('hidden');
    btnText.textContent = 'Menghitung Batch...';
    
    try {
        // Prepare request data
        const requestData = {
            mode: 'batch',
            algorithms: algorithms,
            generations: generations,
            runs: runs,
            scenarios: scenarios
        };
        
        // API call to Python backend
        const response = await fetch('http://localhost:5000/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('Batch simulation failed: ' + response.statusText);
        }
        
        const data = await response.json();
        
        // Display batch results
        displayBatchResults(data, scenarios, algorithms);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Batch simulation error: ' + error.message + '\n\nNote: Make sure the Python backend server is running.');
    } finally {
        // Hide loading
        loadingSpinner.classList.add('hidden');
        btnText.textContent = 'Mulai Simulasi';
    }
}

// Display results in table and chart
function displayResults(data, scenarioData) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsSummary = document.getElementById('resultsSummary');
    const tableBody = document.getElementById('resultsTableBody');
    
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Update summary
    const instanceInfo = data.instance || { id: 'CUSTOM', nP: '?', nD: '?' };
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
                borderWidth: algo === 'DGA' ? 2.5 : 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.4,
                cubicInterpolationMode: 'monotone'
            });
        }
    }
    
    // Draw convergence chart
    drawConvergenceChart(chartDatasets);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Display batch results in comprehensive table
function displayBatchResults(data, scenarios, algorithms) {
    const batchResultsSection = document.getElementById('batchResultsSection');
    const batchSummary = document.getElementById('batchSummary');
    const tableBody = document.getElementById('batchResultsTableBody');
    
    // Show batch results section
    batchResultsSection.classList.remove('hidden');
    
    // Update summary
    batchSummary.textContent = `Batch simulation selesai untuk ${scenarios.length} test instance(s): ${scenarios.join(', ')}`;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // SCENARIOS map for nP and nD
    const SCENARIOS = {
        'T1': {nP: 100, nD: 10}, 'T2': {nP: 100, nD: 20}, 'T3': {nP: 100, nD: 30}, 'T4': {nP: 100, nD: 40},
        'T5': {nP: 200, nD: 10}, 'T6': {nP: 200, nD: 20}, 'T7': {nP: 200, nD: 30}, 'T8': {nP: 200, nD: 40},
        'T9': {nP: 300, nD: 10}, 'T10': {nP: 300, nD: 20}, 'T11': {nP: 300, nD: 30}, 'T12': {nP: 300, nD: 40},
        'T13': {nP: 400, nD: 10}, 'T14': {nP: 400, nD: 20}, 'T15': {nP: 400, nD: 30}, 'T16': {nP: 400, nD: 40}
    };
    
    // Populate table for each scenario
    for (const scenario of scenarios) {
        const row = document.createElement('tr');
        const scenarioData = data.results[scenario];
        const config = SCENARIOS[scenario];
        
        // Check if scenarioData exists
        if (!scenarioData) continue;
        
        let rowHTML = `<td><strong>${scenario}</strong></td>
                       <td>${config.nP}</td>
                       <td>${config.nD}</td>`;
        
        // Add algorithm results - backend returns scenarioData.results[algo]
        for (const algo of algorithms) {
            const result = scenarioData.results ? scenarioData.results[algo] : scenarioData[algo];
            if (result) {
                const avgVal = result.avg ? result.avg.toExponential(2) : 'N/A';
                const stdVal = result.std ? result.std.toExponential(2) : '0';
                rowHTML += `<td>${avgVal} ± ${stdVal}</td>`;
            } else {
                rowHTML += `<td>-</td>`;
            }
        }
        
        row.innerHTML = rowHTML;
        tableBody.appendChild(row);
    }
    
    // Display batch convergence chart if we have convergence data
    displayBatchConvergence(data);
    
    // Scroll to batch results
    batchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// Draw convergence chart using Chart.js
function drawConvergenceChart(datasets) {
    const ctx = document.getElementById('convergenceChart').getContext('2d');
    
    // Destroy existing chart if any
    if (convergenceChart) {
        convergenceChart.destroy();
    }
    
    // Create new chart with smooth animations
    convergenceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datasets[0] ? Array.from({length: datasets[0].data.length}, (_, i) => i) : [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.2,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Convergence Curves - Algorithm Performance Comparison',
                    font: { size: 16, weight: 'bold', family: 'Inter' },
                    color: '#333',
                    padding: { top: 10, bottom: 20 }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 13, family: 'Inter' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'line'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 13, family: 'Inter' },
                    bodyFont: { size: 12, family: 'Inter' },
                    padding: 12,
                    cornerRadius: 6,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Generation',
                        font: { size: 14, weight: 'bold', family: 'Inter' },
                        color: '#555'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.06)',
                        drawBorder: false
                    },
                    ticks: {
                        font: { size: 11, family: 'Inter' },
                        color: '#666'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'TF (Standard Deviation)',
                        font: { size: 14, weight: 'bold', family: 'Inter' },
                        color: '#555'
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.08)',
                        drawBorder: false
                    },
                    ticks: {
                        font: { size: 11, family: 'Inter' },
                        color: '#666'
                    },
                    beginAtZero: false
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                line: {
                    borderJoinStyle: 'round',
                    borderCapStyle: 'round'
                }
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

// Display batch convergence charts - one chart per scenario
function displayBatchConvergence(data) {
    const section = document.getElementById('batchConvergenceSection');
    const container = document.getElementById('batchConvergenceContainer');
    
    if (!section || !container) return;
    
    // Check if we have any convergence data
    let hasConvergence = false;
    const scenariosWithConvergence = [];
    
    for (const [scenario, scenarioData] of Object.entries(data.results)) {
        if (scenarioData.convergence && Object.keys(scenarioData.convergence).length > 0) {
            hasConvergence = true;
            scenariosWithConvergence.push(scenario);
        }
    }
    
    // If no convergence data, hide section and return
    if (!hasConvergence) {
        section.classList.add('hidden');
        return;
    }
    
    // Show section
    section.classList.remove('hidden');
    
    // Clear container
    container.innerHTML = '';
    
    // Destroy existing charts
    if (window.batchConvergenceCharts) {
        window.batchConvergenceCharts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
    window.batchConvergenceCharts = [];
    
    // Algorithm colors
    const algorithmColors = {
        'Random': 'cyan',
        'Greedy': '#2ecc71',
        'DE': '#ff4d4d',
        'GA': '#2ecc71',
        'DGA': 'orange'
    };
    
    // Create a chart for each scenario
    scenariosWithConvergence.forEach(scenario => {
        const scenarioData = data.results[scenario];
        const convergence = scenarioData.convergence;
        
        // Create chart wrapper
        const chartWrapper = document.createElement('div');
        chartWrapper.style.cssText = 'border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: white;';
        
        // Create title
        const title = document.createElement('h4');
        title.textContent = `${scenario} (${scenarioData.nP}P × ${scenarioData.nD}D)`;
        title.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-align: center; color: #333;';
        chartWrapper.appendChild(title);
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = `convergence-${scenario}`;
        chartWrapper.appendChild(canvas);
        
        container.appendChild(chartWrapper);
        
        // Prepare datasets for this scenario
        const datasets = [];
        
        for (const [algo, history] of Object.entries(convergence)) {
            if (history && history.length > 0) {
                datasets.push({
                    label: algo,
                    data: history,
                    borderColor: algorithmColors[algo] || '#666',
                    backgroundColor: 'transparent',
                    borderWidth: algo === 'DGA' ? 2.5 : 2,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
            }
        }
        
        // Create chart
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datasets[0] ? Array.from({ length: datasets[0].data.length }, (_, i) => i) : [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.4,
                animation: {
                    duration: 800
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 10 },
                            padding: 8,
                            boxWidth: 20,
                            usePointStyle: true
                        }
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 11 },
                        bodyFont: { size: 10 },
                        padding: 8,
                        cornerRadius: 4
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Generations',
                            font: { size: 11, weight: 'bold' }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: { size: 9 },
                            maxTicksLimit: 6
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'TF',
                            font: { size: 11, weight: 'bold' }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: { size: 9 }
                        },
                        beginAtZero: false
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        
        window.batchConvergenceCharts.push(chart);
    });
}

