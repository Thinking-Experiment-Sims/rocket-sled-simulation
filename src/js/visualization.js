/**
 * Rocket Sled Visualization
 * p5.js sketch for rendering the sled, track, and force diagram
 */

// Canvas and display settings
let canvasWidth, canvasHeight;
const TRACK_Y_RATIO = 0.6; // Track vertical position as ratio of canvas height
const SLED_WIDTH = 80;
const SLED_HEIGHT = 50;
const WHEEL_RADIUS = 12;

// Pug image
let pugImage;

// Display options - default OFF for cleaner initial view
let showForceArrows = false;
let showGrid = false;

// Jet animation
let jetFlameOffset = 0;

// Snow system configuration
const SNOW_COUNT = 100;
const snowParticles = [];

// Parallax background scrolling
let bgOffset = 0; // Tracks cumulative background position

// Color palette (matches CSS variables)
const COLORS = {
    primary: '#00BCD4',
    bgDark: '#0d1117',
    bgLight: '#1a1f26',
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    forceApplied: '#FF9800',
    forceNormal: '#4CAF50',
    forceGravity: '#9C27B0',
    forceFriction: '#F44336',
    forceAir: '#2196F3',
    track: '#3a4149',
    sled: '#455A64',
    sledAccent: '#78909C',
    wheel: '#263238',
    jet: '#FF5722',
    jetGlow: '#FFAB91'
};

// p5.js preload function - loads assets before setup
function preload() {
    pugImage = loadImage('pug.png');
}

// p5.js setup function
function setup() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('canvasContainer');

    // Smooth animations
    frameRate(60);
}

// p5.js window resize handler
function windowResized() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    resizeCanvas(canvasWidth, canvasHeight);

    // Initialize snow particles
    initSnow();
}

// p5.js main draw loop
function draw() {
    // Clear background
    background(COLORS.bgDark);

    // Get current physics state
    const state = getPhysicsState();

    // Update background offset based on velocity (parallax scrolling)
    bgOffset += state.velocity * 2; // Scale for visual effect

    // Draw parallax background layers
    drawParallaxBackground(state.velocity);

    // Draw grid if enabled (on top of background)
    if (showGrid) {
        drawGrid();
    }

    // Draw track
    drawTrack();

    // Sled stays fixed at center of screen - background moves instead
    const sledScreenX = canvasWidth / 2;
    const sledScreenY = canvasHeight * TRACK_Y_RATIO - SLED_HEIGHT / 2 - WHEEL_RADIUS;

    // Draw sled
    drawSled(sledScreenX, sledScreenY, state);

    // Draw force diagram if enabled
    if (showForceArrows) {
        drawForceDiagram(sledScreenX, sledScreenY, state);
        drawFreeBodyDiagramOverlay(state);
    }

    // Draw snow (on top of everything for depth)
    drawSnow(state.velocity);

    // Draw velocity indicator
    drawVelocityArrow(sledScreenX, sledScreenY - SLED_HEIGHT - 30, state.velocity);

    // Update jet animation
    jetFlameOffset = (jetFlameOffset + 0.3) % (Math.PI * 2);
}

/**
 * Draw parallax scrolling background to simulate motion
 * Three layers scroll at different speeds for depth effect
 * Includes prominent objects (trees, poles, signs) to show motion clearly
 */
