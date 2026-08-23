/* =============================================
   QuickBite Delivery App — script.js
   Features: menu, cart, order placement,
   live countdown timer, status stages,
   rider map animation, confetti
   ============================================= */

/* ─────────────────────────────────────────────
   1. DATA  (Arrays of Objects)
───────────────────────────────────────────── */

// Menu items — each is an object with id, name, emoji, desc, price
const menuItems = [
  { id: 1, name: 'Jollof Rice',      emoji: '🍛', desc: 'Party-style smoky jollof',        price: 2500 },
  { id: 2, name: 'Suya Wrap',        emoji: '🌯', desc: 'Spicy grilled beef in flatbread',  price: 1800 },
  { id: 3, name: 'Pepper Soup',      emoji: '🍲', desc: 'Hot & spicy catfish bowl',         price: 2200 },
  { id: 4, name: 'Fried Plantain',   emoji: '🍌', desc: 'Sweet golden dodo, crispy edges',  price: 800  },
  { id: 5, name: 'Chicken Wings',    emoji: '🍗', desc: 'Sticky BBQ glazed wings',          price: 3000 },
  { id: 6, name: 'Puff Puff',        emoji: '🟤', desc: 'Warm fluffy fried dough balls',    price: 600  },
  { id: 7, name: 'Chapman Drink',    emoji: '🍹', desc: 'Chilled Nigerian classic cocktail',price: 900  },
  { id: 8, name: 'Moi Moi',         emoji: '🟠', desc: 'Steamed bean pudding, soft & rich', price: 700  },
];

// Stage definitions — used for status tracking
const stages = [
  { id: 0, name: 'Order Placed',   triggerPct: 100 },  // active immediately
  { id: 1, name: 'Being Prepared', triggerPct: 80  },  // activates at 80% elapsed
  { id: 2, name: 'Out for Delivery',triggerPct: 45 },  // activates at 45% elapsed
  { id: 3, name: 'Arrived!',       triggerPct: 0   },  // activates when time hits 0
];

/* ─────────────────────────────────────────────
   2. STATE
───────────────────────────────────────────── */
let cart           = [];        // Array of { item, qty } objects
let totalSeconds   = 0;         // Total delivery time in seconds
let secondsLeft    = 0;         // Remaining seconds
let timerInterval  = null;
let currentStage   = 0;         // Index of active stage
let orderTotal     = 0;
const DELIVERY_FEE = 500;

/* ─────────────────────────────────────────────
   3. DOM REFERENCES
───────────────────────────────────────────── */
const screenMenu      = document.getElementById('screen-menu');
const screenTracking  = document.getElementById('screen-tracking');
const menuGrid        = document.getElementById('menu-grid');
const cartList        = document.getElementById('cart-list');
const cartEmpty       = document.getElementById('cart-empty');
const cartSummary     = document.getElementById('cart-summary');
const cartBadge       = document.getElementById('cart-badge');
const subtotalEl      = document.getElementById('subtotal');
const totalEl         = document.getElementById('total');
const timerMins       = document.getElementById('timer-mins');
const timerSecs       = document.getElementById('timer-secs');
const timerSub        = document.getElementById('timer-sub');
const mapRider        = document.getElementById('map-rider');
const orderMiniList   = document.getElementById('order-mini-list');
const orderMiniTotal  = document.getElementById('order-mini-total');
const arrivedOverlay  = document.getElementById('arrived-overlay');
const arrivedItems    = document.getElementById('arrived-items');
const confirmedTitle  = document.getElementById('confirmed-title');
const confirmedSub    = document.getElementById('confirmed-sub');
const confettiCanvas  = document.getElementById('confetti-canvas');

/* ─────────────────────────────────────────────
   4. RENDER MENU
───────────────────────────────────────────── */
function renderMenu() {
  menuGrid.innerHTML = '';

  // Loop through menuItems array to build each card
  menuItems.forEach(item => {
    const inCart = cart.find(c => c.item.id === item.id);
    const qty    = inCart ? inCart.qty : 0;

    const card = document.createElement('div');
    card.className = 'menu-card';
    card.id = `menu-card-${item.id}`;

    card.innerHTML = `
      <div class="menu-emoji">${item.emoji}</div>
      <div class="menu-name">${item.name}</div>
      <div class="menu-desc">${item.desc}</div>
      <div class="menu-footer">
        <span class="menu-price">₦${item.price.toLocaleString()}</span>
        ${qty === 0
          ? `<button class="menu-add-btn" onclick="addToCart(${item.id})">+</button>`
          : `<div class="menu-qty-ctrl">
               <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
               <span class="qty-count">${qty}</span>
               <button class="qty-btn" onclick="changeQty(${item.id}, +1)">+</button>
             </div>`
        }
      </div>
    `;

    menuGrid.appendChild(card);
  });
}

/* ─────────────────────────────────────────────
   5. CART FUNCTIONS
───────────────────────────────────────────── */

