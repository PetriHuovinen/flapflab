// Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');
const shopDisplay = document.getElementById('shopDisplay');
const balanceDisplay = document.getElementById('balanceDisplay');
const flapPowerDisplay = document.getElementById('flapPowerDisplay');

// Stripe elements
const paymentModal = document.getElementById('paymentModal');
const closeModal = document.querySelector('.close-modal');
const paymentForm = document.getElementById('payment-form');
const submitPaymentBtn = document.getElementById('submit-payment');
const cardErrors = document.getElementById('card-errors');

let stripe;
let elements;
let cardElement;

// Initialize Stripe
async function initStripe() {
    try {
        const response = await fetch('/config');
        const { publishableKey } = await response.json();
        
        stripe = Stripe(publishableKey);
        elements = stripe.elements();
        cardElement = elements.create('card');
        cardElement.mount('#card-element');
        
        // Handle card errors
        cardElement.addEventListener('change', (event) => {
            if (event.error) {
                cardErrors.textContent = event.error.message;
            } else {
                cardErrors.textContent = '';
            }
        });
    } catch (error) {
        console.error('Error initializing Stripe:', error);
    }
}

// Set canvas size
canvas.width = 600;
canvas.height = 900;

// Game constants
const GRAVITY = 0.15;
const BASE_FLAP_POWER = -5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 240;
const PIPE_SPEED = -2.5;
const PIPE_SPAWN_RATE = 90; // pixels between pipes

// Purchase system constants
const FLAP_POWER_PACKAGES = [
    { id: 1, name: '+10% Flap', multiplier: 1.1, freeCost: 99, realCost: 99 },
    { id: 2, name: '+25% Flap', multiplier: 1.25, freeCost: 199, realCost: 199 },
    { id: 3, name: '+50% Flap', multiplier: 1.5, freeCost: 399, realCost: 399 },
    { id: 4, name: 'Double Flap', multiplier: 2.0, freeCost: 799, realCost: 799 }
];
const STARTING_BALANCE = 500; // Free currency to start

// Bird object
const bird = {
    x: 50,
    y: 150,
    width: 30,
    height: 30,
    velocityY: 0,
    color: '#FFD700',
    flapMultiplier: 1.0
};

// Game state
let pipes = [];
let isGameRunning = true;
let score = 0;
let frameCount = 0;
let playerBalance = STARTING_BALANCE;
let purchasedFlapMultiplier = 1.0;

// Load player data from localStorage
function loadPlayerData() {
    const savedData = localStorage.getItem('flapflapPlayerData');
    if (savedData) {
        const data = JSON.parse(savedData);
        playerBalance = data.balance || STARTING_BALANCE;
        purchasedFlapMultiplier = data.flapMultiplier || 1.0;
    }
    updateDisplays();
}

// Save player data to localStorage
function savePlayerData() {
    const data = {
        balance: playerBalance,
        flapMultiplier: purchasedFlapMultiplier
    };
    localStorage.setItem('flapflapPlayerData', JSON.stringify(data));
}

// Update shop and balance displays
function updateDisplays() {
    balanceDisplay.textContent = `$ ${playerBalance}`;
    flapPowerDisplay.textContent = `Flap Power: ${(purchasedFlapMultiplier * 100).toFixed(0)}%`;
}

// Purchase flap power
function purchaseFlapPower(packageId) {
    const pkg = FLAP_POWER_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;
    
    if (playerBalance >= pkg.freeCost) {
        // Use free currency
        playerBalance -= pkg.freeCost;
        purchasedFlapMultiplier = pkg.multiplier;
        bird.flapMultiplier = purchasedFlapMultiplier;
        savePlayerData();
        updateDisplays();
        alert('Purchased: ' + pkg.name + '!');
    } else {
        // Open payment modal for real money
        openPaymentModal(packageId);
    }
}

// Add free bonus currency
function addBonusBalance(amount) {
    playerBalance += amount;
    savePlayerData();
    updateDisplays();
}

