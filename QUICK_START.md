# 🚀 Quick Start Guide

## ✅ Prerequisites

- Python 3.11+
- Modern web browser (Chrome, Edge, Firefox)
- Flask and Flask-CORS installed

## 📦 Installation

1. **Install Python dependencies:**

```bash
pip install flask flask-cors numpy matplotlib pandas
```

## 🎯 Running the Application

### Step 1: Start Backend Server

```bash
cd "d:\Semester 3\TugasKel_SC"
python app.py
```

**You should see:**

```
============================================================
Healthcare Scheduler Backend Server
============================================================
Server running at: http://localhost:5000
API endpoint: http://localhost:5000/api/simulate
============================================================
```

**⚠️ Keep this window open!** The server must be running for simulations to work.

### Step 2: Open Website

- Double-click `index.html`
- Or drag `index.html` to your browser

### Step 3: Run Simulations

1. Navigate to **Training** page
2. Select algorithms (DE, GA, DGA, etc.)
3. Set parameters:
   - **For quick testing**: 20 generations, 1 run, T1 scenario
   - **For research**: 100 generations, 5-10 runs, any scenario
4. Click **Run Simulation**
5. Wait for results (5 seconds - 5 minutes depending on parameters)

## 🧪 Testing Workflow

**Quick Test (5-10 seconds):**

- Algorithms: GA, DGA
- Generations: 20
- Runs: 1
- Scenario: T1

**Full Test (2-5 minutes):**

- Algorithms: All 5
- Generations: 100
- Runs: 5
- Scenario: T5 or T10

## 📁 Project Structure

```
TugasKel_SC/
├── index.html          # Home page
├── about.html          # Algorithm details
├── training.html       # Simulation interface
├── reference.html      # Citations
├── main.py            # Optimization algorithms
├── app.py             # Flask backend server
├── css/
│   └── halodoc-theme.css
├── js/
│   ├── main.js        # Navigation & search
│   └── training.js    # Simulation & charts
├── .gitignore
└── README.md
```

## 🔧 Common Issues

### "Simulation error" Message

**Problem:** Backend not running
**Solution:** Make sure `python app.py` is running in a separate terminal

### Slow Results

**Problem:** Large parameters (400 patients, 100 generations, 10 runs)
**Solution:** Use smaller parameters for testing (T1, 20 generations, 1 run)

### Port Already in Use

**Problem:** Port 5000 is occupied
**Solution:**

1. Kill the process using port 5000, or
2. Change port in `app.py` line 203: `app.run(port=5001)`
3. Update `training.js` line 42: `http://localhost:5001/api/simulate`

## 🌐 Deploying Online (Optional)

See `DEPLOYMENT_GUIDE.md` in the artifacts folder for GitHub Pages deployment instructions.

## 📝 Notes

- **Search functionality**: Type in navbar search and press Enter
- **Mobile responsive**: Works on all devices
- **Demo mode**: Falls back to demo data if backend unavailable
- **Real results**: Requires backend server running

## 💡 Tips

1. **Start with small parameters** to verify everything works
2. **Keep terminal visible** to see backend logs
3. **Use F12 Developer Console** to debug any issues
4. **Greedy is fastest** (no iterations needed)
5. **DGA takes longest** (4 sub-populations)

---

**Need help?** Check the browser console (F12) for error messages or server terminal for backend logs.
