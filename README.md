# Rocket Sled - Newton's Laws Simulation

An interactive physics simulation demonstrating Newton's Laws using a rocket sled. Students explore applied thrust, friction, air drag, inertia, and their effects on motion.

Part of **"The Thinking Experiment"** (PhysicsKit) curriculum collection.

[![Live Simulation](https://img.shields.io/badge/Live_Simulation-GitHub_Pages-0f7e9b?style=for-the-badge)](https://thinking-experiment-sims.github.io/rocket-sled-simulation/)
[![Physics Theory Guide](https://img.shields.io/badge/Physics_Guide-Deep_Theory-d67b19?style=for-the-badge)](./PHYSICS.md)
[![Simulation Hub](https://img.shields.io/badge/Simulation_Hub-The_Thinking_Experiment-123140?style=for-the-badge)](https://thinking-experiment-sims.github.io/interactive-physics/)

---

## 🎯 Educational Overview

This simulation supports the **RocketSledder** inquiry curriculum, allowing students to explore:
1. **Newton's First Law (Inertia):** What occurs when horizontal thrust is shut off on a frictionless track ($F_{\text{net}} = 0 \implies v = \text{const}$).
2. **Newton's Second Law ($\vec{F}_{\text{net}} = m \vec{a}$):** How varying applied rocket thrust changes instantaneous acceleration.
3. **Deceleration & Direction Reversal:** Why reversing thrusters decelerates the vehicle to rest before reversing its spatial velocity.
4. **Resistive Force Dynamics:** Observing how surface friction and quadratic air resistance always oppose the direction of motion ($-\text{sgn}(v)$).

For full mathematical derivations, free-body diagram equations, terminal velocity formulas, and worked examples, see [PHYSICS.md](./PHYSICS.md).

---

## 🌟 Key Features

- **Applied Force Control**: Left/right thrust buttons with keyboard support (Arrow keys, A/D, Space to cut thrust).
- **Surface Friction Toggle**: Enable/disable surface friction with dynamic vector readout.
- **Air Drag Toggle**: Enable/disable quadratic air resistance to observe terminal velocity.
- **Real-Time Force Vector Diagram**: Dynamic arrows showing $F_{\text{app}}$, $F_{\text{norm}}$, $F_{\text{grav}}$, $F_{\text{frict}}$, and $F_{\text{air}}$.
- **Analog & Digital Speedometer**: Visual speedometer with redline zone indicator.
- **Canvas LMS Ready**: Embed mode support with clean container layout.

---

## 🎨 Design System Compliance

This simulation adheres strictly to **The Thinking Experiment** brand standards:
- **Teal Headers / Primary:** `#0f7e9b` / `#095f76`
- **Amber Accents / Highlights:** `#d67b19`
- **Background:** Pure White (`#ffffff`) with Blueprint Grid (`#e9f4fb`)
- **Typography:** Sans-serif (`Inter`, `IBM Plex Sans`)
- **Prohibited:** No Purple (`#59118e`) or Gold (`#ffc61e`)

---

## 🎮 Keyboard Controls

| Key | Action |
|:---|:---|
| `←` / `A` | Apply leftward thrust |
| `→` / `D` | Apply rightward thrust |
| `Space` | Turn off rocket thrust (coast) |
| `R` | Reset simulation to origin |

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/Thinking-Experiment-Sims/rocket-sled-simulation.git
cd rocket-sled-simulation

# Start local server
python3 -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your web browser.

---

## 📱 Embedding in Canvas LMS

```html
<iframe 
  src="https://thinking-experiment-sims.github.io/rocket-sled-simulation/" 
  width="100%" 
  height="750" 
  style="border: 1px solid #c8dbe3; border-radius: 8px;"
  loading="lazy"
  allowfullscreen>
</iframe>
```

---

## 📁 Repository Structure

```
rocket-sled-simulation/
├── index.html              # Main HTML user interface
├── styles.css              # The Thinking Experiment styling
├── RocketSledder.pdf       # Student inquiry handout
├── src/
│   └── js/
│       ├── main.js         # Application controller and keyboard input
│       ├── physics.js      # Newton's Laws and resistive forces calculations
│       └── visualization.js# Canvas rendering and vector overlays
├── PHYSICS.md              # Comprehensive theoretical physics guide
└── README.md               # Project documentation
```

---

## 📄 License & Attribution

Authored by **Vladimir Lopez** for **The Thinking Experiment (PhysicsKit)**.  
Open-source under the MIT License for educational use in physics classrooms worldwide.
