const canvas = document.getElementById('bouquetCanvas');
const ctx = canvas.getContext('2d');
const prelude = document.getElementById('prelude');
const messageContainer = document.getElementById('message-container');

let width, height;
let flowers = [];
let animationStarted = false;
let mouse = { x: -1000, y: -1000 };

const ROSE_PALETTES = [
    {
        inner: '#4a0404',
        middle: '#8b0000',
        outer: '#e0115f',
        stroke: 'rgba(224, 17, 95, 0.2)'
    },
    {
        inner: '#450a26',
        middle: '#9d1b55',
        outer: '#d13a7d',
        stroke: 'rgba(209, 58, 125, 0.2)'
    },
    {
        inner: '#5a3d0a',
        middle: '#c68d3a',
        outer: '#e8bc6f',
        stroke: 'rgba(232, 188, 111, 0.2)'
    }
];

const PALETTE = {
    greens: ['#0b2b00', '#1B3022', '#26413C', '#032202'],
    foliage: '#0b2b00'
};

const GOLDEN_ANGLE = 137.5 * Math.PI / 180;
const SLOW_GROWTH = 0.005;
const SWAY_SPEED = 0.0005;

let wind = {
    force: 0,
    targetForce: 0,
    direction: 1,
    time: 0
};

function updateWind() {
    wind.time += 0.01;
    wind.force += (wind.targetForce - wind.force) * 0.05;

    if (Math.random() < 0.005 && wind.targetForce === 0) {
        wind.targetForce = 2 + Math.random() * 3;
        wind.direction = Math.random() > 0.5 ? 1 : -1;
        setTimeout(() => {
            wind.targetForce = 0;
        }, 2000 + Math.random() * 3000);
    }
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

class Noise {
    constructor() {
        this.p = new Uint8Array(512);
        for (let i = 0; i < 256; i++) this.p[i] = i;
        for (let i = 255; i > 0; i--) {
            const r = Math.floor(Math.random() * (i + 1));
            [this.p[i], this.p[r]] = [this.p[r], this.p[i]];
        }
        for (let i = 0; i < 256; i++) this.p[256 + i] = this.p[i];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    perlin(x, y, z) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = this.fade(x), v = this.fade(y), w = this.fade(z);
        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;
        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y, z),
            this.grad(this.p[BA], x - 1, y, z)),
            this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                this.grad(this.p[BB], x - 1, y - 1, z))),
            this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
    }
}

const perlin = new Noise();

function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    if (animationStarted) {
        initFlowers();
        initFillers();
        initBaseLayer();
        initParticles();
    }
}

window.addEventListener('resize', resize);
resize();

class Flower {
    constructor(index, total) {
        this.index = index;
        this.total = total;
        this.reset();
    }

    reset() {
        const phi = GOLDEN_ANGLE;
        const n = this.index;
        const c = 35;
        const radius = c * Math.sqrt(n);
        const angle = n * phi;

        this.palette = ROSE_PALETTES[Math.floor(Math.random() * ROSE_PALETTES.length)];

        this.baseX = width / 2;
        this.baseY = height * 0.9;

        const spiralX = Math.cos(angle) * radius * 1.4;
        const spiralY = Math.sin(angle) * radius * 0.7; 

        this.targetX = this.baseX + spiralX;
        this.targetY = this.baseY - (height * 0.4) + spiralY;

        this.stemColor = PALETTE.greens[Math.floor(Math.random() * PALETTE.greens.length)];
        this.growth = 0;
        this.growthSpeed = SLOW_GROWTH * (0.8 + Math.random() * 0.4);
        this.size = 28 + Math.random() * 12;
        this.swayOffset = Math.random() * Math.PI * 2;
        
        this.vDensity = 3 + Math.random() * 2;
        this.curve1 = 0.5 + Math.random() * 0.6;
        this.curve2 = 0.1 + Math.random() * 0.2;
        this.maxTheta = (5 + Math.floor(Math.random() * 5)) * 2 * Math.PI;

        this.points = this.generateStemPoints();
        this.leaves = this.generateLeaves();
        this.zIndex = this.targetY;
        this.cachedPath = null;
        this.lastOpening = -1;
    }