function drawParallaxBackground(velocity) {
    const trackY = canvasHeight * TRACK_Y_RATIO;
    const skyHeight = trackY;

    // Sky gradient
    for (let y = 0; y < skyHeight; y++) {
        const inter = map(y, 0, skyHeight, 0, 1);
        const c = lerpColor(color('#1a1a2e'), color('#16213e'), inter);
        stroke(c);
        line(0, y, canvasWidth, y);
    }

    // Layer 1: Distant mountains (slowest parallax - 0.1x)
    const mountainOffset = bgOffset * 0.1;
    fill('#2d3a4a');
    noStroke();

    for (let i = -1; i <= Math.ceil(canvasWidth / 200) + 1; i++) {
        const baseX = (i * 200 - (mountainOffset % 200));
        beginShape();
        vertex(baseX - 50, skyHeight);
        vertex(baseX + 30, skyHeight - 80);
        vertex(baseX + 60, skyHeight - 120);
        vertex(baseX + 100, skyHeight - 90);
        vertex(baseX + 150, skyHeight - 140);
        vertex(baseX + 200, skyHeight - 70);
        vertex(baseX + 250, skyHeight);
        endShape(CLOSE);
    }

    // Layer 2: Trees in background (medium parallax - 0.4x) - LARGER and BRIGHTER
    const treeOffset = bgOffset * 0.4;
    const treeSpacing = 150;
    const centerX = canvasWidth / 2;
    const clearZone = 180; // Clear zone around sled for force arrows visibility

    for (let i = -1; i <= Math.ceil(canvasWidth / treeSpacing) + 2; i++) {
        const treeX = (i * treeSpacing - (treeOffset % treeSpacing));

        // Skip trees near the center (clear zone for force arrows)
        if (Math.abs(treeX - centerX) < clearZone) continue;

        const treeHeight = 80 + (i % 3) * 20; // Taller trees

        // Tree trunk - brown
        fill('#8B4513');
        noStroke();
        rect(treeX - 6, skyHeight - treeHeight, 12, treeHeight);

        // Tree foliage - bright green triangles
        fill('#228B22');
        triangle(
            treeX, skyHeight - treeHeight - 50,
            treeX - 35, skyHeight - treeHeight + 15,
            treeX + 35, skyHeight - treeHeight + 15
        );
        fill('#2E8B2E');
        triangle(
            treeX, skyHeight - treeHeight - 30,
            treeX - 28, skyHeight - treeHeight + 25,
            treeX + 28, skyHeight - treeHeight + 25
        );
    }

    // Layer 3: Utility poles (faster parallax - 0.7x) - TALLER and more visible
    const poleOffset = bgOffset * 0.7;
    const poleSpacing = 250;

    for (let i = -1; i <= Math.ceil(canvasWidth / poleSpacing) + 2; i++) {
        const poleX = (i * poleSpacing - (poleOffset % poleSpacing));

        // Skip poles near the center (clear zone for force arrows)
        if (Math.abs(poleX - centerX) < clearZone) continue;

        // Pole - gray with outline
        fill('#808080');
        stroke('#606060');
        strokeWeight(2);
        rect(poleX - 4, skyHeight - 120, 8, 120);

        // Crossbar - bright
        fill('#A0A0A0');
        rect(poleX - 25, skyHeight - 115, 50, 6);

        // Yellow warning markers on pole
        fill('#FFD700');
        noStroke();
        rect(poleX - 5, skyHeight - 30, 10, 20);

        noStroke();
    }

    // Ground area below track (Snowy White)
    fill('#E8EAF6');
    noStroke();
    rect(0, trackY + 8, canvasWidth, canvasHeight - trackY - 8);

    // Layer 4: Distance markers/signs (1x parallax) - LARGER and BRIGHTER
    const signOffset = bgOffset * 1.0;
    const signSpacing = 250;

    for (let i = -1; i <= Math.ceil(canvasWidth / signSpacing) + 2; i++) {
        const signX = (i * signSpacing - (signOffset % signSpacing));
        const distanceValue = Math.floor(Math.abs(bgOffset / 50) + i * 6);

        // Sign post - silver
        fill('#A0A0A0');
        stroke('#808080');
        strokeWeight(1);
        rect(signX - 3, trackY - 70, 6, 70);

        // Sign board - bright blue with yellow border
        fill('#0066CC');
        stroke('#FFD700');
        strokeWeight(3);
        rect(signX - 30, trackY - 95, 60, 30, 5);

        // Distance text - white and bold
        noStroke();
        fill('#FFFFFF');
        textSize(14);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text(`${distanceValue}m`, signX, trackY - 80);
        textStyle(NORMAL);
    }

    // Layer 5: Ground stripes (fastest - 1.5x for speed emphasis)
    const stripeOffset = bgOffset * 1.5;
    const stripeSpacing = 50;

    fill('#5a5a65');
    noStroke();
    for (let i = -1; i <= Math.ceil(canvasWidth / stripeSpacing) + 3; i++) {
        const stripeX = (i * stripeSpacing - (stripeOffset % stripeSpacing));
        rect(stripeX, trackY + 12, 25, 5, 2);
    }

    // Ground dashes (very fast - 2x) - brighter
    const dashOffset = bgOffset * 2.0;
    fill('#7a7a85');
    for (let i = -1; i <= Math.ceil(canvasWidth / 20) + 3; i++) {
        const dashX = (i * 20 - (dashOffset % 20));
        rect(dashX, trackY + 22, 8, 3);
    }
}

