// ====================
// Canvas & Context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

// ====================
// Game State
let player, traffic, aiEnabled, score, speed, stepsRemaining, lives;

// 🔴 Start / Stop flags
let gameStarted = false;
let gamePaused = false;

// ====================
// HUD Elements
const speedEl = document.getElementById("speed");
const scoreEl = document.getElementById("score");
const aiStatusEl = document.getElementById("aiStatus");
const toggleAIButton = document.getElementById("toggleAI");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScore = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");

// 🔴 Start / Stop buttons
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

// ====================
// Sounds
const crashSound = new Audio("crash.mp3");
const wrongSideSound = new Audio("wrongSide.mp3");

// ====================
// Road Settings
const road = { x:100, y:0, width:700, height:height }; 
const laneWidth = road.width / 4;
const lanes = [
    road.x + laneWidth/2, 
    road.x + laneWidth*1.5,
    road.x + laneWidth*2.5,
    road.x + laneWidth*3.5
];
const correctLanes = [lanes[2], lanes[3]]; // Right side lanes

// ====================
// Score Milestones Flags
let milestone500=false, milestone1000=false;

// ====================
// Controls
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

toggleAIButton.addEventListener("click", () => {
    aiEnabled = !aiEnabled;
    aiStatusEl.innerText = aiEnabled ? "ON" : "OFF";
});
restartBtn.addEventListener("click", restartGame);

// 🔴 Start / Stop buttons logic
startBtn.addEventListener("click", () => {
    gameStarted = true;
    gamePaused = false;
});
stopBtn.addEventListener("click", () => {
    gamePaused = true;
});

// ====================
// Initialization
function initGame() {
    player = { x: lanes[2], y: height - 150, w:60, h:120 };
    traffic = [];
    aiEnabled = false;
    score = 0;
    speed = 5;
    stepsRemaining = 200;
    lives = 2;
    milestone500=false; milestone1000=false;
    gameOverScreen.classList.add("hidden");
}
initGame();

// ====================
// Traffic Spawning
function spawnTraffic() {
    const laneIndex = Math.floor(Math.random()*4);
    let car = { x: lanes[laneIndex], y:0, w:60, h:120, speed:2 + Math.random()*2, direction: laneIndex<2 ? "up" : "down" };
    if(car.direction==="up") car.y = height + 150, car.speed *= -1;
    else car.y = -150;
    traffic.push(car);
}
setInterval(() => { if(gameStarted && !gamePaused) spawnTraffic(); }, 1200);

// ====================
// Draw Road
function drawRoad() {
    ctx.fillStyle="#2c2c2c";
    ctx.fillRect(road.x,0,road.width,height);

    ctx.strokeStyle="#00eaff";
    ctx.lineWidth=4;
    ctx.strokeRect(road.x,0,road.width,height);

    ctx.setLineDash([25,20]);
    ctx.strokeStyle="#ddd";
    for(let i=1;i<4;i++){
        ctx.beginPath();
        ctx.moveTo(road.x + i*laneWidth,0);
        ctx.lineTo(road.x + i*laneWidth,height);
        ctx.stroke();
    }
    ctx.setLineDash([]);
}

