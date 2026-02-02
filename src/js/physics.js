/**
 * Rocket Sled Physics Engine
 * Implements Newton's Laws for a rocket sled with forces, friction, and air drag
 */

// Physical constants
const SLED_MASS = 500; // kg
const APPLIED_FORCE = 2000; // N (thrust from rockets)
const FRICTION_COEFFICIENT = 0.15;
const AIR_DRAG_COEFFICIENT = 0.5;
const GRAVITY = 9.8; // m/s²
const MAX_VELOCITY = 50; // m/s (cap for simulation stability)

// Physics state
let physicsState = {
    position: 0,        // meters from center
    velocity: 0,        // m/s (positive = right)
    acceleration: 0,    // m/s²
    mass: SLED_MASS,

    // Forces
    appliedForce: 0,    // N (positive = right)
    frictionForce: 0,   // N (always opposes motion)
    airDragForce: 0,    // N (always opposes motion)
    normalForce: 0,     // N (from ground)
    gravityForce: 0,    // N (weight)
    netForce: 0,        // N (sum of all forces)

    // Settings
    frictionEnabled: false,
    airDragEnabled: false,
    thrustDirection: 0  // -1 = left, 0 = off, 1 = right
};

/**
 * Reset the physics state to initial conditions
 */
function resetPhysics() {
    physicsState.position = 0;
    physicsState.velocity = 0;
    physicsState.acceleration = 0;
    physicsState.appliedForce = 0;
    physicsState.frictionForce = 0;
    physicsState.airDragForce = 0;
    physicsState.netForce = 0;
    physicsState.thrustDirection = 0;

    // Weight and normal force are always present
    physicsState.gravityForce = physicsState.mass * GRAVITY;
    physicsState.normalForce = physicsState.gravityForce; // On flat ground
}

/**
 * Set the thrust direction
 * @param {number} direction - -1 (left), 0 (off), or 1 (right)
 */
function setThrustDirection(direction) {
    physicsState.thrustDirection = Math.sign(direction);
}

/**
 * Set friction enabled/disabled
 * @param {boolean} enabled
 */
function setFrictionEnabled(enabled) {
    physicsState.frictionEnabled = enabled;
}

/**
 * Set air drag enabled/disabled
 * @param {boolean} enabled
 */
function setAirDragEnabled(enabled) {
    physicsState.airDragEnabled = enabled;
}

/**
 * Calculate all forces and update the physics state
 * @param {number} dt - Time step in seconds
 */
function updatePhysics(dt) {
    // Always calculate vertical forces (for force diagram)
    physicsState.gravityForce = physicsState.mass * GRAVITY;
    physicsState.normalForce = physicsState.gravityForce;

    // Calculate applied force (thrust)
    physicsState.appliedForce = physicsState.thrustDirection * APPLIED_FORCE;

    // Calculate friction force (opposes motion, only when moving)
    if (physicsState.frictionEnabled && Math.abs(physicsState.velocity) > 0.01) {
        const frictionMagnitude = FRICTION_COEFFICIENT * physicsState.normalForce;
        physicsState.frictionForce = -Math.sign(physicsState.velocity) * frictionMagnitude;
    } else {
        physicsState.frictionForce = 0;
    }

    // Static friction check - prevents motion if applied force is less than static friction
    if (physicsState.frictionEnabled &&
        Math.abs(physicsState.velocity) < 0.01 &&
        Math.abs(physicsState.appliedForce) < FRICTION_COEFFICIENT * physicsState.normalForce * 1.1) {
        // Static friction case - sled doesn't move
        physicsState.frictionForce = -physicsState.appliedForce;
    }

    // Calculate air drag force (opposes motion, proportional to velocity squared)
    if (physicsState.airDragEnabled && Math.abs(physicsState.velocity) > 0.01) {
        const dragMagnitude = AIR_DRAG_COEFFICIENT * physicsState.velocity * physicsState.velocity;
        physicsState.airDragForce = -Math.sign(physicsState.velocity) * dragMagnitude;
    } else {
        physicsState.airDragForce = 0;
    }

    // Calculate net horizontal force
    physicsState.netForce = physicsState.appliedForce +
        physicsState.frictionForce +
        physicsState.airDragForce;

    // Newton's Second Law: F = ma → a = F/m
    physicsState.acceleration = physicsState.netForce / physicsState.mass;

    // Update velocity: v = v + a*dt
    physicsState.velocity += physicsState.acceleration * dt;

    // Clamp velocity to prevent instability
    physicsState.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, physicsState.velocity));

    // Stop if velocity is very small and no applied force
    if (Math.abs(physicsState.velocity) < 0.1 && physicsState.thrustDirection === 0) {
        if (!physicsState.frictionEnabled && !physicsState.airDragEnabled) {
            // Keep coasting with no resistance
        } else {
            // Resistance will stop the sled
            if (Math.abs(physicsState.velocity) < 0.05) {
                physicsState.velocity = 0;
            }
        }
    }

    // Update position: x = x + v*dt
    physicsState.position += physicsState.velocity * dt;
}

/**
 * Get the current physics state
 * @returns {Object} Current state
 */
function getPhysicsState() {
    return { ...physicsState };
}

/**
 * Get the speed as a percentage of max (for speedometer)
 * @returns {number} 0-100
 */
function getSpeedPercentage() {
    return (Math.abs(physicsState.velocity) / MAX_VELOCITY) * 100;
}

/**
 * Check if velocity is in the "red zone" (above 80%)
 * @returns {boolean}
 */
function isInRedZone() {
    return getSpeedPercentage() > 80;
}

// Initialize on load
resetPhysics();
