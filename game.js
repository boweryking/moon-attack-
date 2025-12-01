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
    width: 40,
    height: 40,
    speed: 5,
    health: 100,
    maxHealth: 100
};

let playerBullets = [];
let enemies = [];
let enemyBullets = [];
let stars = [];
let particles = [];

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

class Bullet {
    constructor(x, y, speed, color) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.speed = speed;
        this.color = color;
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = Math.random() * 1.5 + 0.5;
        this.directionX = Math.random() < 0.5 ? -1 : 1;
        this.health = 2;
        this.shootTimer = Math.random() * 120 + 60;
        this.color = `hsl(${Math.random() * 60 + 280}, 100%, 50%)`;
    }

    update() {
        this.x += this.directionX * this.speed;
        this.y += this.speed * 0.3;

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
        enemyBullets.push(new Bullet(this.x + this.width / 2 - 2, this.y + this.height, 5, '#ff0000'));
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height * 0.7);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + this.width / 2 - 3, this.y + 10, 6, 6);

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
        const x = Math.random() * (canvas.width - 40);
        const y = Math.random() * -300 - 50;
        enemies.push(new Enemy(x, y));
    }
}

function drawPlayer() {
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';

    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 5, player.y + player.height - 15, 8, 10);
    ctx.fillRect(player.x + player.width - 13, player.y + player.height - 15, 8, 10);

    ctx.shadowBlur = 0;
}

function updatePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
}

function shoot() {
    playerBullets.push(new Bullet(player.x + player.width / 2 - 2, player.y, -8, '#00ffff'));
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

    if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

createStars();
