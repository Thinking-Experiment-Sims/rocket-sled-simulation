/**
 * Rocket Sled Visualization
 * p5.js sketch for rendering the sled, track, and force diagram
 * Adheres strictly to The Thinking Experiment Design System (Light Mode Only)
 */

// Canvas and display settings
let canvasWidth, canvasHeight;
const TRACK_Y_RATIO = 0.6; // Track vertical position as ratio of canvas height
const SLED_WIDTH = 84;
const SLED_HEIGHT = 48;
const WHEEL_RADIUS = 12;

// Character assets
let cocoImage;
let brownieImage;

// Display options - default OFF for cleaner initial view
let showForceArrows = false;
let showGrid = false;

// Jet animation
let jetFlameOffset = 0;

// Snow & particle system configuration
const SNOW_COUNT = 80;
const snowParticles = [];
const exhaustParticles = [];

// Parallax background scrolling
let bgOffset = 0; // Tracks cumulative background position

// Color palette (matches The Thinking Experiment brand guidelines)
const COLORS = {
    primary: '#0f7e9b',     // Teal
    accent: '#d67b19',      // Amber
    bgDark: '#f8fafc',      // Light canvas background
    bgLight: '#ffffff',
    text: '#123140',
    textSecondary: '#4b6570',
    forceApplied: '#d67b19',
    forceNormal: '#10b981',
    forceGravity: '#64748b',
    forceFriction: '#ef4444',
    forceAir: '#0284c7',
    track: '#475569',
    sled: '#0f7e9b',
    sledAccent: '#d67b19',
    wheel: '#334155',
    jet: '#ea580c',
    jetGlow: '#fef08a'
};

// p5.js preload function - loads assets before setup
function preload() {
    console.log('Loading character assets...');
    cocoImage = loadImage('coco.png',
        () => console.log('Coco (pug) image loaded successfully!'),
        (err) => {
            console.log('Falling back to pug.png for Coco...');
            cocoImage = loadImage('pug.png');
        }
    );
    brownieImage = loadImage('brownie.png',
        () => console.log('Brownie image loaded successfully!'),
        (err) => console.error('Failed to load Brownie image:', err)
    );
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

    // Initialize snow
    initSnow();
}

// p5.js window resize handler
function windowResized() {
    const container = document.getElementById('canvasContainer');
    if (!container) return;

    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    resizeCanvas(canvasWidth, canvasHeight);

    // Reinitialize snow
    initSnow();
}

// p5.js main draw loop
function draw() {
    // Clear background to clean soft ice-white
    background('#f8fafc');

    // Get current physics state
    const state = typeof getPhysicsState === 'function' ? getPhysicsState() : { velocity: 0, position: 0, netForce: 0, mass: 250 };

    // Update background offset based on velocity (parallax scrolling)
    bgOffset += state.velocity * 2;

    // Draw daylight arctic parallax background layers
    drawParallaxBackground(state.velocity);

    // Draw blueprint grid if enabled
    if (showGrid) {
        drawGrid();
    }

    // Draw track
    drawTrack();

    // Sled stays centered on screen horizontally
    const sledScreenX = canvasWidth / 2;
    const sledScreenY = canvasHeight * TRACK_Y_RATIO - SLED_HEIGHT / 2 - WHEEL_RADIUS;

    // Draw rocket exhaust particles
    updateAndDrawParticles(sledScreenX, sledScreenY, state);

    // Draw sled and active pilot (Penguin or Coco)
    drawSled(sledScreenX, sledScreenY, state);

    // Draw force diagram if enabled
    if (showForceArrows) {
        drawForceDiagram(sledScreenX, sledScreenY, state);
        drawFreeBodyDiagramOverlay(state);
    }

    // Draw snow particles
    drawSnow(state.velocity);

    // Draw velocity vector arrow
    drawVelocityArrow(sledScreenX, sledScreenY - SLED_HEIGHT - 32, state.velocity);

    // Update jet oscillation
    jetFlameOffset = (jetFlameOffset + 0.35) % (Math.PI * 2);
}

/**
 * Draw daytime arctic parallax scrolling background
 */