/**
 * Draw background grid
 */
function drawGrid() {
    stroke(COLORS.track);
    strokeWeight(1);

    // Vertical lines
    for (let x = 0; x < canvasWidth; x += 50) {
        line(x, 0, x, canvasHeight);
    }

    // Horizontal lines
    for (let y = 0; y < canvasHeight; y += 50) {
        line(0, y, canvasWidth, y);
    }
}

/**
 * Draw the horizontal track
 */
function drawTrack() {
    const trackY = canvasHeight * TRACK_Y_RATIO;

    // Main track surface
    noStroke();
    fill(COLORS.track);
    rect(50, trackY, canvasWidth - 100, 8, 4);

    // Distance markers
    fill(COLORS.textSecondary);
    textSize(10);
    textAlign(CENTER);

    for (let i = 0; i <= 10; i++) {
        const x = 50 + (canvasWidth - 100) * (i / 10);

        // Marker line
        stroke(COLORS.text);
        strokeWeight(1);
        line(x, trackY + 8, x, trackY + 16);

        // Label
        noStroke();
        text(`${(i - 5) * 10}m`, x, trackY + 28);
    }
}

/**
 * Draw the rocket sled
 */
function drawSled(x, y, state) {
    push();
    translate(x, y);

    // Wheels
    fill(COLORS.wheel);
    noStroke();
    ellipse(-SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 2);
    ellipse(SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 2);

    // Wheel highlights
    fill(COLORS.sledAccent);
    ellipse(-SLED_WIDTH / 3 - 2, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2 - 2, WHEEL_RADIUS);
    ellipse(SLED_WIDTH / 3 - 2, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2 - 2, WHEEL_RADIUS);

    // Main body
    fill(COLORS.sled);
    rect(-SLED_WIDTH / 2, 0, SLED_WIDTH, SLED_HEIGHT, 8);

    // Body highlight
    fill(COLORS.sledAccent);
    rect(-SLED_WIDTH / 2 + 5, 5, SLED_WIDTH - 10, 15, 4);

    // Cockpit
    fill(COLORS.primary);
    ellipse(0, SLED_HEIGHT / 3, 30, 20);
    fill(COLORS.bgDark);
    ellipse(0, SLED_HEIGHT / 3, 22, 14);

    // Rocket jets on sides
    // Logic corrected for Newton's 3rd Law:
    // To go LEFT (Force < 0), we need exhaust to go RIGHT. So Right rocket fires.
    // To go RIGHT (Force > 0), we need exhaust to go LEFT. So Left rocket fires.

    // Left Rocket (Points Left): Fires when thrust is Positive (Right)
    drawRocket(-SLED_WIDTH / 2 - 10, SLED_HEIGHT / 2, -1, state.thrustDirection === 1);

    // Right Rocket (Points Right): Fires when thrust is Negative (Left)
    drawRocket(SLED_WIDTH / 2 + 10, SLED_HEIGHT / 2, 1, state.thrustDirection === -1);

    // Draw Character (Pug!)
    drawPenguin(0, -5, state.thrustDirection);

    pop();
}

/**
 * Draw a pug character on the sled
 */
function drawPenguin(x, y, facing) {
    push();
    translate(x, y);

    // Check if image is loaded
    if (pugImage) {
        // Scale and position the pug
        // The pug image will be sized to fit nicely on the sled
        const pugWidth = 50;
        const pugHeight = 50;

        imageMode(CENTER);
        image(pugImage, 0, -10, pugWidth, pugHeight);
    } else {
        // Fallback: draw a simple placeholder if image hasn't loaded
        fill(100);
        noStroke();
        ellipse(0, 0, 30, 30);
    }

    pop();
}



/**
 * Initialize snow system
 */
