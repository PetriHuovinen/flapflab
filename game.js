// Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');

// Set canvas size
canvas.width = 600;
canvas.height = 900;

// Game constants
const GRAVITY = 0.15;
const FLAP_POWER = -5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 240;
const PIPE_SPEED = -2.5;
const PIPE_SPAWN_RATE = 90; // pixels between pipes

// Bird object
const bird = {
    x: 50,
    y: 150,
    width: 30,
    height: 30,
    velocityY: 0,
    color: '#FFD700'
};

// Game state
let pipes = [];
let isGameRunning = true;
let score = 0;
let frameCount = 0;

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isGameRunning) {
            bird.velocityY = FLAP_POWER;
        } else {
            resetGame();
        }
    }
});

document.addEventListener('click', () => {
    if (isGameRunning) {
        bird.velocityY = FLAP_POWER;
    } else {
        resetGame();
    }
});

// Spawn pipes
function spawnPipe() {
    const minPipeY = 50;
    const maxPipeY = canvas.height - PIPE_GAP - 50;
    const randomPipeY = Math.random() * (maxPipeY - minPipeY) + minPipeY;

    pipes.push({
        x: canvas.width,
        topHeight: randomPipeY,
        bottomY: randomPipeY + PIPE_GAP,
        scored: false
    });
}

// Update game state
function update() {
    // Apply gravity to bird
    bird.velocityY += GRAVITY;
    bird.y += bird.velocityY;

    // Spawn new pipes
    if (frameCount % PIPE_SPAWN_RATE === 0) {
        spawnPipe();
    }

    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x += PIPE_SPEED;

        // Check if bird passed pipe
        if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
            pipes[i].scored = true;
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
        }

        // Remove pipe if off screen
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }

    // Check collisions
    checkCollision();

    frameCount++;
}

// Check collision with pipes and ground/ceiling
function checkCollision() {
    // Check ground and ceiling
    if (bird.y + bird.height >= canvas.height || bird.y <= 0) {
        endGame();
        return;
    }

    // Check pipe collisions
    for (let pipe of pipes) {
        // Check collision with top pipe
        if (
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.x + bird.width > pipe.x &&
            bird.y < pipe.topHeight
        ) {
            endGame();
            return;
        }

        // Check collision with bottom pipe
        if (
            bird.x < pipe.x + PIPE_WIDTH &&
            bird.x + bird.width > pipe.x &&
            bird.y + bird.height > pipe.bottomY
        ) {
            endGame();
            return;
        }
    }
}

// Draw bird
function drawBird() {
    // Draw bird body
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(bird.x + bird.width / 2, bird.y + bird.height / 2, bird.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(bird.x + bird.width / 2 + 5, bird.y + bird.height / 2 - 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw pupil
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(bird.x + bird.width / 2 + 6, bird.y + bird.height / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw beak
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.moveTo(bird.x + bird.width, bird.y + bird.height / 2);
    ctx.lineTo(bird.x + bird.width + 8, bird.y + bird.height / 2 - 2);
    ctx.lineTo(bird.x + bird.width + 8, bird.y + bird.height / 2 + 2);
    ctx.fill();
}

// Draw pipes
function drawPipes() {
    for (let pipe of pipes) {
        // Top pipe
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, canvas.height - pipe.bottomY);

        // Pipe details
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.strokeRect(pipe.x, pipe.bottomY, PIPE_WIDTH, canvas.height - pipe.bottomY);
    }
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game elements
    drawPipes();
    drawBird();
}

// End game
function endGame() {
    isGameRunning = false;
    finalScoreDisplay.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Reset game
function resetGame() {
    bird.y = 150;
    bird.velocityY = 0;
    pipes = [];
    score = 0;
    frameCount = 0;
    isGameRunning = true;
    scoreDisplay.textContent = 'Score: 0';
    gameOverScreen.classList.add('hidden');
}

// Game loop
function gameLoop() {
    if (isGameRunning) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
