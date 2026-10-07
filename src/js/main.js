/**
 * Rocket Sled Main Application Controller
 * Handles UI events and connects physics engine with visualization
 */

// UI Elements
let directionSlider, forceValueDisplay;
let maxForceSlider, maxForceValueDisplay;
let frictionToggle, airDragToggle;
let frictionSlider, frictionCoeffDisplay; // New
let resetBtn;
let forceArrowsBtn, gridBtn;

// Force value displays
let appliedForceValueEl, frictionForceValueEl, airDragForceValueEl, netForceValueEl;

// Velocimeter elements
let velocimeterNeedle, velocityDisplay, velocimeterGauge;

// Animation state
let isRunning = true;
let lastTime = 0;

// Quiz tracking and multi-pilot easter egg (Brownie, Coco, Penguin)
let quizScore = 0;
let easterEggUnlocked = false;
let currentPilot = 'brownie'; // 'brownie' | 'coco' | 'penguin'

try {
    easterEggUnlocked = localStorage.getItem('rocket_sled_easter_egg_unlocked') === 'true' ||
                        localStorage.getItem('rocket_sled_coco_unlocked') === 'true';
    const savedPilot = localStorage.getItem('rocket_sled_pilot');
    if (savedPilot && ['brownie', 'coco', 'penguin'].includes(savedPilot)) {
        currentPilot = savedPilot;
    }
} catch (e) {
    easterEggUnlocked = false;
    currentPilot = 'brownie';
}

// Current max force setting
let maxForce = 2000;

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    setupEventListeners();
    checkEmbedMode();
    setupModals();
    setupPilotMenu();
    updatePilotUI();

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
    velocimeterGauge = document.querySelector('.velocimeter-gauge-mini');

    // Friction slider
    frictionSlider = document.getElementById('frictionSlider');
    frictionCoeffDisplay = document.getElementById('frictionCoeffValue');

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

    // Toggles - with debug logging
    frictionToggle?.addEventListener('change', (e) => {
        console.log('Friction toggle changed:', e.target.checked);
        setFrictionEnabled(e.target.checked);
        updateLegend();
    });

    airDragToggle?.addEventListener('change', (e) => {
        console.log('Air drag toggle changed:', e.target.checked);
        setAirDragEnabled(e.target.checked);
        updateLegend();
    });

    // Reset button with debug
    resetBtn?.addEventListener('click', () => {
        console.log('Reset button clicked');
        handleReset();
    });

    // Visualization toggles
    forceArrowsBtn?.addEventListener('click', () => {
        forceArrowsBtn.classList.toggle('active');
        toggleForceArrows(forceArrowsBtn.classList.contains('active'));
    });

    gridBtn?.addEventListener('click', () => {
        gridBtn.classList.toggle('active');
        toggleGrid(gridBtn.classList.contains('active'));
    });

    // Worksheet scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = btn.dataset.scenario;
            console.log('Loading scenario:', scenario);
            loadScenario(scenario);

            // Update active state
            document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Friction Slider input
    frictionSlider?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (frictionCoeffDisplay) {
            frictionCoeffDisplay.textContent = val.toFixed(2);
        }
        setFrictionCoefficient(val);
        // Auto-enable friction toggle if slider > 0
        if (val > 0 && frictionToggle && !frictionToggle.checked) {
            frictionToggle.checked = true;
            setFrictionEnabled(true);
            updateLegend();
        }
    });

    // Zero Force / Cut Engines Button
    const cutEnginesBtn = document.getElementById('cutEnginesBtn');
    cutEnginesBtn?.addEventListener('click', () => {
        if (directionSlider) {
            directionSlider.value = 0;
            updateForceFromSlider(0);
        }
    });

    // Dropdown Menu Toggle
    const menuBtn = document.getElementById('menuBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu?.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== menuBtn) {
            dropdownMenu.classList.remove('show');
        }
    });

    // Close dropdown when clicking menu items
    document.querySelectorAll('.scenario-btn').forEach(item => {
        item.addEventListener('click', () => {
            dropdownMenu?.classList.remove('show');
        });
    });

    // Pilot Menu is initialized in setupPilotMenu()
}

/**
 * Update force from direction slider value (-100 to 100)
 */
function updateForceFromSlider(sliderValue) {
    // Calculate actual force: percentage of max force * direction
    const percentage = sliderValue / 1000;
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
        case 'c':
        case 'C':
        case 'b':
        case 'B':
            // Teacher shortcut to toggle/cycle secret easter egg pilots
            easterEggUnlocked = true;
            try { localStorage.setItem('rocket_sled_easter_egg_unlocked', 'true'); } catch (err) {}
            cyclePilot();
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
    console.log('Resetting simulation...');
    resetPhysics();
    if (directionSlider) {
        directionSlider.value = 0;
    }
    updateForceFromSlider(0);

    // Reset toggles to unchecked state
    if (frictionToggle) {
        frictionToggle.checked = false;
        setFrictionEnabled(false);
    }
    if (airDragToggle) {
        airDragToggle.checked = false;
        setAirDragEnabled(false);
    }

    // Clear scenario selection
    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));

    updateLegend();
    updateDisplays();
    console.log('Reset complete');
}