function initSnow() {
    console.log('Initializing snow with dimensions:', canvasWidth, canvasHeight);
    if (!canvasWidth || !canvasHeight) {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
    }

    for (let i = 0; i < SNOW_COUNT; i++) {
        snowParticles.push({
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 1,
            wobble: Math.random() * TWO_PI
        });
    }
}

/**
 * Update and draw snow
 */
function drawSnow(velocity) {
    noStroke();
    fill(255, 255, 255, 180);

    for (const p of snowParticles) {
        // Move snow
        p.y += p.speed;
        p.x -= velocity * 2; // Move opposite to sled
        p.wobble += 0.05;

        const wobbleX = Math.sin(p.wobble) * 2;

        ellipse(p.x + wobbleX, p.y, p.size);

        // Wrap around
        if (p.y > canvasHeight) {
            p.y = -10;
            p.x = Math.random() * canvasWidth;
        }
        if (p.x < -20) p.x = canvasWidth + 20;
        if (p.x > canvasWidth + 20) p.x = -20;
    }
}

/**
 * Draw a rocket engine with optional flame
 */
function drawRocket(x, y, direction, active) {
    push();
    translate(x, y);

    // Rocket body
    fill(COLORS.sledAccent);
    noStroke();
    rect(-8 * direction, -10, 16 * direction, 20, 3);

    // Nozzle
    fill(COLORS.wheel);
    if (direction > 0) {
        triangle(8, -8, 8, 8, 16, 0);
    } else {
        triangle(-8, -8, -8, 8, -16, 0);
    }

    // Flame when active
    if (active) {
        const flameSize = 20 + sin(jetFlameOffset * 10) * 5;

        // Outer glow
        fill(COLORS.jetGlow + '60');
        noStroke();
        if (direction > 0) {
            ellipse(20 + flameSize / 2, 0, flameSize * 1.5, 18);
        } else {
            ellipse(-20 - flameSize / 2, 0, flameSize * 1.5, 18);
        }

        // Inner flame
        fill(COLORS.jet);
        if (direction > 0) {
            triangle(16, -6, 16, 6, 16 + flameSize, 0);
        } else {
            triangle(-16, -6, -16, 6, -16 - flameSize, 0);
        }

        // Hot core
        fill('#FFEB3B');
        if (direction > 0) {
            triangle(16, -3, 16, 3, 16 + flameSize * 0.6, 0);
        } else {
            triangle(-16, -3, -16, 3, -16 - flameSize * 0.6, 0);
        }
    }

    pop();
}

/**
 * Draw force diagram centered on the sled's center of mass
 * Main View: Arrows ONLY (no text) to avoid clutter
 */
function drawForceDiagram(x, y, state) {
    // Center of mass position (center of the sled body)
    const comX = x;
    const comY = y + SLED_HEIGHT / 2;

    // Scale for main view arrows
    const scale = 0.05;
    const minArrowLength = 40;

    // Applied Force (horizontal)
    if (state.appliedForce !== 0) {
        const length = Math.max(Math.abs(state.appliedForce) * scale, minArrowLength);
        drawForceArrow(comX, comY, state.appliedForce > 0 ? length : -length, 0, COLORS.forceApplied, '');
    }

    // Friction Force (horizontal)
    if (Math.abs(state.frictionForce) > 0.1) {
        const length = Math.max(Math.abs(state.frictionForce) * scale, minArrowLength);
        drawForceArrow(comX, comY + 25, state.frictionForce > 0 ? length : -length, 0, COLORS.forceFriction, '');
    }

    // Air Drag Force (horizontal)
    if (Math.abs(state.airDragForce) > 0.1) {
        const length = Math.max(Math.abs(state.airDragForce) * scale, minArrowLength);
        drawForceArrow(comX, comY - 25, state.airDragForce > 0 ? length : -length, 0, COLORS.forceAir, '');
    }

    // Normal Force (upward)
    const normalLength = Math.max(state.normalForce * scale * 0.5, minArrowLength);
    drawForceArrow(comX, comY, 0, -normalLength, COLORS.forceNormal, '');

    // Gravity/Weight (downward)
    const gravityLength = Math.max(state.gravityForce * scale * 0.5, minArrowLength);
    drawForceArrow(comX, comY, 0, gravityLength, COLORS.forceGravity, '');
}

