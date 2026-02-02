# Rocket Sled - Newton's Laws Simulation

[![Live Demo](https://img.shields.io/badge/Live-Demo-2780e3?logo=githubpages&logoColor=white)](https://vladimirlopez.github.io/rocket-sled-simulation/)

An interactive physics simulation demonstrating Newton's Laws using a rocket sled. Students explore force, friction, air drag, and their effects on motion.

## 🎯 Features

- **Applied Force Control**: Left/right thrust buttons with keyboard support (Arrow keys, A/D)
- **Friction Toggle**: Enable/disable surface friction with visual feedback
- **Air Drag Toggle**: Enable/disable air resistance with visual feedback  
- **Real-Time Force Diagram**: Dynamic arrows showing Fapp, Fnorm, Fgrav, Ffrict, and Fair
- **Speedometer**: Visual velocity display with "red zone" indicator
- **Canvas LMS Ready**: Embed mode support with `?embed=1` parameter

## 🚀 Quick Start

1. Open `index.html` in a modern web browser, or
2. Run a local server:
   ```bash
   npx http-server . -p 8080
   ```
3. Visit `http://localhost:8080`

## 📚 Educational Use

This simulation supports the **RocketSledder** student handout, covering:

1. Effect of applied force on velocity (with friction off)
2. Motion without horizontal forces (inertia/coasting)
3. Stopping a moving sled (reversing force)
4. Force diagrams for multiple scenarios
5. Resistance force behavior (friction & air drag direction)
6. Inertia demonstration (thrust reversal doesn't instantly reverse direction)

## 📱 Embed in Canvas LMS

```html
<iframe
    src="https://vladimirlopez.github.io/rocket-sled-simulation/index.html?embed=1"
    width="100%"
    height="700"
    style="border:0;"
    loading="lazy"
    allowfullscreen
></iframe>
```

## 🎮 Keyboard Controls

| Key | Action |
|-----|--------|
| ← / A | Apply leftward force |
| → / D | Apply rightward force |
| Space | Turn off thrust |
| R | Reset simulation |

## 📁 File Structure

```
Rocket Sled/
├── index.html              # Main HTML file
├── README.md               # This file
├── LICENSE                 # MIT License
├── RocketSledder.pdf       # Student handout
├── .nojekyll               # GitHub Pages configuration
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions deployment
└── src/
    ├── css/
    │   └── app.css         # Styling
    └── js/
        ├── physics.js      # Newton's Laws calculations
        ├── visualization.js # p5.js rendering
        └── main.js         # Application controller
```

## 🚀 Deployment

This site is automatically deployed to GitHub Pages via GitHub Actions.

### Automatic Deployment

- **Trigger**: Every push to the `main` branch
- **Workflow**: `.github/workflows/deploy.yml`
- **URL**: https://vladimirlopez.github.io/rocket-sled-simulation/

### Manual Deployment

You can manually trigger a deployment from the GitHub Actions tab by running the "Deploy to GitHub Pages" workflow.

### Requirements

- GitHub Pages must be enabled in repository settings
- Pages source should be set to "GitHub Actions"

## 📄 License

MIT License - Copyright (c) 2025 Vladimir Lopez

## 🙏 Acknowledgments

- Inspired by [The Physics Classroom](https://www.physicsclassroom.com/) Rocket Sled Interactive
- Visualization powered by [p5.js](https://p5js.org/)
- Design patterns from the Projectile Motion Simulator