function drawParallaxBackground(velocity) {
    const trackY = canvasHeight * TRACK_Y_RATIO;
    const skyHeight = trackY;

    // Crisp daylight winter sky gradient (light ice-blue to horizon white)
    for (let y = 0; y < skyHeight; y++) {
        const inter = map(y, 0, skyHeight, 0, 1);
        const c = lerpColor(color('#dbeafe'), color('#f8fafc'), inter);
        stroke(c);
        line(0, y, canvasWidth, y);
    }

    // Layer 1: Distant snow-capped alpine mountains (0.1x parallax)
    const mountainOffset = bgOffset * 0.1;
    fill('#cbd5e1'); // Atmospheric mountain slate
    noStroke();

    for (let i = -1; i <= Math.ceil(canvasWidth / 220) + 1; i++) {
        const baseX = (i * 220 - (mountainOffset % 220));
        beginShape();
        vertex(baseX - 60, skyHeight);
        vertex(baseX + 25, skyHeight - 85);
        vertex(baseX + 55, skyHeight - 125);
        vertex(baseX + 95, skyHeight - 95);
        vertex(baseX + 145, skyHeight - 145);
        vertex(baseX + 195, skyHeight - 75);
        vertex(baseX + 260, skyHeight);
        endShape(CLOSE);

        // Crisp white snowcaps on mountain peaks
        fill('#ffffff');
        beginShape();
        vertex(baseX + 55, skyHeight - 125);
        vertex(baseX + 40, skyHeight - 105);
        vertex(baseX + 55, skyHeight - 110);
        vertex(baseX + 70, skyHeight - 105);
        endShape(CLOSE);

        beginShape();
        vertex(baseX + 145, skyHeight - 145);
        vertex(baseX + 128, skyHeight - 120);
        vertex(baseX + 145, skyHeight - 128);
        vertex(baseX + 162, skyHeight - 120);
        endShape(CLOSE);
        fill('#cbd5e1');
    }

    // Layer 2: Stylized evergreen pine trees (0.4x parallax)
    const treeOffset = bgOffset * 0.4;
    const treeSpacing = 160;
    const centerX = canvasWidth / 2;
    const clearZone = 190; // Clear zone around sled for force arrow clarity

    for (let i = -1; i <= Math.ceil(canvasWidth / treeSpacing) + 2; i++) {
        const treeX = (i * treeSpacing - (treeOffset % treeSpacing));
        if (Math.abs(treeX - centerX) < clearZone) continue;

        const treeHeight = 75 + (Math.abs(i) % 3) * 18;

        // Tree trunk (slate bark)
        fill('#475569');
        noStroke();
        rect(treeX - 4, skyHeight - treeHeight, 8, treeHeight);

        // Evergreen pine tiers (Teal/Pine tones)
        fill('#0f766e');
        triangle(
            treeX, skyHeight - treeHeight - 45,
            treeX - 30, skyHeight - treeHeight + 12,
            treeX + 30, skyHeight - treeHeight + 12
        );
        fill('#115e59');
        triangle(
            treeX, skyHeight - treeHeight - 25,
            treeX - 24, skyHeight - treeHeight + 22,
            treeX + 24, skyHeight - treeHeight + 22
        );

        // Snow dusting on pine branches
        fill('#ffffff');
        triangle(
            treeX, skyHeight - treeHeight - 45,
            treeX - 10, skyHeight - treeHeight - 32,
            treeX + 10, skyHeight - treeHeight - 32
        );
    }

    // Layer 3: Utility poles (0.7x parallax)
    const poleOffset = bgOffset * 0.7;
    const poleSpacing = 260;

    for (let i = -1; i <= Math.ceil(canvasWidth / poleSpacing) + 2; i++) {
        const poleX = (i * poleSpacing - (poleOffset % poleSpacing));
        if (Math.abs(poleX - centerX) < clearZone) continue;

        // Pole - silver slate
        fill('#64748b');
        noStroke();
        rect(poleX - 3, skyHeight - 110, 6, 110);

        // Crossbar
        fill('#94a3b8');
        rect(poleX - 22, skyHeight - 105, 44, 5, 2);

        // Amber warning reflector (brand compliant)
        fill('#d67b19');
        rect(poleX - 4, skyHeight - 28, 8, 16, 2);
    }

    // Ground snow bank below track
    fill('#ffffff');
    noStroke();
    rect(0, trackY + 8, canvasWidth, canvasHeight - trackY - 8);

    // Subtle track ballast layer
    fill('#e2e8f0');
    rect(0, trackY + 8, canvasWidth, 6);

    // Layer 4: Modern distance markers (1.0x parallax)
    const signOffset = bgOffset * 1.0;
    const signSpacing = 250;

    for (let i = -1; i <= Math.ceil(canvasWidth / signSpacing) + 2; i++) {
        const signX = (i * signSpacing - (signOffset % signSpacing));
        const distanceValue = Math.floor(Math.abs(bgOffset / 50) + i * 6);

        // Sign post
        fill('#94a3b8');
        rect(signX - 3, trackY - 65, 6, 65, 1);

        // Sign board - clean white card with Teal border
        fill('#ffffff');
        stroke('#0f7e9b');
        strokeWeight(2);
        rect(signX - 28, trackY - 90, 56, 26, 6);

        // Distance text
        noStroke();
        fill('#123140');
        textSize(12);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text(`${distanceValue}m`, signX, trackY - 77);
        textStyle(NORMAL);
    }

    // Layer 5: Ground snow dashes (1.5x parallax)
    const dashOffset = bgOffset * 1.5;
    fill('#cbd5e1');
    noStroke();
    for (let i = -1; i <= Math.ceil(canvasWidth / 60) + 3; i++) {
        const dashX = (i * 60 - (dashOffset % 60));
        rect(dashX, trackY + 18, 22, 3, 2);
    }
}