/**
 * Draw a dedicated Free Body Diagram (FBD) overlay
 * This shows the forces in isolation with full labels
 */
function drawFreeBodyDiagramOverlay(state) {
    const boxWidth = 280; // Wider to fit labels
    const boxHeight = 240;
    // Bottom-Left positioning (avoids sled)
    const boxX = 20;
    const boxY = canvasHeight - boxHeight - 20;
    const centerX = boxX + boxWidth / 2;
    const centerY = boxY + boxHeight / 2;

    push();

    // Background Panel
    fill(COLORS.bgDark + 'E6'); // 90% opacity hex
    stroke(COLORS.textSecondary);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 10);

    // Title removed to save space for labels
    // noStroke();
    // fill(COLORS.text);
    // textSize(16);
    // textAlign(CENTER, TOP);
    // textStyle(BOLD);
    // text("Free Body Diagram", centerX, boxY + 15);

    // Central Object (Point Mass)
    fill(COLORS.text);
    noStroke();
    ellipse(centerX, centerY, 10, 10);

    // Scale for FBD (Compact)
    const scale = 0.03;
    const minLen = 25;
    const maxLen = 80; // Cap length to stay in compact box

    // Helper to clamp length
    const getLen = (force) => {
        let l = Math.abs(force) * scale;
        return Math.min(Math.max(l, minLen), maxLen);
    };

    // --- Applied Force ---
    if (state.appliedForce !== 0) {
        const l = getLen(state.appliedForce);
        const dir = Math.sign(state.appliedForce);
        drawFBDArrow(centerX, centerY, l * dir, 0, COLORS.forceApplied, 'F applied on\nSled by Rockets', dir === 1 ? 'RIGHT' : 'LEFT');
    }

    // --- Friction ---
    if (Math.abs(state.frictionForce) > 0.1) {
        const l = getLen(state.frictionForce);
        const dir = Math.sign(state.frictionForce);
        // Increased vertical offset to separate from Drag
        drawFBDArrow(centerX, centerY + 10, l * dir, 0, COLORS.forceFriction, 'F friction on\nSled by Track', dir === 1 ? 'RIGHT' : 'LEFT');
    }

    // --- Drag ---
    if (Math.abs(state.airDragForce) > 0.1) {
        const l = getLen(state.airDragForce);
        const dir = Math.sign(state.airDragForce);
        drawFBDArrow(centerX, centerY - 10, l * dir, 0, COLORS.forceAir, 'F air on\nSled by Air', dir === 1 ? 'RIGHT' : 'LEFT');
    }

    // --- Normal ---
    const normLen = getLen(state.normalForce);

    // Check for vertical equilibrium (Normal = Gravity)
    const isVerticallyBalanced = Math.abs(state.normalForce - state.gravityForce) < 1;

    drawFBDArrow(centerX, centerY, 0, -normLen, COLORS.forceNormal, 'F normal on\nSled by Track', 'TOP', isVerticallyBalanced);

    // --- Gravity ---
    const gravLen = getLen(state.gravityForce);
    drawFBDArrow(centerX, centerY, 0, gravLen, COLORS.forceGravity, 'F gravity on\nSled by Earth', 'BOTTOM', isVerticallyBalanced);

    pop();
}

/**
 * specialized arrow drawer for the FBD overlay
 * Handles complex label positioning relative to the box bounds
 * Added congruencyMark support for balanced forces
 */
