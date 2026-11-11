const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('score');
const healthDisplay = document.getElementById('health');
const waveDisplay = document.getElementById('wave');
const finalScoreDisplay = document.getElementById('final-score');

let gameState = 'start';
let score = 0;
let wave = 1;
let enemiesPerWave = 5;

const keys = {};
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: 5,
    health: 100,
    maxHealth: 100
};

let playerBullets = [];
let enemies = [];
let enemyBullets = [];
let stars = [];
let particles = [];

// Joystick variables
let joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    radius: 50,
    maxDistance: 30
};

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2;
        this.speed = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.color = color;
        this.life = 30;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        this.size *= 0.96;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class Spit {
    constructor(x, y, speed, color) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 8;
        this.speed = speed;
        this.color = color;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        // Draw spit as a dripping blob
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x + 4, this.y, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Caterpillar {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 30;
        this.speed = Math.random() * 1.5 + 0.5;
        this.directionX = Math.random() < 0.5 ? -1 : 1;
        this.health = 2;
        this.shootTimer = Math.random() * 120 + 60;
        this.color = `hsl(${Math.random() * 60 + 80}, 70%, 50%)`;
        this.wiggle = 0;
    }

    update() {
        this.x += this.directionX * this.speed;
        this.y += this.speed * 0.3;
        this.wiggle += 0.1;

        if (this.x < 0 || this.x + this.width > canvas.width) {
            this.directionX *= -1;
        }

        this.shootTimer--;
        if (this.shootTimer <= 0) {
            this.shoot();
            this.shootTimer = Math.random() * 120 + 60;
        }
    }

    shoot() {
        enemyBullets.push(new Spit(this.x + this.width / 2 - 4, this.y + this.height, 5, '#88ff00'));
    }

    draw() {
        // Draw caterpillar body segments
        const segmentCount = 5;
        const segmentSize = 10;

        for (let i = 0; i < segmentCount; i++) {
            const offsetX = Math.sin(this.wiggle + i * 0.5) * 3;
            const x = this.x + i * (segmentSize - 2) + offsetX;
            const y = this.y + this.height / 2;

            ctx.fillStyle = i % 2 === 0 ? this.color : this.color.replace('50%', '40%');
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.arc(x + segmentSize / 2, y, segmentSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw head (last segment)
        const headX = this.x + (segmentCount - 1) * (segmentSize - 2);
        const headY = this.y + this.height / 2;

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(headX + segmentSize / 2 - 2, headY - 2, 2, 0, Math.PI * 2);
        ctx.arc(headX + segmentSize / 2 + 2, headY - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }
}

function createStars() {
    for (let i = 0; i < 100; i++) {
        stars.push(new Star());
    }
}

function spawnWave() {
    enemies = [];
    for (let i = 0; i < enemiesPerWave; i++) {
        const x = Math.random() * (canvas.width - 50);
        const y = Math.random() * -300 - 50;
        enemies.push(new Caterpillar(x, y));
    }
}

function drawPlayer() {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;

    // Body
    ctx.fillStyle = '#ff6b9d';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff6b9d';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 5, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ff8fb3';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 10, 15, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX - 6, centerY - 12, 5, 0, Math.PI * 2);
    ctx.arc(centerX + 6, centerY - 12, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(centerX - 6, centerY - 11, 2, 0, Math.PI * 2);
    ctx.arc(centerX + 6, centerY - 11, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (open for spitting)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 5, 4, 0, Math.PI);
    ctx.stroke();

    // Arms/tentacles
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 15, centerY);
    ctx.lineTo(centerX - 25, centerY + 10);
    ctx.moveTo(centerX + 15, centerY);
    ctx.lineTo(centerX + 25, centerY + 10);
    ctx.stroke();

    ctx.shadowBlur = 0;
}

function updatePlayer() {
    // Keyboard controls
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    // Joystick controls
    if (joystick.active) {
        const deltaX = joystick.currentX - joystick.startX;
        const moveX = (deltaX / joystick.maxDistance) * player.speed;

        player.x += moveX;
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    }
}

function shoot() {
    playerBullets.push(new Spit(player.x + player.width / 2 - 4, player.y, -8, '#00ffff'));
}

function checkCollisions() {
    playerBullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {

                playerBullets.splice(bulletIndex, 1);
                enemy.health--;

                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color));
                }

                if (enemy.health <= 0) {
                    enemies.splice(enemyIndex, 1);
                    score += 10;
                    scoreDisplay.textContent = `Score: ${score}`;

                    for (let i = 0; i < 15; i++) {
                        particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color));
                    }
                }
            }
        });
    });

    enemyBullets.forEach((bullet, bulletIndex) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {

            enemyBullets.splice(bulletIndex, 1);
            player.health -= 10;
            healthDisplay.textContent = `Health: ${player.health}`;

            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#00ffff'));
            }

            if (player.health <= 0) {
                gameOver();
            }
        }
    });

    enemies.forEach((enemy) => {
        if (enemy.y + enemy.height > player.y &&
            enemy.x < player.x + player.width &&
            enemy.x + enemy.width > player.x) {

            player.health -= 50;
            healthDisplay.textContent = `Health: ${player.health}`;

            if (player.health <= 0) {
                gameOver();
            }
        }
    });
}