/**
 * Draw background blueprint grid
 */
function drawGrid() {
    stroke('rgba(200, 219, 227, 0.6)');
    strokeWeight(1);

    for (let x = 0; x < canvasWidth; x += 50) {
        line(x, 0, x, canvasHeight);
    }
    for (let y = 0; y < canvasHeight; y += 50) {
        line(0, y, canvasWidth, y);
    }
}

/**
 * Draw the horizontal engineering track
 */
function drawTrack() {
    const trackY = canvasHeight * TRACK_Y_RATIO;

    // Track bed
    fill('#334155');
    noStroke();
    rect(40, trackY, canvasWidth - 80, 8, 4);

    // Metallic rail shine
    fill('#94a3b8');
    rect(40, trackY + 1, canvasWidth - 80, 2);

    // Track meter tick marks
    fill('#64748b');
    textSize(10);
    textAlign(CENTER);

    for (let i = 0; i <= 10; i++) {
        const x = 50 + (canvasWidth - 100) * (i / 10);
        stroke('#64748b');
        strokeWeight(1);
        line(x, trackY + 8, x, trackY + 16);

        noStroke();
        text(`${(i - 5) * 10}m`, x, trackY + 28);
    }
}

/**
 * Update and draw rocket exhaust particle embers
 */
function updateAndDrawParticles(sledX, sledY, state) {
    // Generate exhaust particles when thrusters are active
    if (state.thrustDirection !== 0) {
        const isRightThrust = state.thrustDirection === 1;
        const emitterX = sledX + (isRightThrust ? -SLED_WIDTH / 2 - 16 : SLED_WIDTH / 2 + 16);
        const emitterY = sledY + SLED_HEIGHT / 2;

        for (let i = 0; i < 2; i++) {
            exhaustParticles.push({
                x: emitterX,
                y: emitterY + (Math.random() * 8 - 4),
                vx: (isRightThrust ? -1 : 1) * (Math.random() * 4 + 2) - state.velocity * 0.1,
                vy: Math.random() * 2 - 1,
                size: Math.random() * 8 + 6,
                alpha: 220,
                color: Math.random() > 0.4 ? '#d67b19' : '#f59e0b'
            });
        }
    }

    // Update and draw existing particles
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
        const p = exhaustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.size *= 0.94;
        p.alpha -= 8;

        if (p.alpha <= 0 || p.size < 1) {
            exhaustParticles.splice(i, 1);
            continue;
        }

        noStroke();
        fill(p.color);
        ellipse(p.x, p.y, p.size);
    }
}