function drawFBDArrow(x, y, dx, dy, color, label, posHint, showCongruency = false) {
    push();
    stroke(color);
    strokeWeight(4);
    fill(color);

    // Line
    line(x, y, x + dx, y + dy);

    // Congruency Mark (Tick mark)
    if (showCongruency) {
        push();
        stroke(255); // White mark for high contrast
        strokeWeight(3);
        const midX = x + dx * 0.5;
        const midY = y + dy * 0.5;

        // Calculate perpendicular direction (tick is 10px long)
        const tickSize = 10;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {
            // Perpendicular vector (-dy, dx)
            const perpX = (-dy / len) * (tickSize / 2);
            const perpY = (dx / len) * (tickSize / 2);

            line(midX - perpX, midY - perpY, midX + perpX, midY + perpY);
        }
        pop();
    }

    // Arrowhead
    const angle = atan2(dy, dx);
    const size = 12;
    push();
    translate(x + dx, y + dy);
    rotate(angle);
    triangle(0, 0, -size, -size / 2, -size, size / 2);
    pop();

    // Label
    noStroke();
    fill(COLORS.text);
    textSize(10); // Smaller font to fit in box
    textStyle(NORMAL);

    let lx = x + dx;
    let ly = y + dy;

    // Positioning logic based on hint
    if (posHint === 'RIGHT') {
        textAlign(LEFT, CENTER);
        lx += 10; // Reduced offset
    } else if (posHint === 'LEFT') {
        textAlign(RIGHT, CENTER);
        lx -= 10; // Reduced offset
    } else if (posHint === 'TOP') {
        textAlign(CENTER, BOTTOM);
        ly -= 10; // Reduced offset
    } else if (posHint === 'BOTTOM') {
        textAlign(CENTER, TOP);
        ly += 10; // Reduced offset
    }

    text(label, lx, ly);
    pop();
}

/**
 * Draw a force arrow (Main View - No Label Version)
 */
function drawForceArrow(x, y, dx, dy, color, label) {
    push();

    // Draw black outline for visibility
    stroke(0);
    strokeWeight(10);
    line(x, y, x + dx, y + dy);

    // Arrow line
    stroke(color);
    strokeWeight(6);
    fill(color);
    line(x, y, x + dx, y + dy);

    // Arrowhead
    const angle = atan2(dy, dx);
    const arrowSize = 25;

    push();
    translate(x + dx, y + dy);
    rotate(angle);
    noStroke();
    fill(color);
    triangle(0, 0, -arrowSize, -arrowSize / 2, -arrowSize, arrowSize / 2);
    pop();

    // NO LABEL DRAWING HERE ANYMORE

    pop();
}

/**
 * Draw velocity indicator arrow
 * Rendered as a "Double Arrow" (two parallel shafts) for emphasis
 */
function drawVelocityArrow(x, y, velocity) {
    if (Math.abs(velocity) < 0.1) return;

    push();

    // Move higher up to avoid overlapping with Normal force
    // x is sledScreenX, y passed is (sledScreenY - SLED_HEIGHT - 30)
    // We want it significantly higher, say 80px higher than that
    const arrowY = y - 80;

    const maxLength = 120; // Larger max length
    const pxPerMs = 2.4; // Scaling factor
    const rawLength = velocity * pxPerMs;
    // Cap length but keep direction
    const length = (Math.abs(rawLength) > maxLength) ? (Math.sign(velocity) * maxLength) : rawLength;

    stroke(COLORS.primary);
    noFill();

    // "Double Arrow" Style -> Two parallel lines for shaft
    const shaftSeparation = 6;
    strokeWeight(3);

    // Top shaft
    line(x, arrowY - shaftSeparation / 2, x + length, arrowY - shaftSeparation / 2);
    // Bottom shaft
    line(x, arrowY + shaftSeparation / 2, x + length, arrowY + shaftSeparation / 2);

    // Arrowhead
    fill(COLORS.primary);
    noStroke();
    const arrowSize = 16;
    if (velocity > 0) {
        triangle(
            x + length + 5, arrowY,
            x + length - 5, arrowY - arrowSize,
            x + length - 5, arrowY + arrowSize
        );
    } else {
        triangle(
            x + length - 5, arrowY,
            x + length + 5, arrowY - arrowSize,
            x + length + 5, arrowY + arrowSize
        );
    }

    // Label
    fill(COLORS.primary);
    stroke(0);
    strokeWeight(2); // Text outline
    textSize(16); // Larger font
    textStyle(BOLD);
    textAlign(CENTER);
    text(`v = ${velocity.toFixed(1)} m/s`, x, arrowY - 25);

    pop();
}

/**
 * Toggle force arrows visibility
 */
function toggleForceArrows(show) {
    showForceArrows = show;
}

/**
 * Toggle grid visibility
 */
function toggleGrid(show) {
    showGrid = show;
}