function drawJoystick() {
    if (!joystick.active) return;

    // Draw base
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(joystick.startX, joystick.startY, joystick.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw stick
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(joystick.currentX, joystick.currentY, 20, 0, Math.PI * 2);
    ctx.fill();
}

function updateGame() {
    if (gameState !== 'playing') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
        star.update();
        star.draw();
    });

    updatePlayer();
    drawPlayer();

    playerBullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.y < 0) {
            playerBullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
        }
    });

    enemyBullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.y > canvas.height) {
            enemyBullets.splice(index, 1);
        }
    });

    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });

    checkCollisions();

    drawJoystick();

    if (enemies.length === 0) {
        wave++;
        enemiesPerWave += 2;
        waveDisplay.textContent = `Wave: ${wave}`;
        spawnWave();
    }

    requestAnimationFrame(updateGame);
}

function startGame() {
    gameState = 'playing';
    score = 0;
    wave = 1;
    enemiesPerWave = 5;
    player.health = player.maxHealth;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    playerBullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];

    scoreDisplay.textContent = `Score: ${score}`;
    healthDisplay.textContent = `Health: ${player.health}`;
    waveDisplay.textContent = `Wave: ${wave}`;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    spawnWave();
    updateGame();
}

function gameOver() {
    gameState = 'gameOver';
    finalScoreDisplay.textContent = `Final Score: ${score}`;
    gameOverScreen.classList.remove('hidden');
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if ((e.key === 'Shift' || e.shiftKey) && gameState === 'playing') {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Touch controls for joystick
canvas.addEventListener('touchstart', (e) => {
    if (gameState !== 'playing') return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    joystick.active = true;
    joystick.startX = touch.clientX - rect.left;
    joystick.startY = touch.clientY - rect.top;
    joystick.currentX = joystick.startX;
    joystick.currentY = joystick.startY;
});

canvas.addEventListener('touchmove', (e) => {
    if (!joystick.active) return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    let touchX = touch.clientX - rect.left;
    let touchY = touch.clientY - rect.top;

    // Limit joystick movement
    const dx = touchX - joystick.startX;
    const dy = touchY - joystick.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > joystick.maxDistance) {
        const angle = Math.atan2(dy, dx);
        joystick.currentX = joystick.startX + Math.cos(angle) * joystick.maxDistance;
        joystick.currentY = joystick.startY + Math.sin(angle) * joystick.maxDistance;
    } else {
        joystick.currentX = touchX;
        joystick.currentY = touchY;
    }
});

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        joystick.active = false;
    }
});

// Mouse controls for joystick (for desktop testing)
canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    joystick.active = true;
    joystick.startX = e.clientX - rect.left;
    joystick.startY = e.clientY - rect.top;
    joystick.currentX = joystick.startX;
    joystick.currentY = joystick.startY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!joystick.active) return;

    const rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    const dx = mouseX - joystick.startX;
    const dy = mouseY - joystick.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > joystick.maxDistance) {
        const angle = Math.atan2(dy, dx);
        joystick.currentX = joystick.startX + Math.cos(angle) * joystick.maxDistance;
        joystick.currentY = joystick.startY + Math.sin(angle) * joystick.maxDistance;
    } else {
        joystick.currentX = mouseX;
        joystick.currentY = mouseY;
    }
});

canvas.addEventListener('mouseup', () => {
    joystick.active = false;
});

canvas.addEventListener('mouseleave', () => {
    joystick.active = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

createStars();
