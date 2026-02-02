/**
 * Rocket Sled Main Application Controller
 * Handles UI events and connects physics engine with visualization
 */

// UI Elements
let thrustLeftBtn, thrustOffBtn, thrustRightBtn;
let frictionToggle, airDragToggle;
let forceSlider, forceValueDisplay;
let resetBtn;
let speedDisplay, speedBarFill;
let forceArrowsBtn, gridBtn;

// Animation state
let isRunning = true;
let lastTime = 0;

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupEventListeners();
    checkEmbedMode();

    // Start the physics loop
    lastTime = performance.now();
    requestAnimationFrame(physicsLoop);

    console.log('🚀 Rocket Sled Simulation initialized');
});

/**
 * Initialize UI element references
 */
function initializeUI() {
    // Thrust buttons
    thrustLeftBtn = document.getElementById('thrustLeft');
    thrustOffBtn = document.getElementById('thrustOff');
    thrustRightBtn = document.getElementById('thrustRight');

    // Toggles
    frictionToggle = document.getElementById('frictionToggle');
    airDragToggle = document.getElementById('airDragToggle');

    // Control buttons
    resetBtn = document.getElementById('resetBtn');

    // Force slider
    forceSlider = document.getElementById('forceSlider');
    forceValueDisplay = document.getElementById('forceValue');

    // Display elements
    speedDisplay = document.getElementById('speedDisplay');
    speedBarFill = document.getElementById('speedBarFill');

    // Visualization buttons
    forceArrowsBtn = document.getElementById('forceArrowsBtn');
    gridBtn = document.getElementById('gridBtn');

    // Legend indicators
    updateLegend();
}

/**
 * Set up event listeners for all controls
 */
function setupEventListeners() {
    // Thrust buttons
    thrustLeftBtn?.addEventListener('click', () => setThrust(-1));
    thrustOffBtn?.addEventListener('click', () => setThrust(0));
    thrustRightBtn?.addEventListener('click', () => setThrust(1));

    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Toggles
    frictionToggle?.addEventListener('change', (e) => {
        setFrictionEnabled(e.target.checked);
        updateLegend();
    });

    airDragToggle?.addEventListener('change', (e) => {
        setAirDragEnabled(e.target.checked);
        updateLegend();
    });

    // Reset button
    resetBtn?.addEventListener('click', handleReset);

    // Visualization toggles
    forceArrowsBtn?.addEventListener('click', () => {
        forceArrowsBtn.classList.toggle('active');
        toggleForceArrows(forceArrowsBtn.classList.contains('active'));
    });

    gridBtn?.addEventListener('click', () => {
        gridBtn.classList.toggle('active');
        toggleGrid(gridBtn.classList.contains('active'));
    });

    // Force slider
    forceSlider?.addEventListener('input', (e) => {
        const force = parseInt(e.target.value, 10);
        setAppliedForceMagnitude(force);
        if (forceValueDisplay) {
            forceValueDisplay.textContent = `${force} N`;
        }
    });
}

/**
 * Handle keyboard controls
 */
function handleKeyDown(e) {
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            setThrust(-1);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            setThrust(1);
            break;
        case ' ':
            setThrust(0);
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            handleReset();
            break;
    }
}

function handleKeyUp(e) {
    // Optional: Stop thrust when key is released
    // Uncomment if you want tap-to-thrust behavior
    // if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
    //     setThrust(0);
    // }
}

/**
 * Set thrust direction and update UI
 */
function setThrust(direction) {
    setThrustDirection(direction);
    updateThrustButtons(direction);
}

/**
 * Update thrust button active states
 */
function updateThrustButtons(direction) {
    thrustLeftBtn?.classList.remove('active');
    thrustOffBtn?.classList.remove('active');
    thrustRightBtn?.classList.remove('active');

    if (direction < 0) {
        thrustLeftBtn?.classList.add('active');
    } else if (direction > 0) {
        thrustRightBtn?.classList.add('active');
    } else {
        thrustOffBtn?.classList.add('active');
    }
}

/**
 * Handle reset button click
 */
function handleReset() {
    resetPhysics();
    setThrust(0);
    updateSpeedDisplay();
}

/**
 * Physics update loop (separate from p5.js draw loop)
 */
function physicsLoop(currentTime) {
    if (!isRunning) {
        requestAnimationFrame(physicsLoop);
        return;
    }

    // Calculate delta time in seconds
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // Cap at 50ms
    lastTime = currentTime;

    // Update physics
    updatePhysics(dt);

    // Update UI displays
    updateSpeedDisplay();

    // Continue loop
    requestAnimationFrame(physicsLoop);
}

/**
 * Update the speedometer display
 */
function updateSpeedDisplay() {
    const state = getPhysicsState();
    const speed = Math.abs(state.velocity);

    // Update numeric display
    if (speedDisplay) {
        speedDisplay.innerHTML = `${speed.toFixed(1)}<span class="unit">m/s</span>`;
    }

    // Update bar
    const percentage = getSpeedPercentage();
    if (speedBarFill) {
        speedBarFill.style.width = `${percentage}%`;

        // Red zone styling
        if (isInRedZone()) {
            speedBarFill.classList.add('red-zone');
        } else {
            speedBarFill.classList.remove('red-zone');
        }
    }
}

/**
 * Update the force legend based on active forces
 */
function updateLegend() {
    const frictionItem = document.getElementById('legendFriction');
    const airItem = document.getElementById('legendAir');

    if (frictionItem) {
        if (frictionToggle?.checked) {
            frictionItem.classList.remove('inactive');
        } else {
            frictionItem.classList.add('inactive');
        }
    }

    if (airItem) {
        if (airDragToggle?.checked) {
            airItem.classList.remove('inactive');
        } else {
            airItem.classList.add('inactive');
        }
    }
}

/**
 * Check for embed mode (LMS integration)
 */
function checkEmbedMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('embed') === '1') {
        document.body.classList.add('embed');
    }
}

/**
 * Pause/resume simulation
 */
function toggleSimulation() {
    isRunning = !isRunning;
    if (isRunning) {
        lastTime = performance.now();
    }
}
