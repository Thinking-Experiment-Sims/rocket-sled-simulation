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

// Quiz tracking and pug mode easter egg
let quizScore = 0;
let pugModeUnlocked = false;
let pugModeActive = true;

try {
    pugModeUnlocked = localStorage.getItem('rocket_sled_coco_unlocked') === 'true';
} catch (e) {
    pugModeUnlocked = false;
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
    updateCocoToggleUI();

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

    // Coco Pilot Toggle Button
    const cocoBtn = document.getElementById('cocoToggleBtn');
    cocoBtn?.addEventListener('click', () => {
        pugModeActive = !pugModeActive;
        updateCocoToggleUI();
    });
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
            // Teacher shortcut to toggle Coco easter egg pilot
            pugModeUnlocked = true;
            pugModeActive = !pugModeActive;
            try { localStorage.setItem('rocket_sled_coco_unlocked', 'true'); } catch (err) {}
            updateCocoToggleUI();
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
        pugModeUnlocked = true;
        pugModeActive = true;
        try {
            localStorage.setItem('rocket_sled_coco_unlocked', 'true');
        } catch (e) {}
        updateCocoToggleUI();
        closeModal(quizModal);
        showPugModeUnlocked();
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
                ${score === 2 ? 'Almost there! Score a perfect 3 out of 3 to unlock Mr. Lopez\'s secret rocket sled pilot! 🐾' : 'Review Newton\'s Laws and retry to score 3 out of 3 to unlock the secret pilot! 🐾'}
            </p>
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                <button type="button" class="next-btn" style="float: none;" onclick="resetQuiz()">Retry Quiz 🔄</button>
                <button type="button" class="header-btn" style="background: #e9f4fb; color: #123140; border: 1px solid #c8dbe3;" onclick="closeModal(document.getElementById('quizModal'))">Close</button>
            </div>
        </div>
    `;
}

// Update the Coco pilot toggle UI in header
function updateCocoToggleUI() {
    const cocoBtn = document.getElementById('cocoToggleBtn');
    if (!cocoBtn) return;
    if (pugModeUnlocked) {
        cocoBtn.classList.remove('hidden');
        if (pugModeActive) {
            cocoBtn.textContent = '🐶 Pilot: Coco';
            cocoBtn.title = 'Coco is piloting! Click to switch to Penguin';
            cocoBtn.style.borderColor = '#d67b19';
            cocoBtn.style.color = '#d67b19';
            cocoBtn.style.background = '#fff4dd';
        } else {
            cocoBtn.textContent = '🐧 Pilot: Penguin';
            cocoBtn.title = 'Penguin is piloting! Click to switch to Coco';
            cocoBtn.style.borderColor = '#0f7e9b';
            cocoBtn.style.color = '#0f7e9b';
            cocoBtn.style.background = '#e9f4fb';
        }
    } else {
        cocoBtn.classList.add('hidden');
    }
}

// Show Coco mode unlocked celebration (Light Mode & Brand Compliant)
function showPugModeUnlocked() {
    // Remove existing celebration if open
    const existing = document.getElementById('cocoCelebrationOverlay');
    if (existing) existing.remove();

    // Create celebration overlay
    const overlay = document.createElement('div');
    overlay.id = 'cocoCelebrationOverlay';
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

    const message = document.createElement('div');
    message.style.cssText = `
        background: #ffffff;
        border: 2px solid #c8dbe3;
        padding: 36px 32px;
        border-radius: 16px;
        text-align: center;
        max-width: 480px;
        box-shadow: 0 20px 50px rgba(12, 54, 68, 0.2);
        animation: scaleIn 0.35s ease;
        color: #123140;
    `;

    message.innerHTML = `
        <div style="font-size: 3.5rem; margin-bottom: 8px;">🐶🚀</div>
        <h2 style="font-size: 1.8rem; margin: 0 0 8px 0; color: #0f7e9b; font-weight: 700;">Achievement Unlocked!</h2>
        <div style="display: inline-block; background: #e9f4fb; color: #0f7e9b; padding: 4px 14px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; margin-bottom: 14px; border: 1px solid #c8dbe3; letter-spacing: 0.05em; text-transform: uppercase;">
            Perfect Score: 3 / 3
        </div>
        <p style="font-size: 1.25rem; font-weight: 700; margin: 0 0 10px 0; color: #d67b19;">
            🎉 Coco Mode Unlocked! 🎉
        </p>
        <p style="font-size: 1rem; line-height: 1.55; margin: 0 0 24px 0; color: #4b6570;">
            Meet <strong>Coco</strong>, Mr. Lopez's pug! Coco has taken the pilot seat and is now riding the rocket sled!
        </p>
        <button id="closePugModal" style="
            background: #d67b19;
            color: #ffffff;
            border: none;
            padding: 12px 36px;
            font-size: 1.05rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(214, 123, 25, 0.3);
            transition: all 0.2s ease;
        " onmouseover="this.style.background='#b86510'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='#d67b19'; this.style.transform='translateY(0)'">Let's Ride with Coco! 🐾</button>
    `;

    overlay.appendChild(message);
    document.body.appendChild(overlay);

    // Close button
    document.getElementById('closePugModal').addEventListener('click', () => {
        overlay.style.animation = 'fadeIn 0.25s reverse ease';
        setTimeout(() => overlay.remove(), 250);
    });
}

// Global functions for visualization.js and external controls
window.isPugModeUnlocked = function () {
    return pugModeUnlocked && pugModeActive;
};

window.isPugUnlockedEver = function () {
    return pugModeUnlocked;
};

window.toggleCocoPilot = function () {
    if (pugModeUnlocked) {
        pugModeActive = !pugModeActive;
        updateCocoToggleUI();
        return true;
    }
    return false;
};