/**
 * Draw the rocket sled
 */
function drawSled(x, y, state) {
    push();
    translate(x, y);

    const v = state ? state.velocity : 0;
    const speed = Math.abs(v);

    // Suspension vibration scaling with velocity
    const vibration = speed > 1 ? Math.sin(frameCount * 0.9) * Math.min(speed * 0.03, 1) : 0;
    translate(0, vibration);

    // Wheels / Runners (Titanium alloy with Amber rims)
    fill(COLORS.wheel);
    noStroke();
    ellipse(-SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 2);
    ellipse(SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 2);

    // Amber rim highlights
    fill(COLORS.sledAccent);
    ellipse(-SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 1.1);
    ellipse(SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 1.1);
    fill('#f8fafc');
    ellipse(-SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 0.5);
    ellipse(SLED_WIDTH / 3, SLED_HEIGHT / 2 + WHEEL_RADIUS / 2, WHEEL_RADIUS * 0.5);

    // Main Chassis (Sleek aerodynamic Teal #0f7e9b)
    fill(COLORS.sled);
    stroke('#0b5f77');
    strokeWeight(1.5);
    rect(-SLED_WIDTH / 2, 0, SLED_WIDTH, SLED_HEIGHT, 10);

    // Racing stripe (Amber #d67b19)
    fill(COLORS.sledAccent);
    noStroke();
    rect(-SLED_WIDTH / 2 + 6, 8, SLED_WIDTH - 12, 10, 4);

    // Chrome Cockpit Rim
    fill('#ffffff');
    stroke('#c8dbe3');
    strokeWeight(1.5);
    ellipse(0, SLED_HEIGHT / 3, 34, 22);
    fill('#f1f5f9');
    ellipse(0, SLED_HEIGHT / 3, 26, 16);

    // Left Rocket (fires when thrust is Positive -> Right)
    drawRocket(-SLED_WIDTH / 2 - 8, SLED_HEIGHT / 2, -1, state.thrustDirection === 1);

    // Right Rocket (fires when thrust is Negative -> Left)
    drawRocket(SLED_WIDTH / 2 + 8, SLED_HEIGHT / 2, 1, state.thrustDirection === -1);

    // Draw Character (Penguin or Coco)
    drawCharacter(0, -6, state.thrustDirection, state);

    pop();
}

/**
 * Draw active pilot character on the sled
 */
function drawCharacter(x, y, facing, state) {
    const activePilot = typeof window.getActivePilot === 'function' ? window.getActivePilot() : 'penguin';

    if (activePilot === 'brownie') {
        drawBrownie(x, y, facing, state);
    } else if (activePilot === 'coco') {
        drawCoco(x, y, facing, state);
    } else {
        drawPenguin(x, y, facing, state);
    }
}

/**
 * Draw Brownie the dog riding the sled (Mr. Lopez's dog)
 */
function drawBrownie(x, y, facing, state) {
    push();
    translate(x, y);

    const v = state ? state.velocity : 0;
    const isMoving = Math.abs(v) > 0.5;
    const bob = isMoving ? Math.sin(frameCount * 0.3) * Math.min(Math.abs(v) * 0.08, 2.5) : 0;

    // brownie.png naturally faces LEFT.
    // When thrusting/moving right, flip horizontally so Brownie faces right!
    if (facing === 1 || (facing === 0 && v >= 0)) {
        scale(-1, 1);
    }

    if (brownieImage && brownieImage.width > 0) {
        const brownieW = 74;
        const brownieH = brownieW / 1.475; // ~50px natural aspect ratio

        imageMode(CENTER);
        image(brownieImage, 0, -brownieH / 2 + 6 + bob, brownieW, brownieH);
    } else {
        // Fallback vector representation
        fill(140, 120, 110);
        noStroke();
        ellipse(0, -16 + bob, 36, 36);
        fill(40);
        ellipse(-8, -17 + bob, 5, 5);
        fill('#0f7e9b'); // Teal collar
        rect(-14, -6 + bob, 28, 6, 2);
    }

    pop();
}

/**
 * Draw Coco the pug riding the sled (The classic pug)
 */