/**
 * Load a preset worksheet scenario
 */
function loadScenario(scenario) {
    // First reset everything
    resetPhysics();
    if (directionSlider) directionSlider.value = 0;

    // Configure based on scenario
    switch (scenario) {
        case 'no-forces':
            // Pure Newton's 1st Law - no resistance
            setFrictionEnabled(false);
            setAirDragEnabled(false);
            if (frictionToggle) frictionToggle.checked = false;
            if (airDragToggle) airDragToggle.checked = false;
            break;

        case 'friction-only':
            // Study friction without air drag
            setFrictionEnabled(true);
            setAirDragEnabled(false);
            if (frictionToggle) frictionToggle.checked = true;
            if (airDragToggle) airDragToggle.checked = false;
            break;

        case 'air-only':
            // Study air drag (velocity dependent)
            setFrictionEnabled(false);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = false;
            if (airDragToggle) airDragToggle.checked = true;
            break;

        case 'all-forces':
            // Realistic scenario with all forces
            setFrictionEnabled(true);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = true;
            if (airDragToggle) airDragToggle.checked = true;
            break;

        case 'terminal-velocity':
            // Start with air drag to observe terminal velocity
            setFrictionEnabled(false);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = false;
            if (airDragToggle) airDragToggle.checked = true;
            // Apply thrust to demonstrate terminal velocity (80% -> 800)
            if (directionSlider) {
                directionSlider.value = 800;
                updateForceFromSlider(800);
            }
            break;

        case 'equilibrium':
            // Set up for balanced forces discussion
            setFrictionEnabled(true);
            setAirDragEnabled(true);
            if (frictionToggle) frictionToggle.checked = true;
            if (airDragToggle) airDragToggle.checked = true;
            // Medium thrust (Set to 375, which corresponds to 750N = Friction Force)
            if (directionSlider) {
                directionSlider.value = 375;
                updateForceFromSlider(375);
            }
            break;
    }

    updateLegend();
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

        // Red Zone Alert (> 48 m/s)
        if (Math.abs(velocity) > 48) {
            velocimeterGauge?.classList.add('danger');
        } else {
            velocimeterGauge?.classList.remove('danger');
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

/**
 * Initialize Modals and Quiz
 */
function setupModals() {
    const helpBtn = document.getElementById('helpBtn');
    const quizBtn = document.getElementById('quizBtn');
    const helpModal = document.getElementById('helpModal');
    const quizModal = document.getElementById('quizModal');
    const closeBtns = document.querySelectorAll('.close-modal');

    // Open Help
    helpBtn?.addEventListener('click', () => {
        openModal(helpModal);
    });

    // Open Quiz
    quizBtn?.addEventListener('click', () => {
        resetQuiz();
        openModal(quizModal);
    });

    // Close Modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(helpModal);
            closeModal(quizModal);
        });
    });

    // Click outside to close
    window.addEventListener('click', (e) => {
        if (e.target === helpModal) closeModal(helpModal);
        if (e.target === quizModal) closeModal(quizModal);
    });
}

function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'block';
    // Small delay to allow CSS transition
    setTimeout(() => modal.classList.add('show'), 10);
    // Pause simulation when modal is open
    isRunning = false;
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        // Resume simulation
        isRunning = true;
        lastTime = performance.now();
    }, 300);
}

// --- Quiz Logic ---

function resetQuiz() {
    // Reset quiz score
    quizScore = 0;

    // Hide any previous result summary
    const resultView = document.getElementById('quizResultView');
    if (resultView) {
        resultView.style.display = 'none';
    }

    // Reset all questions to initial state
    document.querySelectorAll('.quiz-question').forEach(q => {
        q.classList.remove('active');
        const feedback = q.querySelector('.feedback');
        if (feedback) feedback.innerHTML = '';
        const nextBtn = q.querySelector('.next-btn');
        if (nextBtn) nextBtn.classList.add('hidden');
        q.querySelectorAll('.quiz-opt').forEach(opt => {
            opt.classList.remove('correct', 'incorrect');
            opt.style.pointerEvents = 'auto'; // Re-enable clicks
        });
    });
    // Show first question
    document.querySelector('.quiz-question[data-q="1"]')?.classList.add('active');
}

