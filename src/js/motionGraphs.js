/**
 * Rocket Sled Simulation - Real-Time Motion Graphs
 * High-performance kinematic canvas plotting for Position x(t) and Velocity v(t)
 * Follows The Thinking Experiment Design System (Teal #0f7e9b & Amber #d67b19)
 */

(function () {
    'use strict';

    // Canvas & context handles
    let posCanvas, posCtx;
    let velCanvas, velCtx;
    let posDisplay, velDisplay;
    let containerEl;
    let motionGraphsBtn;

    // Data buffer
    const MAX_TIME_WINDOW = 18; // Keep last 18 seconds of motion history
    const dataPoints = []; // Array of { t: seconds, x: meters, v: m/s }
    let startTime = null;
    let isVisible = true;

    // Color palette adhering strictly to design system
    const PLOT_COLORS = {
        bg: '#ffffff',
        border: '#c8dbe3',
        grid: '#edf2f7',
        axis: '#94a3b8',
        text: '#4b6570',
        ink: '#123140',
        position: '#0f7e9b', // Teal
        positionFill: 'rgba(15, 126, 155, 0.08)',
        velocity: '#d67b19', // Amber
        velocityFill: 'rgba(214, 123, 25, 0.08)'
    };

    /**
     * Initialize motion graphs module
     */
    function initMotionGraphs() {
        posCanvas = document.getElementById('posGraphCanvas');
        velCanvas = document.getElementById('velGraphCanvas');
        posDisplay = document.getElementById('graphCurrentPos');
        velDisplay = document.getElementById('graphCurrentVel');
        containerEl = document.getElementById('motionGraphsContainer');
        motionGraphsBtn = document.getElementById('motionGraphsBtn');

        if (!posCanvas || !velCanvas) return;

        posCtx = posCanvas.getContext('2d');
        velCtx = velCanvas.getContext('2d');

        // Setup resize observers and window resize
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        // Toggle button listener
        motionGraphsBtn?.addEventListener('click', () => {
            isVisible = !isVisible;
            if (containerEl) {
                if (isVisible) {
                    containerEl.classList.remove('collapsed');
                    motionGraphsBtn.classList.add('active');
                    resizeCanvases();
                } else {
                    containerEl.classList.add('collapsed');
                    motionGraphsBtn.classList.remove('active');
                }
            }
        });

        // Clear graphs button listener
        const clearBtn = document.getElementById('clearGraphsBtn');
        clearBtn?.addEventListener('click', clearGraphs);

        // Reset button listener
        const resetBtn = document.getElementById('resetBtn');
        resetBtn?.addEventListener('click', clearGraphs);

        startTime = performance.now();
        requestAnimationFrame(graphLoop);
    }

    /**
     * Resize internal canvas coordinate space to match CSS display width
     */
    function resizeCanvases() {
        if (!posCanvas || !velCanvas) return;
        const dpr = window.devicePixelRatio || 1;

        [posCanvas, velCanvas].forEach(cvs => {
            const rect = cvs.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                cvs.width = rect.width * dpr;
                cvs.height = rect.height * dpr;
            }
        });
    }

    /**
     * Clear recorded telemetry points
     */
    function clearGraphs() {
        dataPoints.length = 0;
        startTime = performance.now();
    }

    /**
     * Main animation loop for real-time graphing
     */
    function graphLoop(now) {
        if (startTime === null) startTime = now;
        const elapsedSec = (now - startTime) / 1000;

        // Fetch current physics state
        if (typeof getPhysicsState === 'function') {
            const state = getPhysicsState();
            const pos = state.position || 0;
            const vel = state.velocity || 0;

            // Sample every frame
            dataPoints.push({
                t: elapsedSec,
                x: pos,
                v: vel
            });

            // Prune data outside window
            const minTime = elapsedSec - MAX_TIME_WINDOW;
            while (dataPoints.length > 2 && dataPoints[0].t < minTime) {
                dataPoints.shift();
            }

            // Update header readouts
            if (posDisplay) posDisplay.textContent = `${pos.toFixed(1)} m`;
            if (velDisplay) velDisplay.textContent = `${vel.toFixed(1)} m/s`;

            // Draw plots if visible
            if (isVisible && posCtx && velCtx) {
                drawPositionPlot(elapsedSec);
                drawVelocityPlot(elapsedSec);
            }
        }

        requestAnimationFrame(graphLoop);
    }

    /**
     * Render Position x(t) Graph
     */
    function drawPositionPlot(currentTime) {
        const dpr = window.devicePixelRatio || 1;
        const w = posCanvas.width / dpr;
        const h = posCanvas.height / dpr;

        posCtx.save();
        posCtx.scale(dpr, dpr);
        posCtx.clearRect(0, 0, w, h);

        // Margins for axes
        const margin = { top: 12, right: 16, bottom: 24, left: 46 };
        const plotW = w - margin.left - margin.right;
        const plotH = h - margin.top - margin.bottom;

        const minT = Math.max(0, currentTime - MAX_TIME_WINDOW);
        const maxT = Math.max(MAX_TIME_WINDOW, currentTime);

        // Determine Y bounds
        let minY = 0;
        let maxY = 10;
        if (dataPoints.length > 0) {
            minY = dataPoints[0].x;
            maxY = dataPoints[0].x;
            for (let i = 0; i < dataPoints.length; i++) {
                if (dataPoints[i].x < minY) minY = dataPoints[i].x;
                if (dataPoints[i].x > maxY) maxY = dataPoints[i].x;
            }
        }
        // Add breathing room
        const spanY = Math.max(10, maxY - minY);
        minY = Math.floor((minY - spanY * 0.15) / 5) * 5;
        maxY = Math.ceil((maxY + spanY * 0.15) / 5) * 5;
        if (maxY === minY) maxY = minY + 10;

        // Coordinate helper
        const xCoord = (t) => margin.left + ((t - minT) / (maxT - minT)) * plotW;
        const yCoord = (y) => margin.top + plotH - ((y - minY) / (maxY - minY)) * plotH;

        // Draw background grid lines
        posCtx.strokeStyle = PLOT_COLORS.grid;
        posCtx.lineWidth = 1;

        // Horizontal grid & labels
        posCtx.fillStyle = PLOT_COLORS.text;
        posCtx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        posCtx.textAlign = 'right';
        posCtx.textBaseline = 'middle';

        const ySteps = 4;
        for (let i = 0; i <= ySteps; i++) {
            const val = minY + (i / ySteps) * (maxY - minY);
            const py = yCoord(val);

            posCtx.beginPath();
            posCtx.moveTo(margin.left, py);
            posCtx.lineTo(w - margin.right, py);
            posCtx.stroke();

            posCtx.fillText(`${Math.round(val)}m`, margin.left - 6, py);
        }

        // Zero line if visible
        if (minY <= 0 && maxY >= 0) {
            const zeroY = yCoord(0);
            posCtx.strokeStyle = PLOT_COLORS.axis;
            posCtx.lineWidth = 1.2;
            posCtx.beginPath();
            posCtx.moveTo(margin.left, zeroY);
            posCtx.lineTo(w - margin.right, zeroY);
            posCtx.stroke();
        }

        // Time axis ticks
        posCtx.textAlign = 'center';
        posCtx.textBaseline = 'top';
        const tSteps = 4;
        for (let i = 0; i <= tSteps; i++) {
            const tVal = minT + (i / tSteps) * (maxT - minT);
            const px = xCoord(tVal);
            posCtx.fillText(`${tVal.toFixed(0)}s`, px, h - margin.bottom + 5);
        }

        // Draw Position curve
        if (dataPoints.length > 1) {
            // Fill area
            posCtx.beginPath();
            posCtx.moveTo(xCoord(dataPoints[0].t), yCoord(minY));
            for (let i = 0; i < dataPoints.length; i++) {
                posCtx.lineTo(xCoord(dataPoints[i].t), yCoord(dataPoints[i].x));
            }
            posCtx.lineTo(xCoord(dataPoints[dataPoints.length - 1].t), yCoord(minY));
            posCtx.closePath();
            posCtx.fillStyle = PLOT_COLORS.positionFill;
            posCtx.fill();

            // Stroke line
            posCtx.beginPath();
            posCtx.moveTo(xCoord(dataPoints[0].t), yCoord(dataPoints[0].x));
            for (let i = 1; i < dataPoints.length; i++) {
                posCtx.lineTo(xCoord(dataPoints[i].t), yCoord(dataPoints[i].x));
            }
            posCtx.strokeStyle = PLOT_COLORS.position;
            posCtx.lineWidth = 2.2;
            posCtx.lineJoin = 'round';
            posCtx.stroke();

            // End marker
            const lastPt = dataPoints[dataPoints.length - 1];
            const endX = xCoord(lastPt.t);
            const endY = yCoord(lastPt.x);

            posCtx.fillStyle = PLOT_COLORS.position;
            posCtx.beginPath();
            posCtx.arc(endX, endY, 4, 0, Math.PI * 2);
            posCtx.fill();

            posCtx.strokeStyle = '#ffffff';
            posCtx.lineWidth = 1.5;
            posCtx.beginPath();
            posCtx.arc(endX, endY, 4, 0, Math.PI * 2);
            posCtx.stroke();
        }

        posCtx.restore();
    }

    /**
     * Render Velocity v(t) Graph
     */
    function drawVelocityPlot(currentTime) {
        const dpr = window.devicePixelRatio || 1;
        const w = velCanvas.width / dpr;
        const h = velCanvas.height / dpr;

        velCtx.save();
        velCtx.scale(dpr, dpr);
        velCtx.clearRect(0, 0, w, h);

        const margin = { top: 12, right: 16, bottom: 24, left: 46 };
        const plotW = w - margin.left - margin.right;
        const plotH = h - margin.top - margin.bottom;

        const minT = Math.max(0, currentTime - MAX_TIME_WINDOW);
        const maxT = Math.max(MAX_TIME_WINDOW, currentTime);

        // Velocity graph is symmetric around zero to make direction changes clear
        let maxV = 10;
        for (let i = 0; i < dataPoints.length; i++) {
            const absV = Math.abs(dataPoints[i].v);
            if (absV > maxV) maxV = absV;
        }
        maxV = Math.ceil((maxV + 2) / 5) * 5;
        const minV = -maxV;

        const xCoord = (t) => margin.left + ((t - minT) / (maxT - minT)) * plotW;
        const yCoord = (v) => margin.top + plotH - ((v - minV) / (maxV - minV)) * plotH;

        // Grid lines
        velCtx.strokeStyle = PLOT_COLORS.grid;
        velCtx.lineWidth = 1;

        velCtx.fillStyle = PLOT_COLORS.text;
        velCtx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        velCtx.textAlign = 'right';
        velCtx.textBaseline = 'middle';

        // Horizontal grid
        [-maxV, -maxV / 2, 0, maxV / 2, maxV].forEach(val => {
            const py = yCoord(val);
            velCtx.beginPath();
            velCtx.moveTo(margin.left, py);
            velCtx.lineTo(w - margin.right, py);
            velCtx.stroke();

            velCtx.fillText(`${Math.round(val)}`, margin.left - 6, py);
        });

        // Prominent dashed zero line (Newton's 1st Law visual reference)
        const zeroY = yCoord(0);
        velCtx.strokeStyle = PLOT_COLORS.axis;
        velCtx.lineWidth = 1.4;
        velCtx.setLineDash([4, 3]);
        velCtx.beginPath();
        velCtx.moveTo(margin.left, zeroY);
        velCtx.lineTo(w - margin.right, zeroY);
        velCtx.stroke();
        velCtx.setLineDash([]); // Reset dash

        // Time axis ticks
        velCtx.textAlign = 'center';
        velCtx.textBaseline = 'top';
        const tSteps = 4;
        for (let i = 0; i <= tSteps; i++) {
            const tVal = minT + (i / tSteps) * (maxT - minT);
            const px = xCoord(tVal);
            velCtx.fillText(`${tVal.toFixed(0)}s`, px, h - margin.bottom + 5);
        }

        // Draw Velocity curve
        if (dataPoints.length > 1) {
            // Fill area towards zero line
            velCtx.beginPath();
            velCtx.moveTo(xCoord(dataPoints[0].t), zeroY);
            for (let i = 0; i < dataPoints.length; i++) {
                velCtx.lineTo(xCoord(dataPoints[i].t), yCoord(dataPoints[i].v));
            }
            velCtx.lineTo(xCoord(dataPoints[dataPoints.length - 1].t), zeroY);
            velCtx.closePath();
            velCtx.fillStyle = PLOT_COLORS.velocityFill;
            velCtx.fill();

            // Stroke line
            velCtx.beginPath();
            velCtx.moveTo(xCoord(dataPoints[0].t), yCoord(dataPoints[0].v));
            for (let i = 1; i < dataPoints.length; i++) {
                velCtx.lineTo(xCoord(dataPoints[i].t), yCoord(dataPoints[i].v));
            }
            velCtx.strokeStyle = PLOT_COLORS.velocity;
            velCtx.lineWidth = 2.2;
            velCtx.lineJoin = 'round';
            velCtx.stroke();

            // End marker
            const lastPt = dataPoints[dataPoints.length - 1];
            const endX = xCoord(lastPt.t);
            const endY = yCoord(lastPt.v);

            velCtx.fillStyle = PLOT_COLORS.velocity;
            velCtx.beginPath();
            velCtx.arc(endX, endY, 4, 0, Math.PI * 2);
            velCtx.fill();

            velCtx.strokeStyle = '#ffffff';
            velCtx.lineWidth = 1.5;
            velCtx.beginPath();
            velCtx.arc(endX, endY, 4, 0, Math.PI * 2);
            velCtx.stroke();
        }

        velCtx.restore();
    }

    // Initialize once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMotionGraphs);
    } else {
        initMotionGraphs();
    }

    // Expose clear function globally
    window.clearMotionGraphs = clearGraphs;
})();