    generateStemPoints() {
        const points = [];
        const segments = 20;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const curve = Math.sin(t * Math.PI) * 20 * (this.index % 2 === 0 ? 1 : -1);
            const x = this.baseX + (this.targetX - this.baseX) * t + curve;
            const y = this.baseY + (this.targetY - this.baseY) * t;
            points.push({ x, y });
        }
        return points;
    }

    generateLeaves() {
        const leaves = [];
        const leafCount = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < leafCount; i++) {
            const t = 0.1 + (i / leafCount) * 0.7 + Math.random() * 0.05;
            const baseSize = 5 + Math.random() * 8;
            const size = baseSize * (1.2 - t * 0.5); 
            
            leaves.push({
                t: t,
                side: i % 2 === 0 ? 1 : -1,
                size: size,
                angle: (Math.random() - 0.5) * 0.6
            });
        }
        return leaves;
    }

    draw() {
        if (this.growth <= 0) return;

        const dx = (mouse.x - width / 2) / (width / 2);
        const dy = (mouse.y - height / 2) / (height / 2);
        const interactiveSwayX = dx * 10;
        const interactiveSwayY = dy * 5;

        const time = Date.now() * SWAY_SPEED;
        const windSwayX = wind.force * wind.direction * 15;
        const noiseX = perlin.perlin(time, this.swayOffset, 0) * 15 + interactiveSwayX + windSwayX;
        const noiseY = perlin.perlin(time + 100, this.swayOffset, 0) * 8 + interactiveSwayY;
        
        ctx.save();
        
        const stemGrowth = Math.min(1, this.growth * 1.5);
        const limit = Math.floor(this.points.length * stemGrowth);
        
        if (limit > 1) {
            ctx.beginPath();
            const grad = ctx.createLinearGradient(this.points[0].x, this.points[0].y, this.points[limit-1].x, this.points[limit-1].y);
            grad.addColorStop(0, '#032202');
            grad.addColorStop(1, this.stemColor);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 4 * (1 - stemGrowth * 0.5); // Tapering
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < limit; i++) {
                const p = this.points[i];
                const t = i / (this.points.length - 1);
                ctx.lineTo(p.x + noiseX * t, p.y + noiseY * t);
            }
            ctx.stroke();

            // Draw small stem leaves
            this.leaves.forEach(leaf => {
                if (stemGrowth > leaf.t) {
                    const idx = Math.floor(leaf.t * (this.points.length - 1));
                    const p = this.points[idx];
                    const t = idx / (this.points.length - 1);
                    const lx = p.x + noiseX * t;
                    const ly = p.y + noiseY * t;
                    
                    ctx.save();
                    ctx.translate(lx, ly);
                    ctx.rotate(leaf.side * Math.PI / 4 + leaf.angle);
                    ctx.beginPath();
                    ctx.fillStyle = this.stemColor;
                    // Organic stem leaf
                    const lw = leaf.size;
                    const lh = leaf.size * 1.5;
                    ctx.moveTo(0, 0);
                    ctx.bezierCurveTo(-lw * 0.5, -lh * 0.2, -lw * 0.5, -lh * 0.8, 0, -lh);
                    ctx.bezierCurveTo(lw * 0.5, -lh * 0.8, lw * 0.5, -lh * 0.2, 0, 0);
                    ctx.fill();
                    ctx.restore();
                }
            });
        }

        // Draw Rose
        if (this.growth > 0.5) {
            const flowerGrowth = (this.growth - 0.5) / 0.5;
            const head = this.points[this.points.length - 1];
            
            // Subtle shadow for depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;
            
            this.drawRose(head.x + noiseX, head.y + noiseY, flowerGrowth);
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }

        ctx.restore();
    }

    drawRose(x, y, growth) {
        const opening = easeInOutCubic(growth);
        
        if (opening === this.lastOpening && this.cachedPath) {
            ctx.save();
            ctx.translate(x, y);
            const scale = this.size * 1.5;
            const grad = ctx.createRadialGradient(0, -scale * 0.2, 0, 0, 0, scale);
            grad.addColorStop(0, this.palette.inner);
            grad.addColorStop(0.5, this.palette.middle);
            grad.addColorStop(1, this.palette.outer);
            ctx.fillStyle = grad;
            ctx.fill(this.cachedPath);
            ctx.strokeStyle = this.palette.stroke;
            ctx.lineWidth = 0.5;
            ctx.stroke(this.cachedPath);
            ctx.restore();
            return;
        }

        const cols = 200; 
        const rows = 10;
        const vDensity = this.vDensity;
        const pAlign = this.swayOffset;
        const curve1 = this.curve1;
        const curve2 = this.curve2;
        const scale = this.size * 1.5;

        ctx.save();
        ctx.translate(x, y);

        const grad = ctx.createRadialGradient(0, -scale * 0.2, 0, 0, 0, scale);
        grad.addColorStop(0, this.palette.inner);
        grad.addColorStop(0.5, this.palette.middle);
        grad.addColorStop(1, this.palette.outer);
        ctx.fillStyle = grad;

        const path = new Path2D();
        let first = true;

        for (let j = 0; j < rows; j++) {
            const v = j / rows;
            const phi = v * Math.PI / 2;
            const maxTheta = this.maxTheta; 
            
            for (let i = 0; i < cols; i++) {
                const theta = (i / cols) * maxTheta;
                const f = Math.sin(phi) * Math.pow(opening, 0.7);
                const petalMod = (1 - Math.sin(phi)) * Math.cos(vDensity * theta + pAlign);
                const r = scale * f * (1 + curve1 * petalMod);
                
                const px = r * Math.cos(theta);
                const py = r * Math.sin(theta);
                const pz = (r * curve2) - (f * scale * 0.4);
                
                const projX = px;
                const projY = py + pz;

                if (first) {
                    path.moveTo(projX, projY);
                    first = false;
                } else {
                    path.lineTo(projX, projY);
                }
            }
        }
        
        this.cachedPath = path;
        this.lastOpening = opening;

        ctx.fill(path);
        ctx.strokeStyle = this.palette.stroke;
        ctx.lineWidth = 0.5;
        ctx.stroke(path);

        ctx.restore();
    }

    adjustColor(hex, amount) {
        let usePound = false;
        if (hex[0] === "#") {
            hex = hex.slice(1);
            usePound = true;
        }
        let num = parseInt(hex.slice(0, 6), 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255; else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    update() {
        if (this.growth < 1) {
            this.growth += this.growthSpeed;
        }
    }
}

class Filler {
    constructor(type) {
        this.type = type;
        this.reset();
    }

    reset() {
        const angleRange = Math.PI * 0.8;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * angleRange;
        
        this.baseX = width / 2;
        this.baseY = height * 0.9;
        
        const length = Math.min(width, height) * (0.2 + Math.random() * 0.4);
        
        this.targetX = this.baseX + Math.cos(angle) * length;
        this.targetY = this.baseY + Math.sin(angle) * length;
        
        this.color = PALETTE.greens[Math.floor(Math.random() * PALETTE.greens.length)];
        this.growth = 0;
        this.growthSpeed = SLOW_GROWTH * (1 + Math.random());
        this.swayOffset = Math.random() * Math.PI * 2;
        this.zIndex = this.targetY - 20;
        
        // Shape variance
        this.leafWidth = 15 + Math.random() * 10;
        this.leafHeight = 40 + Math.random() * 20;
    }

    draw() {
        if (this.growth <= 0) return;
        const time = Date.now() * SWAY_SPEED;
        const windSway = wind.force * wind.direction * 10 * this.growth;
        const sway = perlin.perlin(time, this.swayOffset, 0) * 8 * this.growth + windSway;
        
        ctx.save();
        const gx = this.baseX + (this.targetX - this.baseX) * this.growth;
        const gy = this.baseY + (this.targetY - this.baseY) * this.growth;
        
        if (this.type === 'eucalyptus') {
            this.drawEucalyptus(gx + sway, gy, this.growth);
        } else {
            this.drawLeaf(gx + sway, gy, this.growth);
        }
        ctx.restore();
    }

    drawEucalyptus(x, y, growth) {
        ctx.beginPath();
        ctx.strokeStyle = '#2F4F4F';
        ctx.lineWidth = 2 * growth;
        ctx.moveTo(this.baseX, this.baseY);
        ctx.bezierCurveTo(this.baseX, this.baseY - 100, x, y + 100, x, y);
        ctx.stroke();

        for (let i = 1; i < 6; i++) {
            const t = i / 6;
            const lx = this.baseX + (x - this.baseX) * t;
            const ly = this.baseY + (y - this.baseY) * t;
            
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(Math.sin(i + growth + this.swayOffset) * 0.5);
            ctx.beginPath();
            ctx.fillStyle = '#5B7C72';
            ctx.globalAlpha = 0.6;
            ctx.ellipse(0, 0, 8 * growth, 12 * growth, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    drawLeaf(x, y, growth) {
        ctx.beginPath();
        ctx.strokeStyle = '#0b2b00';
        ctx.lineWidth = 3 * growth;
        ctx.moveTo(this.baseX, this.baseY);
        ctx.bezierCurveTo(this.baseX, this.baseY - 100, x, y + 100, x, y);
        ctx.stroke();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.swayOffset + growth);
        ctx.beginPath();
        ctx.fillStyle = '#0b2b00';
        // Organic leaf shape
        const lw = this.leafWidth * growth;
        const lh = this.leafHeight * growth;
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-lw, -lh * 0.2, -lw, -lh * 0.8, 0, -lh);
        ctx.bezierCurveTo(lw, -lh * 0.8, lw, -lh * 0.2, 0, 0);
        ctx.fill();
        ctx.restore();
    }

    update() {
        if (this.growth < 1) this.growth += this.growthSpeed;
    }
}

let fillers = [];
let baseFoliage = [];

function initFlowers() {
    flowers = [];
    const count = 15; // Reduced for performance and "handheld" look
    for (let i = 0; i < count; i++) {
        flowers.push(new Flower(i, count));
    }
}

function initFillers() {
    fillers = [];
    const count = 6; // Drastically reduced filler count
    for (let i = 0; i < count; i++) {
        fillers.push(new Filler(Math.random() > 0.6 ? 'eucalyptus' : 'leaf'));
    }
}

function initBaseLayer() {
    baseFoliage = [];
    const foliageCount = 4; // Reduced from 12
    for (let i = 0; i < foliageCount; i++) {
        baseFoliage.push({
            angle: Math.random() * Math.PI * 2,
            dist: 40 + Math.random() * 100, // Slightly more compact distribution
            rotation: Math.random() * Math.PI * 2,
            scale: 0.2 + Math.random() * 0.4
        });
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    updateWind();
    drawVignette();
    
    // Combine and sort by zIndex for proper layering
    const allElements = [...flowers, ...fillers];
    allElements.sort((a, b) => a.zIndex - b.zIndex);

    drawBaseLayer();

    allElements.forEach(el => {
        el.update();
        el.draw();
    });

    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

function drawVignette() {
    const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7);
    grad.addColorStop(0, 'rgba(255, 251, 242, 0)');
    grad.addColorStop(1, 'rgba(74, 55, 40, 0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
}

function drawBaseLayer() {
    if (!animationStarted) return;
    const firstGrowth = flowers.length > 0 ? flowers[0].growth : 0;
    if (firstGrowth < 0.05) return;

    ctx.save();
    const alpha = Math.min(1, firstGrowth * 3);
    ctx.globalAlpha = alpha;
    
    const centerX = width / 2;
    const centerY = height * 0.85;
    
    // Gradient for deeper foliage
    const foliageGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 300);
    foliageGrad.addColorStop(0, '#032202');
    foliageGrad.addColorStop(1, '#0b2b00');
    ctx.fillStyle = foliageGrad;
    
    // Solid base
    ctx.beginPath();
    ctx.arc(centerX, centerY + 20, 60, 0, Math.PI * 2);
    ctx.fill();

    baseFoliage.forEach(leaf => {
        const lx = centerX + Math.cos(leaf.angle) * leaf.dist;
        const ly = centerY + Math.sin(leaf.angle) * leaf.dist * 0.3;
        
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leaf.rotation);
        ctx.scale(leaf.scale, leaf.scale);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-40, -40, -40, 40, 0, 70);
        ctx.bezierCurveTo(40, 40, 40, -40, 0, 0);
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();
}


class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -0.5 - Math.random() * 0.5;
        this.size = 1 + Math.random() * 2;
        this.alpha = Math.random() * 0.5;
        this.color = ['#fff', '#ffd700', '#ffb7c5'][Math.floor(Math.random() * 3)];
    }

    update() {
        // Apply wind force to horizontal velocity
        const windEffect = wind.force * wind.direction * 1.5; // Increased from 0.2
        this.x += this.vx + windEffect;
        this.y += this.vy * (1 - wind.force * 0.1); // Slow down vertical movement during strong wind
        this.alpha -= 0.001;
        if (this.y < -50 || this.y > height + 50 || this.alpha <= 0 || this.x < -100 || this.x > width + 100) {
            this.reset();
            if (wind.force > 0.5) {
                // If there's wind, reset to the side it's blowing from
                this.x = wind.direction > 0 ? -20 : width + 20;
                this.y = Math.random() * height;
            } else {
                this.y = height + 10;
                this.x = Math.random() * width;
            }
            this.alpha = Math.random() * 0.5;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

let particles = [];
function initParticles() {
    particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
    }
}

function startAnimation() {
    if (animationStarted) return;
    animationStarted = true;
    prelude.classList.add('fade-out');
    
    // Show the flower message if it's not empty
    if (messageContainer.innerText.trim() !== "") {
        setTimeout(() => {
            messageContainer.classList.add('visible');
        }, 2000);
    }

    initFlowers();
    initFillers();
    initBaseLayer();
    initParticles();
    animate();
}

prelude.addEventListener('click', startAnimation);
window.addEventListener('touchstart', startAnimation);
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Initial subtle draw for background feel
resize();