// ====================
// Draw Car
function drawCar(car,type="player"){
    ctx.save();
    ctx.translate(car.x,car.y);
    if(car.direction==="up") ctx.rotate(Math.PI), ctx.translate(0,-car.h);

    ctx.fillStyle= type==="player" ? "yellow":"blue";
    ctx.beginPath();
    ctx.moveTo(-car.w/2+5, car.h/4);
    ctx.lineTo(-car.w/3,-car.h/2);
    ctx.lineTo(car.w/3,-car.h/2);
    ctx.lineTo(car.w/2-5,car.h/4);
    ctx.quadraticCurveTo(0,car.h/2,-car.w/2+5,car.h/4);
    ctx.fill();

    ctx.fillStyle = type==="player"?"rgba(255,255,200,0.6)":"rgba(200,200,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(-car.w/4,-car.h/2 +5);
    ctx.lineTo(car.w/4,-car.h/2 +5);
    ctx.lineTo(car.w/6,-car.h/4);
    ctx.lineTo(-car.w/6,-car.h/4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = type==="player"?"rgba(255,255,0,0.8)":"rgba(0,0,255,0.8)";
    ctx.fillRect(-car.w/2+5, car.h/4-10, car.w-10, 5);

    ctx.fillStyle="black";
    const wheelW=14,wheelH=20;
    ctx.fillRect(-car.w/2+5, car.h/4, wheelW, wheelH);
    ctx.fillRect(car.w/2-5-wheelW, car.h/4, wheelW, wheelH);
    ctx.fillRect(-car.w/2+5,-car.h/2+10, wheelW, wheelH);
    ctx.fillRect(car.w/2-5-wheelW,-car.h/2+10, wheelW, wheelH);

    ctx.restore();
}

// ====================
// Collision
function checkCollision(a,b){
    return a.x - a.w/2 < b.x + b.w/2 &&
           a.x + a.w/2 > b.x - b.w/2 &&
           a.y - a.h/2 < b.y + b.h/2 &&
           a.y + a.h/2 > b.y - b.h/2;
}

// ====================
// AI Control
function aiControl(){
    let safeLanes = lanes.slice();
    for(let t of traffic){
        if(Math.abs(t.y - player.y)<200){
            safeLanes = safeLanes.filter(l => Math.abs(l-t.x) > player.w);
        }
    }
    if(safeLanes.length>0){
        let targetX = safeLanes.reduce((prev,curr)=>Math.abs(curr-player.x)<Math.abs(prev-player.x)?curr:prev);
        player.x += (targetX - player.x)*0.1;
    }
    stepsRemaining--;
}

// ====================
// Update HUD
function updateHUD(){
    speedEl.innerText = speed.toFixed(1);
    scoreEl.innerText = Math.floor(score);
}

// ====================
// Game Loop
function gameLoop(){
    // 🔴 Stop game updates if not started or paused
    if(!gameStarted || gamePaused){
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.clearRect(0,0,width,height);
    drawRoad();

    // Player control
    if(aiEnabled) aiControl();
    else {
        if(keys["ArrowLeft"]){
            player.x -= laneWidth;
            stepsRemaining--;
            keys["ArrowLeft"]=false;

            // Wrong side check
            if(!correctLanes.includes(player.x)){
                wrongSideSound.play();
                alert("⚠️ Wrong side! Go back to the right lanes.");
                let nearestLane = correctLanes.reduce((prev,curr)=> Math.abs(curr-player.x)<Math.abs(prev-player.x)?curr:prev);
                player.x = nearestLane;
            }
        }
        if(keys["ArrowRight"]){
            player.x += laneWidth;
            stepsRemaining--;
            keys["ArrowRight"]=false;

            if(player.x < lanes[0]) player.x = lanes[0];
            if(player.x > lanes[3]) player.x = lanes[3];
        }
    }

    drawCar(player,"player");

    // Traffic & collisions
    for(let i=traffic.length-1;i>=0;i--){
        traffic[i].y += traffic[i].speed;
        drawCar(traffic[i],"traffic");

        if(checkCollision(player,traffic[i])){
            traffic.splice(i,1);
            crashSound.play();
            lives--;
            if(lives>0){
                alert("💥 You lost 1 life! Remaining lives: " + lives);
            } else {
                endGame();
            }
        }

        // Remove off-screen traffic
        if(traffic[i]){
            if(traffic[i].direction==="down" && traffic[i].y>height+150) traffic.splice(i,1);
            if(traffic[i].direction==="up" && traffic[i].y<-150) traffic.splice(i,1);
        }
    }

    // Update score
    score += 0.05;
    if(score > 1500) score = 1500; // Max score = 1500
    updateHUD();

    // Score Milestones
    if(score >= 500 && !milestone500){
        alert("🏁 Good!");
        milestone500=true;
    }
    if(score >= 1000 && !milestone1000){
        alert("🏆 Excellent!");
        milestone1000=true;
    }
    if(score >= 1500){
        alert("🎉 Winner Winner Chicken Dinner!");
        endGame();
        score = 1500;
    }

    requestAnimationFrame(gameLoop);
}

// ====================
// Game Over
function endGame(){
    finalScore.innerText = Math.floor(score);
    gameOverScreen.classList.remove("hidden");
    // 🔴 Also pause the game automatically
    gamePaused = true;
}

// ====================
// Restart
function restartGame(){
    initGame();
}

gameLoop();