// Make these global so HTML onclick works
window.checkAnswer = function (btn, isCorrect) {
    const parent = btn.closest('.quiz-question');
    const feedback = parent.querySelector('.feedback');
    const nextBtn = parent.querySelector('.next-btn');

    // Track score
    if (isCorrect) {
        quizScore++;
    }

    // Disable all options in this question
    parent.querySelectorAll('.quiz-opt').forEach(opt => {
        opt.style.pointerEvents = 'none';
        if (opt === btn) {
            if (isCorrect) {
                opt.classList.add('correct');
                feedback.innerHTML = '<span style="color: #2e7d32">✅ Correct!</span>';
            } else {
                opt.classList.add('incorrect');
                feedback.innerHTML = '<span style="color: #c62828">❌ Incorrect. Review Newton\'s Laws and try again!</span>';
            }
        }
    });

    // Always show next button regardless of right/wrong (educational flow)
    nextBtn.classList.remove('hidden');
};

window.nextQuestion = function (currentId) {
    const current = document.querySelector(`.quiz-question[data-q="${currentId}"]`);
    const next = document.querySelector(`.quiz-question[data-q="${currentId + 1}"]`);

    if (current && next) {
        current.classList.remove('active');
        next.classList.add('active');
    }
};

window.closeQuiz = function () {
    const quizModal = document.getElementById('quizModal');
    if (quizScore === 3) {
        easterEggUnlocked = true;
        try {
            localStorage.setItem('rocket_sled_easter_egg_unlocked', 'true');
        } catch (e) {}
        updatePilotUI();
        closeModal(quizModal);
        showEasterEggModal();
    } else {
        showQuizScoreFeedback(quizScore);
    }
};

// Show score feedback view when quiz finishes without a perfect score
function showQuizScoreFeedback(score) {
    const quizContainer = document.getElementById('quizContainer');
    if (!quizContainer) {
        closeModal(document.getElementById('quizModal'));
        return;
    }

    let resultView = document.getElementById('quizResultView');
    if (!resultView) {
        resultView = document.createElement('div');
        resultView.id = 'quizResultView';
        resultView.className = 'quiz-result-view';
        quizContainer.appendChild(resultView);
    }

    document.querySelectorAll('.quiz-question').forEach(q => q.classList.remove('active'));
    resultView.style.display = 'block';
    resultView.innerHTML = `
        <div style="text-align: center; padding: 15px 0;">
            <div style="font-size: 2.8rem; margin-bottom: 10px;">📊</div>
            <h3 style="color: #0f7e9b; margin-bottom: 10px; font-size: 1.35rem; font-weight: 700;">Knowledge Check Complete</h3>
            <p style="font-size: 1.15rem; color: #123140; margin-bottom: 8px;">
                You scored <strong>${score} out of 3</strong>
            </p>
            <p style="color: #4b6570; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; max-width: 440px; margin-left: auto; margin-right: auto;">
                ${score === 2 ? 'Almost there! Score a perfect 3 out of 3 to unlock Mr. Lopez\'s secret rocket sled pilots! 🐾' : 'Review Newton\'s Laws and retry to score 3 out of 3 to unlock the secret pilots! 🐾'}
            </p>
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <button type="button" class="next-btn" style="float: none;" onclick="resetQuiz()">Retry Quiz 🔄</button>
                <button type="button" class="header-btn" style="background: #e9f4fb; color: #123140; border: 1px solid #c8dbe3;" onclick="closeModal(document.getElementById('quizModal'))">Close</button>
            </div>
        </div>
    `;
}

// Setup the Pilot dropdown menu events
function setupPilotMenu() {
    const menuBtn = document.getElementById('pilotMenuBtn');
    const dropdown = document.getElementById('pilotDropdown');
    const selectBtns = document.querySelectorAll('.pilot-select-btn');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('show');
    });

    selectBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pilot = btn.getAttribute('data-pilot');
            if (pilot) {
                selectPilot(pilot);
                dropdown?.classList.remove('show');
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#pilotMenuContainer')) {
            dropdown?.classList.remove('show');
        }
    });
}