function drawCoco(x, y, facing, state) {
    push();
    translate(x, y);

    const v = state ? state.velocity : 0;
    const isMoving = Math.abs(v) > 0.5;
    const bob = isMoving ? Math.sin(frameCount * 0.3) * Math.min(Math.abs(v) * 0.08, 2.5) : 0;

    // coco.png naturally faces LEFT.
    // When thrusting/moving right, flip horizontally so Coco faces right!
    if (facing === 1 || (facing === 0 && v >= 0)) {
        scale(-1, 1);
    }

    if (cocoImage && cocoImage.width > 0) {
        const cocoH = 56;
        const cocoW = cocoH * (606 / 1024); // ~33px natural aspect ratio

        imageMode(CENTER);
        image(cocoImage, 0, -cocoH / 2 + 5 + bob, cocoW, cocoH);
    } else {
        // Fallback vector representation
        fill(210, 180, 140);
        noStroke();
        ellipse(0, -16 + bob, 36, 34);
        fill(40);
        ellipse(-8, -17 + bob, 5, 5);
        fill('#d67b19'); // Amber collar
        rect(-14, -6 + bob, 28, 6, 2);
    }

    pop();
}

/**
 * Draw modern, aerodynamic penguin character with dynamic inertia and wind scarf
 */
function drawPenguin(x, y, facing, state) {
    push();
    translate(x, y);

    const v = state ? state.velocity : 0;
    const a = state && state.mass ? (state.netForce / state.mass) : 0;

    // 1. Dynamic aerodynamic inertia lean:
    // Leans back into thrust acceleration, braces forward under braking friction/drag
    const leanAngle = constrain(-a * 0.012, -0.25, 0.25);
    rotate(leanAngle);

    // Subtle suspension bounce from motion
    const bounce = Math.abs(v) > 0.5 ? Math.sin(frameCount * 0.35) * Math.min(Math.abs(v) * 0.04, 1.5) : 0;
    translate(0, bounce);

    scale(0.85);

    // 2. Dynamic Amber Scarf (trailing behind in the wind opposite to motion)
    const speed = Math.abs(v);
    const windDir = v !== 0 ? -Math.sign(v) : (facing !== 0 ? -facing : -1);
    const flutterAmp = Math.min(4 + Math.sqrt(speed) * 2, 16);
    const wave = Math.sin(frameCount * 0.4 + speed * 0.08) * flutterAmp;
    const wave2 = Math.cos(frameCount * 0.35 + speed * 0.06) * (flutterAmp * 0.8);

    // Draw scarf tails BEHIND the body
    if (speed > 0.5 || Math.abs(facing) > 0) {
        fill('#d67b19'); // Amber scarf
        stroke('#b86510');
        strokeWeight(1);

        // First ribbon
        beginShape();
        vertex(8 * windDir, -8);
        bezierVertex(
            18 * windDir, -10 + wave * 0.5,
            30 * windDir, -16 + wave,
            (40 + speed * 0.5) * windDir, -12 + wave
        );
        vertex((38 + speed * 0.5) * windDir, -4 + wave);
        bezierVertex(
            28 * windDir, -6 + wave * 0.6,
            16 * windDir, -4,
            8 * windDir, -2
        );
        endShape(CLOSE);

        // Second ribbon (lower)
        fill('#b86510');
        beginShape();
        vertex(5 * windDir, -5);
        bezierVertex(
            15 * windDir, -8 + wave2 * 0.5,
            26 * windDir, -12 + wave2,
            (34 + speed * 0.4) * windDir, -8 + wave2
        );
        vertex((32 + speed * 0.4) * windDir, -2 + wave2);
        bezierVertex(
            22 * windDir, -4 + wave2 * 0.6,
            12 * windDir, -2,
            5 * windDir, 0
        );
        endShape(CLOSE);
    }

    // 3. Penguin Body (sleek, aerodynamic vector art)
    fill(24, 28, 36);
    stroke(15, 18, 24);
    strokeWeight(1.5);
    ellipse(0, 4, 38, 44); // Torso

    // White belly
    fill(255, 255, 255);
    noStroke();
    ellipse(0, 6, 26, 34);

    // Head
    fill(24, 28, 36);
    stroke(15, 18, 24);
    strokeWeight(1.5);
    ellipse(0, -18, 34, 30); // Head

    // Eye direction based on motion/thrust
    let eyeShift = 0;
    if (facing === 1 || (facing === 0 && v > 1)) eyeShift = 2.5;
    if (facing === -1 || (facing === 0 && v < -1)) eyeShift = -2.5;

    // Eyes
    fill(255);
    noStroke();
    ellipse(-8 + eyeShift * 0.5, -20, 10, 10);
    ellipse(8 + eyeShift * 0.5, -20, 10, 10);

    // Pupils with catchlight gleam
    fill(15, 23, 42);
    ellipse(-8 + eyeShift, -20, 5, 5);
    ellipse(8 + eyeShift, -20, 5, 5);
    fill(255);
    ellipse(-9 + eyeShift, -22, 2, 2);
    ellipse(7 + eyeShift, -22, 2, 2);

    // Beak
    fill('#f97316');
    stroke('#ea580c');
    strokeWeight(1);
    beginShape();
    vertex(0 + eyeShift * 0.8, -13);
    vertex(4 + eyeShift * 0.8, -16);
    vertex(0 + eyeShift * 0.8, -18);
    vertex(-4 + eyeShift * 0.8, -16);
    endShape(CLOSE);

    // 4. Aviator Pilot Goggles on Forehead
    fill('#78350f'); // Leather strap
    stroke('#451a03');
    strokeWeight(1);
    rect(-18, -27, 36, 4, 2);

    // Metallic frames (Amber copper)
    fill('#d67b19');
    stroke('#92400e');
    strokeWeight(1.5);
    ellipse(-8, -27, 12, 10);
    ellipse(8, -27, 12, 10);
    strokeWeight(2);
    line(-2, -27, 2, -27);

    // Polarized lenses (Teal reflection)
    fill('#0f7e9b');
    noStroke();
    ellipse(-8, -27, 9, 7);
    ellipse(8, -27, 9, 7);
    fill(255, 255, 255, 180);
    ellipse(-9, -28, 4, 2.5);
    ellipse(7, -28, 4, 2.5);

    // 5. Scarf Knot on Neck (Amber #d67b19)
    fill('#d67b19');
    stroke('#b86510');
    strokeWeight(1);
    rect(-14, -8, 28, 8, 3);

    // 6. Flippers holding cockpit controls
    fill(24, 28, 36);
    noStroke();
    ellipse(-16, 6, 8, 16);
    ellipse(16, 6, 8, 16);

    // Little feet on sled deck
    fill('#f97316');
    ellipse(-8, 24, 10, 5);
    ellipse(8, 24, 10, 5);

    pop();
}

