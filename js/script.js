// Global variables
let discount = 0.00; // Start at 0.00%
const discountRate = 0.2;
let gameInterval;
let gameActive = false;
let crashed = false;
let crashPoint;
let startTime;
let playerJoined = false;
let countdownInterval;
let firstRun = true; // First run: 5 sec; subsequent: 5 sec

// User authentication and leaderboard storage
let currentUser = null; // Will be set after sign in
// Store total discount per user (simulate backend with local object)
let userDiscounts = {}; // e.g., { "alice": 12.34, "bob": 5.67 }

// Volume control elements
const bgVolumeSlider = document.getElementById("bg-volume");
const explosionVolumeSlider = document.getElementById("explosion-volume");
const rocketVolumeSlider = document.getElementById("rocket-volume");

// Leaderboard functions using userDiscounts
function updateLeaderboard() {
  const leaderboardList = document.getElementById("leaderboard-list");
  leaderboardList.innerHTML = "";
  // Convert userDiscounts to array of objects and sort descending by discount
  let entries = [];
  for (let user in userDiscounts) {
    entries.push({ user, total: userDiscounts[user] });
  }
  entries.sort((a, b) => b.total - a.total);
  entries.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.user}: ${entry.total.toFixed(2)}%`;
    leaderboardList.appendChild(li);
  });
}

// Sign In / Out functions
document.getElementById("signin-btn").addEventListener("click", () => {
  const usernameInput = document.getElementById("username-input");
  const username = usernameInput.value.trim();
  if (username !== "") {
    currentUser = username;
    document.getElementById("welcome-msg").textContent = "Welcome, " + currentUser;
    document.getElementById("signin-btn").style.display = "none";
    document.getElementById("username-input").style.display = "none";
    document.getElementById("signout-btn").style.display = "inline-block";
    // Initialize user's discount if not set
    if (!userDiscounts[currentUser]) {
      userDiscounts[currentUser] = 0;
    }
    updateLeaderboard();
  }
});
document.getElementById("signout-btn").addEventListener("click", () => {
  currentUser = null;
  document.getElementById("welcome-msg").textContent = "Not signed in";
  document.getElementById("signin-btn").style.display = "inline-block";
  document.getElementById("username-input").style.display = "inline-block";
  document.getElementById("signout-btn").style.display = "none";
});

// Update horizontal tick bar using offset values
function updateBottomScale() {
  const bottomScale = document.getElementById("bottom-scale");
  bottomScale.innerHTML = "";
  const containerWidth = document.getElementById("rocket-container").offsetWidth;
  let windowMin, windowMax;
  if (discount < 1.0) {
    windowMin = 0.01;
    windowMax = 2.00;
  } else {
    windowMin = discount * 0.8;
    windowMax = discount * 1.2;
  }
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    let value = windowMin + ((windowMax - windowMin) / tickCount) * i;
    let normalizedTick = (value - windowMin) / (windowMax - windowMin);
    let leftPos = normalizedTick * containerWidth;
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = leftPos + "px";
    bottomScale.appendChild(tick);
    const label = document.createElement("div");
    label.className = "tick-label";
    label.textContent = value.toFixed(2) + "%";
    label.style.left = (leftPos - 10) + "px";
    bottomScale.appendChild(label);
  }
  const rocketWrapper = document.getElementById("rocket-wrapper");
  const rocketCenterX = rocketWrapper.offsetLeft + rocketWrapper.offsetWidth / 2;
  const marker = document.createElement("div");
  marker.className = "tick-marker";
  marker.style.left = rocketCenterX + "px";
  bottomScale.appendChild(marker);
}

function updateVerticalTicker() {
  const verticalTicker = document.getElementById("vertical-ticker");
  verticalTicker.innerHTML = "";
  const container = document.getElementById("rocket-container");
  const containerHeight = container.offsetHeight;
  let windowMin, windowMax;
  if (discount < 1.0) {
    windowMin = 0.01;
    windowMax = 2.00;
  } else {
    windowMin = discount * 0.8;
    windowMax = discount * 1.2;
  }
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    let value = windowMin + ((windowMax - windowMin) / tickCount) * i;
    let normalizedTick = (value - windowMin) / (windowMax - windowMin);
    let topPos = (1 - normalizedTick) * containerHeight;
    const tick = document.createElement("div");
    tick.className = "v-tick";
    tick.style.top = topPos + "px";
    verticalTicker.appendChild(tick);
    const label = document.createElement("div");
    label.className = "v-tick-label";
    label.textContent = value.toFixed(2) + "%";
    label.style.top = (topPos - 5) + "px";
    verticalTicker.appendChild(label);
  }
  const rocketWrapper = document.getElementById("rocket-wrapper");
  const rocketCenterY = rocketWrapper.offsetTop + rocketWrapper.offsetHeight / 2;
  const marker = document.createElement("div");
  marker.className = "v-tick-marker";
  marker.style.top = rocketCenterY + "px";
  verticalTicker.appendChild(marker);
}

function updateRocketPosition() {
  const container = document.getElementById("rocket-container");
  const rocketWrapper = document.getElementById("rocket-wrapper");
  const containerHeight = container.offsetHeight;
  const containerWidth = container.offsetWidth;
  const wrapperWidth = rocketWrapper.offsetWidth;
  const wrapperHeight = rocketWrapper.offsetHeight;
  let centerX = (containerWidth - wrapperWidth) / 2;
  let centerY = (containerHeight - wrapperHeight) / 2;
  
  if (discount < 1.0) {
    let t = (discount - 0.00) / (1 - 0.00);
    let newLeft = t * centerX;
    let newBottom = t * centerY;
    rocketWrapper.style.left = newLeft + "px";
    rocketWrapper.style.bottom = newBottom + "px";
  } else {
    rocketWrapper.style.left = centerX + "px";
    rocketWrapper.style.bottom = centerY + "px";
  }
}

function updateDisplay() {
  const shipDiscountEl = document.getElementById("ship-discount");
  const currentDiscountEl = document.getElementById("current-discount");
  shipDiscountEl.textContent = discount.toFixed(2) + "% Discount";
  currentDiscountEl.textContent = "Current: " + discount.toFixed(2) + "%";
  
  // Add pulsating effect while game is active
  if (gameActive) {
    shipDiscountEl.classList.add("pulsate");
    currentDiscountEl.classList.add("pulsate");
  } else {
    shipDiscountEl.classList.remove("pulsate");
    currentDiscountEl.classList.remove("pulsate");
  }
}

function spawnNextFlyingObject() {
  if (!gameActive) return;
  const container = document.getElementById("rocket-container");
  const rocketWrapper = document.getElementById("rocket-wrapper");
  const rocketTop = rocketWrapper.offsetTop;
  const maxTop = Math.max(rocketTop - 70, 0);
  const randomTop = Math.random() * maxTop;
  
  const flyingImages = ["alien1.png", "alien2.png", "ufo1.png", "ufo2.png", "astro1.png", "saturn1.png", "earth1.png"];
  const imageFile = flyingImages[Math.floor(Math.random() * flyingImages.length)];
  const flyingElem = document.createElement("img");
  flyingElem.src = "img/" + imageFile;
  flyingElem.className = "flying-object";
  flyingElem.style.top = randomTop + "px";
  
  container.appendChild(flyingElem);
  
  flyingElem.addEventListener("animationend", () => {
    flyingElem.remove();
    if (gameActive) {
      spawnNextFlyingObject();
    }
  });
}

function updateGame() {
  if (!gameActive) return;
  let elapsed = (Date.now() - startTime) / 1000;
  discount = 0.00 + elapsed * discountRate;
  if (discount > 100) discount = 100;
  
  updateDisplay();
  updateRocketPosition();
  updateBottomScale();
  updateVerticalTicker();
  
  if (discount >= crashPoint) {
    crash();
  }
}

function startGame() {
  // Ensure a user is signed in before starting the game
  if (!currentUser) {
    alert("Please sign in to play!");
    return;
  }
  discount = 0.00; // Run starts at 0.00%
  crashed = false;
  gameActive = true;
  startTime = Date.now();
  updateDisplay();
  document.getElementById("status").textContent = "Run in progress... Hit Cash Out to lock in your discount!";
  
  // Only unlock cash out if the player pressed Blast off
  if (playerJoined) {
    document.getElementById("cashout").disabled = false;
  } else {
    document.getElementById("cashout").disabled = true;
  }
  
  document.getElementById("rocket-wrapper").style.display = "block";
  document.getElementById("explosion").style.display = "none";
  
  const bgMusic = document.getElementById("bg-music");
  const explosionSound = document.getElementById("explosion-sound");
  const rocketSound = document.getElementById("rocket-sound");
  // Background music now starts in startCountdown, so not here.
  rocketSound.play();
  
  updateRocketPosition();
  updateBottomScale();
  updateVerticalTicker();
  
  let r = Math.random();
  if (r < 0.1) {
    crashPoint = Math.random() * (0.05 - 0.01) + 0.01;
  } else if (r < 0.9) {
    crashPoint = Math.random() * (3.00 - 1.00) + 1.00;
  } else {
    crashPoint = Math.random() * (100.00 - 3.00) + 3.00;
  }
  console.log("Crash point set at: " + crashPoint.toFixed(2) + "%");
  
  gameInterval = setInterval(updateGame, 50);
  spawnNextFlyingObject();
}

function crash() {
  gameActive = false;
  crashed = true;
  clearInterval(gameInterval);
  
  const rocketSound = document.getElementById("rocket-sound");
  rocketSound.pause();
  rocketSound.currentTime = 0;
  document.getElementById("explosion-sound").play();
  
  document.getElementById("rocket-wrapper").style.display = "none";
  const explosionElem = document.getElementById("explosion");
  explosionElem.style.left = document.getElementById("rocket-wrapper").style.left;
  explosionElem.style.bottom = document.getElementById("rocket-wrapper").style.bottom;
  explosionElem.style.display = "block";
  explosionElem.classList.add("explode");
  
  // If the player blasted off (playerJoined is true) and did not cash out, they lose their discount.
  if (playerJoined) {
    // Reset current user's total discount for this session.
    userDiscounts[currentUser] = 0;
    updateLeaderboard();
    document.getElementById("status").textContent = "Run crashed! You lost your discount!";
  } else {
    document.getElementById("status").textContent = "Run crashed!";
  }
  
  document.getElementById("cashout").disabled = true;
  document.getElementById("ignite").disabled = true;
  setTimeout(startCountdown, 2000);
}

function cashOut() {
  if (!gameActive || crashed || !playerJoined) return;
  gameActive = false;
  clearInterval(gameInterval);
  
  document.getElementById("cashout-sound").play();
  
  const rocketSound = document.getElementById("rocket-sound");
  rocketSound.pause();
  rocketSound.currentTime = 0;
  
  updateDisplay();
  document.getElementById("status").textContent = "Cashed out at " + discount.toFixed(2) + "% discount!";
  document.getElementById("cashout").disabled = true;
  document.getElementById("ignite").disabled = true;
  
  // Add the discount from this run to the current user's total
  userDiscounts[currentUser] += discount;
  updateLeaderboard();
  
  document.getElementById("ship-discount").style.color = "#fff";
  document.getElementById("status").textContent += " Congratulations!";
  setTimeout(startCountdown, 2000);
}

function updateLeaderboard() {
  // Already defined above to display userDiscounts.
  const leaderboardList = document.getElementById("leaderboard-list");
  leaderboardList.innerHTML = "";
  let entries = [];
  for (let user in userDiscounts) {
    entries.push({ user, total: userDiscounts[user] });
  }
  entries.sort((a, b) => b.total - a.total);
  entries.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.user}: ${entry.total.toFixed(2)}%`;
    leaderboardList.appendChild(li);
  });
}

