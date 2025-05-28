const LockpickingUI = {
  panel: null,
  pinsContainer: null,
  lockpickEl: null,
  attemptText: null,
  messageEl: null,
  isActive: false,

  maxAttempts: 5,
  lockpickSpeed: 6,
  randX: 0.3,
  randY: 1.2,
  distanceFrom: 100,
  distanceToUp: 200,
  pinRaiseSpeed: 4,
  
  lockpickVerticalPosStart: 20, 
  toothOffsetStart: 230, 

  attemptsLeft: 0,
  lockDifficulty: 0,
  pinFallDelays: [],
  pinLocked: [],
  isPinDropped: [],
  selectedPin: 0,
  isHoldingPin: false,
  isLockpickBroken: false,

  pinIsUp: [],
  pinUpTimeoutId: [],
  pins: [],
  pinPositions: [],

  lockpickX: 0,
  lockpickJumping: false,
  lockpickJumpTime: 0,
  lockpickJumpDuration: 0.2,
  lockpickJumpHeight: 30,

  mouseX: 0,
  mouseY: 0,

  init() {
    this.panel = document.getElementById("panel");
    this.pinsContainer = document.getElementById("pinsContainer");
    this.lockpickEl = document.getElementById("lockpick");
    this.attemptText = document.getElementById("attemptText");
    this.messageEl = document.getElementById("message");
    this.lockpickEl.style.bottom = this.lockpickVerticalPosStart + "px";

    for (let i = 0; i < 5; i++) {
      let el = document.getElementById("pin" + i);
      this.pins.push(el);
      this.pinPositions.push(0);
      this.pinIsUp.push(false);
      this.pinUpTimeoutId.push(null);
    }

    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener("mousedown", (e) => {
      if (!this.isActive) return;
      if (e.button === 0) {
        this.onLeftMouseDown();
      }
    });

    requestAnimationFrame(this.update.bind(this));
  },

  showLockpickingPanel(difficulty) {
    this.isActive = true;
    this.lockDifficulty = difficulty;
    this.attemptsLeft = this.maxAttempts - difficulty;
    this.attemptText.textContent = "Try: " + this.attemptsLeft;

    this.pinFallDelays = new Array(this.pins.length).fill(0);
    this.isPinDropped = new Array(this.pins.length).fill(false);
    this.pinLocked = new Array(this.pins.length).fill(true);

    for (let i = 0; i < this.pins.length; i++) {
      this.pinFallDelays[i] = this.randomRange(this.randX, this.randY);
      this.pinLocked[i] = true;
      this.pinIsUp[i] = false;
      if (this.pinUpTimeoutId[i]) {
        clearTimeout(this.pinUpTimeoutId[i]);
        this.pinUpTimeoutId[i] = null;
      }
    }

    let count = 0;
    while (count < difficulty) {
      let randomIndex = Math.floor(Math.random() * this.pins.length);
      if (!this.isPinDropped[randomIndex]) {
        this.isPinDropped[randomIndex] = true;
        this.pinLocked[randomIndex] = false;
        count++;
      }
    }

    this.resetPins();
    this.selectedPin = 0;
    this.isHoldingPin = false;
    this.isLockpickBroken = false;
    this.messageEl.textContent = "";

    this.panel.style.display = "block";
  },

  closePanel() {
    this.isLockpickBroken = true;
    this.isActive = false;
    this.panel.style.display = "none";
  },

  resetPins() {
    for (let i = 0; i < this.pins.length; i++) {
      if (this.pinUpTimeoutId[i]) {
        clearTimeout(this.pinUpTimeoutId[i]);
        this.pinUpTimeoutId[i] = null;
      }
      this.pinIsUp[i] = false;

      if (this.isPinDropped[i]) {
        this.pinPositions[i] = this.distanceFrom;
        this.pinLocked[i] = false;
      } else {
        this.pinPositions[i] = this.distanceToUp;
        this.pinLocked[i] = true;
      }
      this.updatePinVisual(i);
    }
  },

  updatePinVisual(i) {
    this.pins[i].style.bottom = this.pinPositions[i] + "px";
    this.pins[i].classList.remove("locked");
    if (this.pinLocked[i]) {
      this.pins[i].classList.add("locked");
    }
  },

  onLeftMouseDown() {
    if (this.isLockpickBroken) return;

    if (this.pinIsUp[this.selectedPin] && !this.pinLocked[this.selectedPin]) {
      this.lockPin(this.selectedPin);
      return;
    }

    if (!this.isHoldingPin) {
      this.pushPin(this.selectedPin);
      this.lockpickJump();
    }
  },

  lockPin(pinIndex) {
    if (this.pinUpTimeoutId[pinIndex]) {
      clearTimeout(this.pinUpTimeoutId[pinIndex]);
      this.pinUpTimeoutId[pinIndex] = null;
    }
    this.pinLocked[pinIndex] = true;
    this.pinIsUp[pinIndex] = false;
    this.updatePinVisual(pinIndex);

    if (this.areAllPinsLocked()) {
      this.unlockSuccess();
    }
  },

  pushPin(pinIndex) {
    if (this.pinLocked[pinIndex]) return;
    this.isHoldingPin = true;

    let startY = this.pinPositions[pinIndex];
    let targetY = this.distanceToUp;
    let startTime = performance.now();

    let anim = () => {
      if (!this.isHoldingPin) return;
      let now = performance.now();
      let delta = (now - startTime) / 1000;
      let progress = delta * this.pinRaiseSpeed;
      if (progress > 1) progress = 1;

      let newY = this.lerp(startY, targetY, progress);
      this.pinPositions[pinIndex] = newY;
      this.updatePinVisual(pinIndex);

      if (progress < 1) {
        requestAnimationFrame(anim);
      } else {
        this.pinIsUp[pinIndex] = true;
        let holdTimeMs = this.pinFallDelays[pinIndex] * 1000;
        this.pinUpTimeoutId[pinIndex] = setTimeout(() => {
          if (!this.pinLocked[pinIndex]) {
            this.dropPin(pinIndex, startY);
          }
        }, holdTimeMs);

        this.isHoldingPin = false;
      }
    };
    requestAnimationFrame(anim);
  },

  dropPin(pinIndex, originalY) {
    let startY = this.pinPositions[pinIndex];
    let targetY = originalY;
    let startTime = performance.now();

    let animDown = () => {
      let now = performance.now();
      let delta = (now - startTime) / 1000;
      let progress = delta * this.pinRaiseSpeed;
      if (progress > 1) progress = 1;

      let newY = this.lerp(startY, targetY, progress);
      this.pinPositions[pinIndex] = newY;
      this.updatePinVisual(pinIndex);

      if (progress < 1) {
        requestAnimationFrame(animDown);
      } else {
        this.resetPins();
        this.attemptsLeft--;
        this.attemptText.textContent = "Try: " + this.attemptsLeft;
        if (this.attemptsLeft <= 0) {
          this.isLockpickBroken = true;
          this.messageEl.textContent = "Lockpick Broken!";
          setTimeout(() => {
            this.closePanel();
          }, 1000);
        }
      }
    };
    requestAnimationFrame(animDown);
  },

  areAllPinsLocked() {
    for (let i = 0; i < this.pins.length; i++) {
      if (!this.pinLocked[i]) return false;
    }
    return true;
  },

  unlockSuccess() {
    this.messageEl.textContent = "Lock Opened!";
    setTimeout(() => {
      window.location.href = "https://kuznetsovd3012.github.io/mainTest13/";
    }, 1000);
  },

  lockpickJump() {
    if (this.lockpickJumping) return;
    this.lockpickJumping = true;
    this.lockpickJumpTime = performance.now();
  },

  update() {
    if (this.isActive) {
      let deltaTime = 0.016;
      this.moveLockpickWithMouse(deltaTime);

      if (this.lockpickJumping) {
        let now = performance.now();
        let elapsed = (now - this.lockpickJumpTime) / 1000;
        let halfDuration = this.lockpickJumpDuration / 2;

        if (elapsed < halfDuration) {
          let t = elapsed / halfDuration;
          let offset = this.lerp(0, this.lockpickJumpHeight, t);
          this.lockpickEl.style.bottom = (this.lockpickVerticalPosStart + offset) + "px";
        } else if (elapsed < this.lockpickJumpDuration) {
          let t = (elapsed - halfDuration) / halfDuration;
          let offset = this.lerp(this.lockpickJumpHeight, 0, t);
          this.lockpickEl.style.bottom = (this.lockpickVerticalPosStart + offset) + "px";
        } else {
          this.lockpickEl.style.bottom = this.lockpickVerticalPosStart + "px";
          this.lockpickJumping = false;
        }
      }
    }
    requestAnimationFrame(this.update.bind(this));
  },

  moveLockpickWithMouse(deltaTime) {
    let rect = this.pinsContainer.getBoundingClientRect();
    let localMouseX = this.mouseX - rect.left;
    if (localMouseX < 0) localMouseX = 0;
    if (localMouseX > rect.width) localMouseX = rect.width;

    let closestDist = Infinity;
    let closestPinIndex = this.selectedPin;

    for (let i = 0; i < this.pins.length; i++) {
      let pinRect = this.pins[i].getBoundingClientRect();
      let pinCenter = pinRect.left + (pinRect.width / 2);
      let dist = Math.abs(this.mouseX - pinCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestPinIndex = i;
      }
    }
    this.selectedPin = closestPinIndex;

    let pinRect = this.pins[this.selectedPin].getBoundingClientRect();
    let pinCenterX = (pinRect.left + pinRect.width / 2) - rect.left;

    let currentX = this.lockpickX;
    const toothOffset = this.toothOffsetStart; // подгони под свою отмычку!
    let targetX = pinCenterX - toothOffset;
    let newX = this.lerp(currentX, targetX, deltaTime * this.lockpickSpeed);
    this.lockpickX = newX;
    this.lockpickEl.style.left = this.lockpickX + "px";
  },

  randomRange(min, max) {
    return Math.random() * (max - min) + min;
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
};

LockpickingUI.init();