/**
 * addToCart — adds an item to cart array or increments qty
 */
function addToCart(itemId) {
  const item    = menuItems.find(m => m.id === itemId);
  const inCart  = cart.find(c => c.item.id === itemId);

  if (inCart) {
    inCart.qty++;
  } else {
    cart.push({ item, qty: 1 });
  }

  updateCart();
  renderMenu();
  animateCartBadge();
}

/**
 * changeQty — increases or decreases qty; removes if qty hits 0
 */
function changeQty(itemId, delta) {
  const index = cart.findIndex(c => c.item.id === itemId);
  if (index === -1) return;

  cart[index].qty += delta;

  // Remove from cart if qty drops to 0
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  updateCart();
  renderMenu();
}

/**
 * removeFromCart — removes an item entirely
 */
function removeFromCart(itemId) {
  cart = cart.filter(c => c.item.id !== itemId);
  updateCart();
  renderMenu();
}

/**
 * updateCart — recalculates totals and re-renders the cart UI
 */
function updateCart() {
  // Calculate subtotal using a reduce loop
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  orderTotal = subtotal + DELIVERY_FEE;

  // Update badge count
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
  cartBadge.textContent = totalItems;

  // Show/hide empty state and summary
  if (cart.length === 0) {
    cartEmpty.classList.remove('hidden');
    cartSummary.classList.add('hidden');
    cartList.innerHTML = '';
    return;
  }

  cartEmpty.classList.add('hidden');
  cartSummary.classList.remove('hidden');

  // Update price displays
  subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
  totalEl.textContent    = `₦${orderTotal.toLocaleString()}`;

  // Render cart items using a loop
  cartList.innerHTML = '';
  cart.forEach(c => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <span class="cart-item__emoji">${c.item.emoji}</span>
      <div class="cart-item__info">
        <div class="cart-item__name">${c.item.name} × ${c.qty}</div>
        <div class="cart-item__price">₦${(c.item.price * c.qty).toLocaleString()}</div>
      </div>
      <button class="cart-item__remove" onclick="removeFromCart(${c.item.id})" title="Remove">✕</button>
    `;
    cartList.appendChild(li);
  });
}

/**
 * animateCartBadge — bounces the cart icon on add
 */
function animateCartBadge() {
  cartBadge.style.transform = 'scale(1.5)';
  setTimeout(() => { cartBadge.style.transform = ''; }, 200);
}

function scrollToCart() {
  document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth' });
}

/* ─────────────────────────────────────────────
   6. PLACE ORDER — switch to tracking screen
───────────────────────────────────────────── */
function placeOrder() {
  if (cart.length === 0) return;

  // Pick a random delivery time between 20–45 minutes
  const mins     = Math.floor(Math.random() * 26) + 20;
  totalSeconds   = mins * 60;
  secondsLeft    = totalSeconds;
  currentStage   = 0;

  // Populate mini order summary on tracking screen
  orderMiniList.innerHTML = '';
  cart.forEach(c => {
    const li = document.createElement('li');
    li.className = 'order-mini__item';
    li.innerHTML = `<span>${c.item.emoji} ${c.item.name} × ${c.qty}</span><span>₦${(c.item.price * c.qty).toLocaleString()}</span>`;
    orderMiniList.appendChild(li);
  });
  orderMiniTotal.textContent = `₦${orderTotal.toLocaleString()}`;

  // Switch screens
  screenMenu.classList.add('hidden');
  screenTracking.classList.remove('hidden');
  window.scrollTo(0, 0);

  // Activate first stage immediately
  activateStage(0);

  // Start the countdown timer
  startTimer();
}

/* ─────────────────────────────────────────────
   7. COUNTDOWN TIMER
───────────────────────────────────────────── */
function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    secondsLeft--;

    if (secondsLeft <= 0) {
      secondsLeft = 0;
      clearInterval(timerInterval);
      updateTimerDisplay();
      orderArrived();
      return;
    }

    updateTimerDisplay();
    checkStageProgress();
    updateRiderPosition();
  }, 1000);
}

/**
 * updateTimerDisplay — formats and shows MM:SS
 */
function updateTimerDisplay() {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  timerMins.textContent = String(m).padStart(2, '0');
  timerSecs.textContent = String(s).padStart(2, '0');

  // Urgent styling under 2 minutes
  if (secondsLeft <= 120 && secondsLeft > 0) {
    timerMins.classList.add('urgent');
    timerSecs.classList.add('urgent');
    timerSub.textContent = 'Almost there! 🚀';
  } else {
    timerMins.classList.remove('urgent');
    timerSecs.classList.remove('urgent');
    timerSub.textContent = 'minutes remaining';
  }
}

/* ─────────────────────────────────────────────
   8. STAGE PROGRESSION (using conditions)
───────────────────────────────────────────── */
function checkStageProgress() {
  const elapsed    = totalSeconds - secondsLeft;
  const elapsedPct = (elapsed / totalSeconds) * 100;

  // Check each stage trigger using conditions
  if (elapsedPct >= 20 && currentStage < 1) {
    activateStage(1);
  } else if (elapsedPct >= 55 && currentStage < 2) {
    activateStage(2);
  }
}

function activateStage(index) {
  currentStage = index;
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Loop through all stages to set correct classes
  for (let i = 0; i <= 3; i++) {
    const el = document.getElementById(`stage-${i}`);
    el.classList.remove('active', 'done');

    if (i < index) {
      el.classList.add('done');
    } else if (i === index) {
      el.classList.add('active');
      document.getElementById(`stage-time-${i}`).textContent = now;
    }
  }

  // Update header subtitle
  const subtitles = [
    "Mama's Kitchen has received your order",
    "Your food is being freshly prepared 👨‍🍳",
    "Your rider is heading to you 🛵",
    "Your food has arrived! 🎉",
  ];
  confirmedSub.textContent = subtitles[index];
}

/* ─────────────────────────────────────────────
   9. RIDER MAP ANIMATION
───────────────────────────────────────────── */
function updateRiderPosition() {
  // Progress from 15% (restaurant) to 82% (home) across the map
  const elapsed  = totalSeconds - secondsLeft;
  const progress = elapsed / totalSeconds;
  const startX   = 15;
  const endX     = 82;
  const currentX = startX + (endX - startX) * progress;

  mapRider.style.left = currentX + '%';
}

/* ─────────────────────────────────────────────
   10. ORDER ARRIVED
───────────────────────────────────────────── */
function orderArrived() {
  // Activate final stage
  activateStage(3);

  // Update header
  confirmedTitle.textContent = 'Food Delivered! 🎉';

  // Build arrived items list
  arrivedItems.innerHTML = cart.map(c =>
    `${c.item.emoji} ${c.item.name} × ${c.qty}`
  ).join('<br/>');

  // Show arrived overlay
  setTimeout(() => {
    arrivedOverlay.classList.remove('hidden');
    launchConfetti();
  }, 800);
}

/* ─────────────────────────────────────────────
   11. NEW ORDER — reset everything
───────────────────────────────────────────── */
function newOrder() {
  // Reset state
  cart          = [];
  totalSeconds  = 0;
  secondsLeft   = 0;
  currentStage  = 0;
  clearInterval(timerInterval);

  // Reset UI
  arrivedOverlay.classList.add('hidden');
  cartList.innerHTML = '';
  cartBadge.textContent = '0';
  timerMins.textContent = '00';
  timerSecs.textContent = '00';
  mapRider.style.left = '15%';

  // Reset stage dots
  for (let i = 0; i <= 3; i++) {
    const el = document.getElementById(`stage-${i}`);
    el.classList.remove('active', 'done');
    document.getElementById(`stage-time-${i}`).textContent = '';
  }

  // Switch back to menu
  screenTracking.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  window.scrollTo(0, 0);

  updateCart();
  renderMenu();
}

/* ─────────────────────────────────────────────
   12. CONFETTI
───────────────────────────────────────────── */
const cCtx = confettiCanvas.getContext('2d');
let confettis = [];
let confettiRunning = false;

const CONFETTI_COLORS = ['#ff6b2b', '#ffd166', '#00c48c', '#f0eee8', '#a78bfa', '#ff6b6b'];

function resizeCanvas() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

function launchConfetti() {
  resizeCanvas();
  confettis = [];

  // Loop to create confetti pieces
  for (let i = 0; i < 120; i++) {
    confettis.push({
      x:      Math.random() * confettiCanvas.width,
      y:      -20 - Math.random() * 200,
      w:      Math.random() * 10 + 4,
      h:      Math.random() * 5 + 2,
      color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      speedY: Math.random() * 4 + 2,
      speedX: (Math.random() - 0.5) * 3,
      angle:  Math.random() * Math.PI * 2,
      spin:   (Math.random() - 0.5) * 0.2,
      opacity: 1,
    });
  }

  if (!confettiRunning) {
    confettiRunning = true;
    animateConfetti();
  }
}

function animateConfetti() {
  cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let allDone = true;

  confettis.forEach(p => {
    if (p.y < confettiCanvas.height + 20) {
      allDone  = false;
      p.y      += p.speedY;
      p.x      += p.speedX;
      p.angle  += p.spin;
      p.opacity = Math.max(0, p.opacity - 0.004);

      cCtx.save();
      cCtx.translate(p.x, p.y);
      cCtx.rotate(p.angle);
      cCtx.globalAlpha = p.opacity;
      cCtx.fillStyle   = p.color;
      cCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cCtx.restore();
    }
  });

  if (!allDone) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiRunning = false;
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

window.addEventListener('resize', resizeCanvas);

/* ─────────────────────────────────────────────
   13. INIT
───────────────────────────────────────────── */
resizeCanvas();
renderMenu();
updateCart();