// Update the Pilot UI in the header
function updatePilotUI() {
    const container = document.getElementById('pilotMenuContainer');
    const label = document.getElementById('activePilotLabel');
    const selectBtns = document.querySelectorAll('.pilot-select-btn');

    if (!container) return;

    if (easterEggUnlocked) {
        container.classList.remove('hidden');
        if (label) {
            if (currentPilot === 'brownie') {
                label.innerHTML = '🐕 Pilot: Brownie';
            } else if (currentPilot === 'coco') {
                label.innerHTML = '🐶 Pilot: Coco';
            } else {
                label.innerHTML = '🐧 Pilot: Penguin';
            }
        }

        selectBtns.forEach(btn => {
            if (btn.getAttribute('data-pilot') === currentPilot) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    } else {
        container.classList.add('hidden');
    }
}

// Select a specific pilot
function selectPilot(pilot) {
    if (!['brownie', 'coco', 'penguin'].includes(pilot)) return;
    currentPilot = pilot;
    try {
        localStorage.setItem('rocket_sled_pilot', pilot);
        localStorage.setItem('rocket_sled_easter_egg_unlocked', 'true');
    } catch (e) {}
    updatePilotUI();
}

// Cycle through available pilots
function cyclePilot() {
    const order = ['brownie', 'coco', 'penguin'];
    const nextIdx = (order.indexOf(currentPilot) + 1) % order.length;
    selectPilot(order[nextIdx]);
}

// Show multi-pilot easter egg modal on perfect quiz score
function showEasterEggModal() {
    const existing = document.getElementById('easterEggOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'easterEggOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 30, 45, 0.55);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.35s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #ffffff;
        border: 2px solid #c8dbe3;
        padding: 32px 28px;
        border-radius: 16px;
        text-align: center;
        max-width: 580px;
        width: calc(100% - 32px);
        box-shadow: 0 20px 50px rgba(12, 54, 68, 0.2);
        animation: scaleIn 0.35s ease;
        color: #123140;
    `;

    modal.innerHTML = `
        <div style="font-size: 3.2rem; margin-bottom: 6px;">🚀🐾</div>
        <h2 style="font-size: 1.7rem; margin: 0 0 6px 0; color: #0f7e9b; font-weight: 700;">Secret Easter Egg Unlocked!</h2>
        <div style="display: inline-block; background: #e9f4fb; color: #0f7e9b; padding: 4px 14px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; margin-bottom: 12px; border: 1px solid #c8dbe3; letter-spacing: 0.05em; text-transform: uppercase;">
            Perfect Score: 3 / 3
        </div>
        <p style="font-size: 1.05rem; line-height: 1.5; margin: 0 0 18px 0; color: #4b6570;">
            Newton would be proud! You earned the right to choose who pilots the rocket sled. Select your pilot:
        </p>

        <div class="easter-egg-grid">
            <div class="pilot-choice-card ${currentPilot === 'brownie' ? 'selected' : ''}" onclick="window.choosePilotAndClose('brownie')">
                <img src="brownie.png" alt="Brownie" class="pilot-choice-avatar">
                <div class="pilot-choice-name">🐕 Brownie</div>
                <div class="pilot-choice-desc">Mr. Lopez's dog &bull; High-speed pup</div>
                <button type="button" class="pilot-choice-btn">Ride with Brownie</button>
            </div>
            <div class="pilot-choice-card ${currentPilot === 'coco' ? 'selected' : ''}" onclick="window.choosePilotAndClose('coco')">
                <img src="coco.png" alt="Coco" class="pilot-choice-avatar">
                <div class="pilot-choice-name">🐶 Coco</div>
                <div class="pilot-choice-desc">The classic pug &bull; Veteran pilot</div>
                <button type="button" class="pilot-choice-btn">Ride with Coco</button>
            </div>
            <div class="pilot-choice-card ${currentPilot === 'penguin' ? 'selected' : ''}" onclick="window.choosePilotAndClose('penguin')">
                <div class="pilot-choice-avatar-icon">🐧</div>
                <div class="pilot-choice-name">🐧 Penguin</div>
                <div class="pilot-choice-desc">Aviator ace &bull; Original sled pilot</div>
                <button type="button" class="pilot-choice-btn" style="background: #0f7e9b; border-color: #0f7e9b;">Ride with Penguin</button>
            </div>
        </div>

        <p style="font-size: 0.85rem; color: #94a3b8; margin: 0;">
            Tip: You can change pilots anytime with the <strong>Pilot</strong> menu in the top header.
        </p>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    window.choosePilotAndClose = function(pilot) {
        selectPilot(pilot);
        overlay.style.animation = 'fadeIn 0.2s reverse ease';
        setTimeout(() => overlay.remove(), 200);
    };
}

// Global functions for visualization.js and external controls
window.getActivePilot = function () {
    return easterEggUnlocked ? currentPilot : 'penguin';
};

window.isEasterEggUnlocked = function () {
    return easterEggUnlocked;
};

window.selectPilot = selectPilot;
window.cyclePilot = cyclePilot;

// Backward compatibility helpers
window.isPugModeUnlocked = function () {
    return easterEggUnlocked && (currentPilot === 'coco' || currentPilot === 'brownie');
};

window.isPugUnlockedEver = function () {
    return easterEggUnlocked;
};

window.toggleCocoPilot = function () {
    if (easterEggUnlocked) {
        cyclePilot();
        return true;
    }
    return false;
};