function updateAccumulatedDiscount() {
  // No longer used globally; leaderboard now reflects per-user totals.
  document.getElementById("discount-display").textContent = "Total Discount: " + (currentUser ? userDiscounts[currentUser].toFixed(2) : "0.00") + "%";
}

function startCountdown() {
  // Start playing background music as soon as countdown begins
  document.getElementById("bg-music").play();
  
  // Ensure the player is signed in before starting the countdown
  if (!currentUser) {
    document.getElementById("status").textContent = "Please sign in to play!";
    return;
  }
  
  playerJoined = false;
  const countdownDiv = document.getElementById("countdown");
  let duration = 5; // 5-second countdown
  countdownDiv.style.display = "block";
  countdownDiv.textContent = duration;
  document.getElementById("ignite").disabled = false;
  
  countdownInterval = setInterval(() => {
    duration--;
    if (duration > 0) {
      countdownDiv.textContent = duration;
    } else {
      clearInterval(countdownInterval);
      countdownDiv.style.display = "none";
      // If the player did not press Blast off before countdown finishes, disable cash out and start run
      if (!playerJoined) {
        document.getElementById("cashout").disabled = true;
        startRun();
      }
    }
  }, 1000);
  firstRun = false;
}

function startRun() {
  document.getElementById("ignite").disabled = true;
  startGame();
}

window.addEventListener("load", startCountdown);

document.getElementById("ignite").addEventListener("click", () => {
  clearInterval(countdownInterval);
  document.getElementById("countdown").style.display = "none";
  playerJoined = true;
  // Unlock cash out since the player pressed Blast off
  document.getElementById("cashout").disabled = false;
  startRun();
});
document.getElementById("cashout").addEventListener("click", cashOut);