// Open payment modal
function openPaymentModal(packageId) {
    const pkg = FLAP_POWER_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;
    
    // Store the package ID for use in payment submission
    paymentForm.dataset.packageId = packageId;
    
    // Update modal with package info
    document.getElementById('paymentPackageName').textContent = pkg.name;
    document.getElementById('paymentAmount').textContent = '$' + (pkg.realCost / 100).toFixed(2);
    
    // Reset form
    cardElement.clear();
    cardErrors.textContent = '';
    paymentModal.classList.remove('hidden');
}

// Close payment modal
function closePaymentModal() {
    paymentModal.classList.add('hidden');
    cardElement.clear();
    cardErrors.textContent = '';
}

// Handle payment submission
async function handlePayment(e) {
    e.preventDefault();
    
    if (!stripe || !cardElement) {
        cardErrors.textContent = 'Payment system not initialized';
        return;
    }
    
    const packageId = parseInt(paymentForm.dataset.packageId);
    const pkg = FLAP_POWER_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return;
    
    // Disable button and show processing
    submitPaymentBtn.disabled = true;
    document.getElementById('payment-processing').style.display = 'block';
    
    try {
        // Create payment intent on the backend
        const intentResponse = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: pkg.realCost,
                packageId: packageId
            })
        });
        
        const { clientSecret, success } = await intentResponse.json();
        
        if (!success) {
            throw new Error('Failed to create payment intent');
        }
        
        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {}
            }
        });
        
        if (error) {
            cardErrors.textContent = error.message;
            submitPaymentBtn.disabled = false;
            document.getElementById('payment-processing').style.display = 'none';
        } else if (paymentIntent.status === 'succeeded') {
            // Payment successful
            purchasedFlapMultiplier = pkg.multiplier;
            bird.flapMultiplier = purchasedFlapMultiplier;
            savePlayerData();
            updateDisplays();
            
            alert('Payment successful! Purchased: ' + pkg.name);
            closePaymentModal();
            submitPaymentBtn.disabled = false;
            document.getElementById('payment-processing').style.display = 'none';
        }
    } catch (error) {
        console.error('Payment error:', error);
        cardErrors.textContent = 'Payment failed: ' + error.message;
        submitPaymentBtn.disabled = false;
        document.getElementById('payment-processing').style.display = 'none';
    }
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isGameRunning) {
            bird.velocityY = BASE_FLAP_POWER * purchasedFlapMultiplier;
        } else {
            resetGame();
        }
    }
});

document.addEventListener('click', (e) => {
    // Ignore clicks on shop buttons
    if (e.target.classList.contains('shop-btn')) return;
    
    if (isGameRunning) {
        bird.velocityY = BASE_FLAP_POWER * purchasedFlapMultiplier;
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
            awardMilestoneBonus(score);
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
    bird.flapMultiplier = purchasedFlapMultiplier;
    pipes = [];
    score = 0;
    frameCount = 0;
    isGameRunning = true;
    scoreDisplay.textContent = 'Score: 0';
    gameOverScreen.classList.add('hidden');
}

// Award bonus currency for reaching milestones
function awardMilestoneBonus(currentScore) {
    const milestones = [10, 25, 50, 100, 250];
    for (let milestone of milestones) {
        if (currentScore === milestone) {
            const bonus = milestone * 5;
            addBonusBalance(bonus);
            break;
        }
    }
}

// Game loop
function gameLoop() {
    if (isGameRunning) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize shop buttons
function initializeShop() {
    const shopBtns = document.querySelectorAll('.shop-btn');
    shopBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const packageId = parseInt(btn.dataset.packageId);
            purchaseFlapPower(packageId);
        });
    });
}

// Initialize modal event listeners
function initializeModal() {
    closeModal.addEventListener('click', closePaymentModal);
    paymentModal.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            closePaymentModal();
        }
    });
    paymentForm.addEventListener('submit', handlePayment);
}

// Start the game
initStripe();
loadPlayerData();
initializeShop();
initializeModal();
gameLoop();