/**
 * Draw rocket engine with multi-stage plasma flame
 */
function drawRocket(x, y, direction, active) {
    push();
    translate(x, y);

    // Engine housing
    fill('#0f7e9b');
    stroke('#0b5f77');
    strokeWeight(1);
    rect(-10 * direction, -8, 20 * direction, 16, 3);

    // Titanium Nozzle
    fill('#334155');
    stroke('#1e293b');
    strokeWeight(1);
    if (direction > 0) {
        triangle(10, -8, 10, 8, 18, 0);
    } else {
        triangle(-10, -8, -10, 8, -18, 0);
    }

    // Plasma Flame when active
    if (active) {
        const flamePulse = Math.sin(frameCount * 0.8) * 6;
        const flameLength = 32 + flamePulse;

        // Outer Flame (Amber #d67b19)
        noStroke();
        fill('rgba(214, 123, 25, 0.85)');
        if (direction > 0) {
            triangle(16, -9, 16, 9, 16 + flameLength, 0);
        } else {
            triangle(-16, -9, -16, 9, -16 - flameLength, 0);
        }

        // Mid Flame (Bright Gold-Amber)
        fill('rgba(251, 191, 36, 0.95)');
        if (direction > 0) {
            triangle(16, -6, 16, 6, 16 + flameLength * 0.7, 0);
        } else {
            triangle(-16, -6, -16, 6, -16 - flameLength * 0.7, 0);
        }

        // Inner Core (White-hot plasma)
        fill(255, 255, 255);
        if (direction > 0) {
            triangle(16, -3, 16, 3, 16 + flameLength * 0.35, 0);
        } else {
            triangle(-16, -3, -16, 3, -16 - flameLength * 0.35, 0);
        }
    }

    pop();
}

