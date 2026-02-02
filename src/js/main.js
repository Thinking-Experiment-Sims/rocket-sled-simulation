/**
 * Rocket Sled Main Application Controller
 * Handles UI events and connects physics engine with visualization
 */

// UI Elements
let directionSlider, forceValueDisplay;
let maxForceSlider, maxForceValueDisplay;
let frictionToggle, airDragToggle;
let resetBtn;
let forceArrowsBtn, gridBtn;

// Force value displays
let appliedForceValueEl, frictionForceValueEl, airDragForceValueEl, netForceValueEl;

// Velocimeter elements
let velocimeterNeedle, velocityDisplay;

// Animation state
let isRunning = true;
let lastTime = 0;

// Current max force setting
let maxForce = 2000;

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
    // Direction slider (combines direction and intensity)
    directionSlider = document.getElementById('directionSlider');
    forceValueDisplay = document.getElementById('forceValue');

    // Max force slider
    maxForceSlider = document.getElementById('maxForceSlider');
    maxForceValueDisplay = document.getElementById('maxForceValue');

    // Toggles
    frictionToggle = document.getElementById('frictionToggle');
    airDragToggle = document.getElementById('airDragToggle');

    // Control buttons
    resetBtn = document.getElementById('resetBtn');

    // Force value displays
    appliedForceValueEl = document.getElementById('appliedForceValue');
    frictionForceValueEl = document.getElementById('frictionForceValue');
    airDragForceValueEl = document.getElementById('airDragForceValue');
    netForceValueEl = document.getElementById('netForceValue');

    // Velocimeter
    velocimeterNeedle = document.getElementById('velocimeterNeedle');
    velocityDisplay = document.getElementById('velocityDisplay');

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
    // Direction slider (controls both direction and intensity)
    directionSlider?.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        updateForceFromSlider(value);
    });

    // Max force slider
    maxForceSlider?.addEventListener('input', (e) => {
        maxForce = parseInt(e.target.value, 10);
        if (maxForceValueDisplay) {
            maxForceValueDisplay.textContent = `${maxForce} N`;
        }
        // Update applied force with new max
        if (directionSlider) {
            updateForceFromSlider(parseInt(directionSlider.value, 10));
        }
    });

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
}

/**
 * Update force from direction slider value (-100 to 100)
 */
function updateForceFromSlider(sliderValue) {
    // Calculate actual force: percentage of max force * direction
    const percentage = sliderValue / 100;
    const actualForce = Math.round(percentage * maxForce);

    // Update physics engine
    if (sliderValue > 0) {
        setThrustDirection(1);
        setAppliedForceMagnitude(Math.abs(actualForce));
    } else if (sliderValue < 0) {
        setThrustDirection(-1);
        setAppliedForceMagnitude(Math.abs(actualForce));
    } else {
        setThrustDirection(0);
        setAppliedForceMagnitude(0);
    }

    // Update display
    if (forceValueDisplay) {
        forceValueDisplay.textContent = `${actualForce} N`;
    }
}

/**
 * Handle keyboard controls
 */
function handleKeyDown(e) {
    if (!directionSlider) return;

    const step = 10;
    let currentValue = parseInt(directionSlider.value, 10);

    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            currentValue = Math.max(-100, currentValue - step);
            directionSlider.value = currentValue;
            updateForceFromSlider(currentValue);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            currentValue = Math.min(100, currentValue + step);
            directionSlider.value = currentValue;
            updateForceFromSlider(currentValue);
            break;
        case ' ':
            directionSlider.value = 0;
            updateForceFromSlider(0);
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            handleReset();
            break;
    }
}

function handleKeyUp(e) {
    // No action needed for key up
}

/**
 * Handle reset button click
 */
function handleReset() {
    resetPhysics();
    if (directionSlider) {
        directionSlider.value = 0;
    }
    updateForceFromSlider(0);
    updateDisplays();
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
    updateDisplays();

    // Continue loop
    requestAnimationFrame(physicsLoop);
}

/**
 * Update all display elements
 */
function updateDisplays() {
    const state = getPhysicsState();

    // Update force values
    if (appliedForceValueEl) {
        appliedForceValueEl.textContent = `${state.appliedForce.toFixed(0)} N`;
    }
    if (frictionForceValueEl) {
        frictionForceValueEl.textContent = `${state.frictionForce.toFixed(0)} N`;
    }
    if (airDragForceValueEl) {
        airDragForceValueEl.textContent = `${state.airDragForce.toFixed(0)} N`;
    }
    if (netForceValueEl) {
        netForceValueEl.textContent = `${state.netForce.toFixed(0)} N`;
    }

    // Update velocimeter
    const velocity = state.velocity;
    const maxVelocity = 50;

    if (velocityDisplay) {
        velocityDisplay.innerHTML = `${velocity.toFixed(1)} <span class="unit">m/s</span>`;
    }

    if (velocimeterNeedle) {
        // Needle rotation: -90deg (left max) to +90deg (right max)
        const rotation = (velocity / maxVelocity) * 90;
        const clampedRotation = Math.max(-90, Math.min(90, rotation));
        velocimeterNeedle.style.transform = `translateX(-50%) rotate(${clampedRotation}deg)`;
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