/**
 * Initialize snow system
 */
function initSnow() {
    snowParticles.length = 0;
    const w = canvasWidth || window.innerWidth;
    const h = canvasHeight || window.innerHeight;

    for (let i = 0; i < SNOW_COUNT; i++) {
        snowParticles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 2.5 + 1.2,
            speed: Math.random() * 1.5 + 0.8,
            wobble: Math.random() * TWO_PI
        });
    }
}

/**
 * Update and draw falling snow particles
 */
function drawSnow(velocity) {
    noStroke();
    fill(255, 255, 255, 210);

    for (const p of snowParticles) {
        p.y += p.speed;
        p.x -= velocity * 1.6;
        p.wobble += 0.04;

        const wobbleX = Math.sin(p.wobble) * 1.5;
        ellipse(p.x + wobbleX, p.y, p.size);

        if (p.y > canvasHeight) {
            p.y = -10;
            p.x = Math.random() * canvasWidth;
        }
        if (p.x < -20) p.x = canvasWidth + 20;
        if (p.x > canvasWidth + 20) p.x = -20;
    }
}

/**
 * Draw force diagram on sled
 */
function drawForceDiagram(x, y, state) {
    const comX = x;
    const comY = y + SLED_HEIGHT / 2;
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

    // Gravity (downward)
    const gravityLength = Math.max(state.gravityForce * scale * 0.5, minArrowLength);
    drawForceArrow(comX, comY, 0, gravityLength, COLORS.forceGravity, '');
}

/**
 * Draw Free Body Diagram overlay card
 */
function drawFreeBodyDiagramOverlay(state) {
    const boxWidth = 280;
    const boxHeight = 240;
    const boxX = 20;
    const boxY = canvasHeight - boxHeight - 20;
    const centerX = boxX + boxWidth / 2;
    const centerY = boxY + boxHeight / 2;

    push();

    // Clean white card surface
    fill('rgba(255, 255, 255, 0.95)');
    stroke('#c8dbe3');
    strokeWeight(1.5);
    rect(boxX, boxY, boxWidth, boxHeight, 10);

    // Central Object point
    fill('#123140');
    noStroke();
    ellipse(centerX, centerY, 10, 10);

    const scale = 0.03;
    const minLen = 25;
    const maxLen = 80;

    const getLen = (force) => {
        let l = Math.abs(force) * scale;
        return Math.min(Math.max(l, minLen), maxLen);
    };

    if (state.appliedForce !== 0) {
        const l = getLen(state.appliedForce);
        const dir = Math.sign(state.appliedForce);
        drawFBDArrow(centerX, centerY, l * dir, 0, COLORS.forceApplied, 'F applied on\nSled by Rockets', dir === 1 ? 'RIGHT' : 'LEFT');
    }

    if (Math.abs(state.frictionForce) > 0.1) {
        const l = getLen(state.frictionForce);
        const dir = Math.sign(state.frictionForce);
        drawFBDArrow(centerX, centerY + 10, l * dir, 0, COLORS.forceFriction, 'F friction on\nSled by Track', dir === 1 ? 'RIGHT' : 'LEFT');
    }

    if (Math.abs(state.airDragForce) > 0.1) {
        const l = getLen(state.airDragForce);
        const dir = Math.sign(state.airDragForce);
        drawFBDArrow(centerX, centerY - 10, l * dir, 0, COLORS.forceAir, 'F air on\nSled by Air', dir === 1 ? 'RIGHT' : 'LEFT');
    }

    const normLen = getLen(state.normalForce);
    const isVerticallyBalanced = Math.abs(state.normalForce - state.gravityForce) < 1;
    drawFBDArrow(centerX, centerY, 0, -normLen, COLORS.forceNormal, 'F normal on\nSled by Track', 'TOP', isVerticallyBalanced);

    const gravLen = getLen(state.gravityForce);
    drawFBDArrow(centerX, centerY, 0, gravLen, COLORS.forceGravity, 'F gravity on\nSled by Earth', 'BOTTOM', isVerticallyBalanced);

    pop();
}

/**
 * Draw a labeled FBD arrow with equality tick mark if balanced
 */
function drawFBDArrow(startX, startY, dx, dy, colorHex, labelText, labelPosition, showEqualityTick = false) {
    const endX = startX + dx;
    const endY = startY + dy;
    const arrowHeadSize = 8;

    push();
    stroke(colorHex);
    strokeWeight(2.5);
    line(startX, startY, endX, endY);

    const angle = Math.atan2(dy, dx);
    fill(colorHex);
    noStroke();
    push();
    translate(endX, endY);
    rotate(angle);
    triangle(0, 0, -arrowHeadSize, -arrowHeadSize / 2, -arrowHeadSize, arrowHeadSize / 2);
    pop();

    if (showEqualityTick) {
        const midX = startX + dx / 2;
        const midY = startY + dy / 2;
        stroke(colorHex);
        strokeWeight(2);
        line(midX - 5, midY, midX + 5, midY);
    }

    if (labelText) {
        noStroke();
        fill('#123140');
        textSize(10);
        textStyle(BOLD);

        let tx = endX;
        let ty = endY;
        const offset = 14;

        switch (labelPosition) {
            case 'RIGHT':
                textAlign(LEFT, CENTER);
                tx += offset;
                break;
            case 'LEFT':
                textAlign(RIGHT, CENTER);
                tx -= offset;
                break;
            case 'TOP':
                textAlign(CENTER, BOTTOM);
                ty -= offset;
                break;
            case 'BOTTOM':
                textAlign(CENTER, TOP);
                ty += offset;
                break;
        }

        text(labelText, tx, ty);
    }

    pop();
}

/**
 * Draw individual vector arrow
 */
function drawForceArrow(startX, startY, dx, dy, colorHex, labelText) {
    const endX = startX + dx;
    const endY = startY + dy;
    const arrowHeadSize = 10;

    push();
    stroke(colorHex);
    strokeWeight(3.5);
    line(startX, startY, endX, endY);

    const angle = Math.atan2(dy, dx);
    fill(colorHex);
    noStroke();
    push();
    translate(endX, endY);
    rotate(angle);
    triangle(0, 0, -arrowHeadSize, -arrowHeadSize / 2, -arrowHeadSize, arrowHeadSize / 2);
    pop();

    pop();
}

/**
 * Draw velocity vector arrow with label
 */
function drawVelocityArrow(x, arrowY, velocity) {
    if (Math.abs(velocity) < 0.1) return;

    push();
    const maxLength = 100;
    const length = constrain(velocity * 2.5, -maxLength, maxLength);

    stroke('#0f7e9b');
    strokeWeight(3);
    line(x, arrowY, x + length, arrowY);

    noStroke();
    fill('#0f7e9b');
    const arrowSize = 12;
    if (velocity > 0) {
        triangle(
            x + length + 4, arrowY,
            x + length - 4, arrowY - arrowSize / 2,
            x + length - 4, arrowY + arrowSize / 2
        );
    } else {
        triangle(
            x + length - 4, arrowY,
            x + length + 4, arrowY - arrowSize / 2,
            x + length + 4, arrowY + arrowSize / 2
        );
    }

    fill('#0f7e9b');
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER);
    text(`v = ${velocity.toFixed(1)} m/s`, x, arrowY - 14);

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

/**
 * Handle mouse clicks on canvas (pilot click interaction)
 */
function mouseClicked() {
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

    const centerX = canvasWidth / 2;
    const trackY = canvasHeight * TRACK_Y_RATIO;
    const sledY = trackY - SLED_HEIGHT / 2 - 4;

    const d = dist(mouseX, mouseY, centerX, sledY - 15);
    if (d < 45) {
        if (typeof window.toggleCocoPilot === 'function' && typeof window.isPugUnlockedEver === 'function' && window.isPugUnlockedEver()) {
            window.toggleCocoPilot();
        } else {
            const quizBtn = document.getElementById('quizBtn');
            if (quizBtn) {
                quizBtn.click();
            }
        }
    }
}
