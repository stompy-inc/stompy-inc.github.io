const GAME_WIDTH = 540;
const GAME_HEIGHT = 960;

const HERO_X = GAME_WIDTH * 0.5;
const HERO_BASE_Y = 410;
const HERO_FEET_OFFSET = 82;
const HERO_TEXTURE_KEY = "hero";
const HERO_DISPLAY_WIDTH = 140;
const HERO_DISPLAY_HEIGHT = 210;
const HERO_SPRITE_OFFSET_Y = HERO_FEET_OFFSET;
const HERO_SPRITE_ORIGIN_Y = 0.85;
const BACKDROP_TEXTURE_KEY = "shinjuku-bg";
const BACKDROP_SCROLL_OVERSCAN = 220;
const HELICOPTER_TEXTURE_KEY = "helicopter";
const HELICOPTER_DISPLAY_WIDTH = 252;
const HELICOPTER_DISPLAY_HEIGHT = 378;
const HELICOPTER_START_Y = -280;
const HELICOPTER_REVEAL_Y = 78;
const HELICOPTER_HOOK_OFFSET_Y = 314;
const DRONE_START_Y = GAME_HEIGHT + 40;
const DRONE_TEXTURE_KEY = "drone";
const DRONE_DISPLAY_SIZE = 92;
const DRONE_FIRST_DELAY_MS = 220;
const DRONE_SPAWN_INTERVAL_MIN = 380;
const DRONE_SPAWN_INTERVAL_MAX = 520;
const DRONE_HIT_T_MIN = 0.58;
const DRONE_HIT_T_MAX = 0.66;
const DRONE_TRAVEL_TIME_MIN = 0.68;
const DRONE_TRAVEL_TIME_MAX = 0.84;

const START_ALTITUDE = 360;
const GOAL_ALTITUDE = 1500;
const ALTITUDE_DISPLAY_SCALE = 0.2;
const SFX_VOLUME_MULTIPLIER = 2;
const START_FALL_SPEED = -170;
const GRAVITY = 470;
const MAX_FALL_SPEED = -780;
const MAX_RISE_SPEED = 360;
const STOMP_BOOST = 205;
const STOMP_ALTITUDE_BONUS = 28;
const STOMP_HIT_RANGE_X = 150;//当たり判定調整:初期値74
const STOMP_HIT_RANGE_Y = 80;//当たり判定調整:初期値54
const STOMP_CUE_RANGE_X = 84;
const STOMP_CUE_RANGE_Y = 48;
const MISS_PENALTY = 90;
const JET_TEXTURE_KEY = "jet-flame";
const JET_SPRITE_WIDTH = 34;
const JET_SPRITE_HEIGHT = 21;
const JET_BURST_DURATION = 380;
const JET_OFFSET_X = 8;
const JET_OFFSET_Y = 62;
const MONSTER_TEXTURE_KEY = "monster";
const MONSTER_DISPLAY_SCALE = 0.64;
const MONSTER_BASE_DISPLAY_SIZE = 416;
const MONSTER_BASE_SHADOW_OFFSET_Y = 236;
const MONSTER_BASE_SHADOW_WIDTH = 430;
const MONSTER_BASE_SHADOW_HEIGHT = 86;
const MONSTER_ATTACK_TARGET_Y = GAME_HEIGHT * 0.86;
const UI_FONT_FAMILY = '"PressStart2P", "DotGothic16", "Trebuchet MS", Arial, sans-serif';

const clamp01 = (value) => Phaser.Math.Clamp(value, 0, 1);
const scaleSfxVolume = (volume) => Math.min(volume * SFX_VOLUME_MULTIPLIER, 0.35);
const formatAltitudeDisplay = (value) =>
  `${Math.max(0, Math.floor(value * ALTITUDE_DISPLAY_SCALE))}m`;

const lerpColor = (fromHex, toHex, amount) => {
  const from = Phaser.Display.Color.IntegerToColor(fromHex);
  const to = Phaser.Display.Color.IntegerToColor(toHex);
  return Phaser.Display.Color.GetColor(
    Math.round(Phaser.Math.Linear(from.red, to.red, amount)),
    Math.round(Phaser.Math.Linear(from.green, to.green, amount)),
    Math.round(Phaser.Math.Linear(from.blue, to.blue, amount))
  );
};

const solveQuadraticPath = (startValue, hitT, hitValue, endValue) => {
  const hitDelta = hitValue - startValue;
  const endDelta = endValue - startValue;
  const a = (hitDelta - endDelta * hitT) / (hitT * hitT - hitT);
  const b = endDelta - a;
  return { a, b, c: startValue };
};

const preloadGameAssets = (scene) => {
  scene.load.image(BACKDROP_TEXTURE_KEY, "./assets/shinjuku-bg.webp");
  scene.load.image(HELICOPTER_TEXTURE_KEY, "./assets/helicopter.png");
  scene.load.image(MONSTER_TEXTURE_KEY, "./assets/monster.png");
  scene.load.image(HERO_TEXTURE_KEY, "./assets/hero.png");
  scene.load.image(DRONE_TEXTURE_KEY, "./assets/drone.png");
  scene.load.image(JET_TEXTURE_KEY, "./assets/jet-flame.png");
};

class LoadingScene extends Phaser.Scene {
  constructor() {
    super("LoadingScene");
  }

  preload() {
    const centerX = GAME_WIDTH * 0.5;
    const centerY = GAME_HEIGHT * 0.5;
    const barWidth = GAME_WIDTH - 140;
    const barHeight = 28;
    const barY = centerY + 18;
    const barLeft = centerX - barWidth * 0.5;

    this.cameras.main.setBackgroundColor("#07111d");

    this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x07111d, 1);
    this.add.text(centerX, centerY - 132, "Jet Kamen", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "34px",
      color: "#ffffff",
      stroke: "#07111d",
      strokeThickness: 8
    }).setOrigin(0.5);

    const loadingLabel = this.add.text(centerX, centerY - 26, "LOADING", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "20px",
      color: "#ffe580",
      stroke: "#07111d",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.add.rectangle(centerX, barY, barWidth + 12, barHeight + 12, 0x0b1627, 0.9)
      .setStrokeStyle(4, 0xffd86b, 0.9);
    this.add.rectangle(centerX, barY, barWidth, barHeight, 0x09111f, 0.95);

    const progressFill = this.add.rectangle(barLeft, barY, 0, barHeight, 0xffa23a, 1)
      .setOrigin(0, 0.5);
    const progressGlow = this.add.rectangle(barLeft, barY, 0, barHeight, 0xffee9a, 0.35)
      .setOrigin(0, 0.5);

    const percentText = this.add.text(centerX, barY + 46, "0%", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#07111d",
      strokeThickness: 6
    }).setOrigin(0.5);

    const updateProgress = (value) => {
      const progress = clamp01(value);
      const width = Math.round(barWidth * progress);
      progressFill.width = width;
      progressGlow.width = width;
      percentText.setText(`${Math.round(progress * 100)}%`);
    };

    updateProgress(0);
    this.load.on("progress", updateProgress);
    this.load.once("complete", () => {
      updateProgress(1);
      loadingLabel.setText("READY");
    });

    preloadGameAssets(this);
  }

  create() {
    this.time.delayedCall(120, () => {
      this.scene.start("SkyKickRescueScene");
    });
  }
}

class SkyKickRescueScene extends Phaser.Scene {
  constructor() {
    super("SkyKickRescueScene");
  }

  init(data) {
    this.autoStart = Boolean(data && data.autoStart);
  }

  create() {
    this.phase = "ready";
    this.altitude = START_ALTITUDE;
    this.verticalSpeed = START_FALL_SPEED;
    this.combo = 0;
    this.bestCombo = 0;
    this.elapsed = 0;
    this.tapCooldownUntil = 0;
    this.nextDroneAt = 0;
    this.lastSpawnSide = "right";
    this.drones = [];
    this.heroNudgeY = 0;
    this.kickFlash = 0;
    this.readyPulse = 0;
    this.jetActiveUntil = 0;
    this.jetPulse = 0;
    this.gameOverReady = true;
    this.gameOverBestComboVisible = false;
    this.clearBestComboVisible = false;

    this.createSky();
    this.createMonster();
    this.createHero();
    this.createHelicopter();
    this.createHud();

    this.input.on("pointerdown", this.handlePointerDown, this);

    if (this.autoStart) {
      this.startRun();
    } else {
      this.showActionButton("Start");
    }
  }

  getAudioContext() {
    if (this.sound && this.sound.context) {
      return this.sound.context;
    }

    if (!this.fallbackAudioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      this.fallbackAudioContext = new AudioContextClass();
    }

    return this.fallbackAudioContext;
  }

  getAudioDestination(context) {
    if (this.sound && this.sound.context === context && this.sound.masterVolumeNode) {
      return this.sound.masterVolumeNode;
    }

    return context.destination;
  }

  unlockAudio() {
    const context = this.getAudioContext();
    if (context && context.state === "suspended") {
      context.resume().catch(() => {});
    }
  }

  playToneSweep(context, destination, type, startFreq, endFreq, startTime, duration, volume) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const scaledVolume = scaleSfxVolume(volume);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(scaledVolume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  getNoiseBuffer(context) {
    if (
      this.cachedNoiseBuffer &&
      this.cachedNoiseBuffer.sampleRate === context.sampleRate
    ) {
      return this.cachedNoiseBuffer;
    }

    const length = Math.floor(context.sampleRate * 0.35);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.cachedNoiseBuffer = buffer;
    return buffer;
  }

  playNoiseBurst(context, destination, startTime, duration, volume, startFreq, endFreq) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const scaledVolume = scaleSfxVolume(volume);

    source.buffer = this.getNoiseBuffer(context);
    filter.type = "bandpass";
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 40), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(scaledVolume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }

  playStompChime() {
    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    const destination = this.getAudioDestination(context);
    const now = context.currentTime;

    this.playToneSweep(context, destination, "square", 1568, 1976, now, 0.08, 0.045);
    this.playToneSweep(context, destination, "triangle", 2093, 2637, now + 0.04, 0.11, 0.035);
    this.playToneSweep(context, destination, "sine", 3136, 2637, now + 0.02, 0.07, 0.02);
  }

  playStartSwingSound() {
    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    const destination = this.getAudioDestination(context);
    const now = context.currentTime;

    this.playNoiseBurst(context, destination, now, 0.34, 0.085, 1800, 220);
    this.playToneSweep(context, destination, "sawtooth", 320, 82, now, 0.34, 0.06);
    this.playToneSweep(context, destination, "triangle", 210, 62, now + 0.03, 0.38, 0.052);
    this.playToneSweep(context, destination, "sine", 620, 140, now + 0.02, 0.16, 0.03);
  }

  playMonsterBiteSound() {
    const context = this.getAudioContext();
    if (!context) {
      return;
    }

    const destination = this.getAudioDestination(context);
    const now = context.currentTime;

    this.playNoiseBurst(context, destination, now + 0.02, 0.14, 0.06, 820, 240);
    this.playToneSweep(context, destination, "square", 196, 82, now, 0.12, 0.045);
    this.playToneSweep(context, destination, "triangle", 128, 48, now + 0.05, 0.22, 0.04);
    this.playToneSweep(context, destination, "sine", 74, 42, now + 0.08, 0.28, 0.03);
  }

  createSky() {
    this.sky = this.add.image(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, BACKDROP_TEXTURE_KEY);
    this.sky.setDepth(0);
    const sourceImage = this.textures.get(BACKDROP_TEXTURE_KEY).getSourceImage();
    const coverScale = Math.max(GAME_WIDTH / sourceImage.width, GAME_HEIGHT / sourceImage.height);
    const scrollScale = (GAME_HEIGHT + BACKDROP_SCROLL_OVERSCAN) / sourceImage.height;
    const backdropScale = Math.max(coverScale, scrollScale);
    const scaledHeight = sourceImage.height * backdropScale;
    this.skyScrollRange = Math.max(0, (scaledHeight - GAME_HEIGHT) * 0.5);
    this.sky.setScale(backdropScale);

    this.skyShade = this.add.rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT, 0x04111f, 0.04);
    this.skyShade.setDepth(1);

    this.topMist = this.add.rectangle(GAME_WIDTH * 0.5, 108, GAME_WIDTH, 230, 0xffffff, 0.045);
    this.topMist.setDepth(2);
  }

  createMonster() {
    this.monsterHiddenY = GAME_HEIGHT + 420;
    this.monster = this.add.container(GAME_WIDTH * 0.5, this.monsterHiddenY);
    this.monster.setDepth(20);
    this.monster.setVisible(false);
    this.monsterShadow = this.add.ellipse(
      0,
      MONSTER_BASE_SHADOW_OFFSET_Y * MONSTER_DISPLAY_SCALE,
      MONSTER_BASE_SHADOW_WIDTH * MONSTER_DISPLAY_SCALE,
      MONSTER_BASE_SHADOW_HEIGHT * MONSTER_DISPLAY_SCALE,
      0x120813,
      0.24
    );
    this.monsterSprite = this.createMonsterImage(MONSTER_TEXTURE_KEY);

    this.monster.add([this.monsterShadow, this.monsterSprite]);
  }

  createMonsterImage(textureKey) {
    const sprite = this.add.image(0, 0, textureKey);
    sprite.setOrigin(0.5, 0.42);
    sprite.setDisplaySize(
      MONSTER_BASE_DISPLAY_SIZE * MONSTER_DISPLAY_SCALE,
      MONSTER_BASE_DISPLAY_SIZE * MONSTER_DISPLAY_SCALE
    );
    return sprite;
  }

  createHero() {
    this.stompZone = this.add.ellipse(HERO_X, HERO_BASE_Y + 88, 130, 40, 0xffffff, 0.08);
    this.stompZone.setDepth(32);
    this.stompZone.setStrokeStyle(2, 0xffffff, 0.18);
    this.stompZone.setVisible(false);
    this.stompZone.setAlpha(0);

    this.heroShadow = this.add.ellipse(HERO_X, HERO_BASE_Y + 112, 72, 18, 0x08101d, 0.32);
    this.heroShadow.setDepth(31);
    this.heroShadow.setVisible(false);
    this.heroShadow.setAlpha(0);

    this.hero = this.add.container(HERO_X, HERO_BASE_Y);
    this.hero.setDepth(40);

    this.heroSprite = this.add.image(0, HERO_SPRITE_OFFSET_Y, HERO_TEXTURE_KEY);
    this.heroSprite.setOrigin(0.5, HERO_SPRITE_ORIGIN_Y);
    this.heroSprite.setDisplaySize(HERO_DISPLAY_WIDTH, HERO_DISPLAY_HEIGHT);
    this.jetFlames = this.add.container(JET_OFFSET_X, JET_OFFSET_Y);
    const leftJetSprite = this.add.image(-14, 4, JET_TEXTURE_KEY);
    const rightJetSprite = this.add.image(14, 4, JET_TEXTURE_KEY);
    leftJetSprite.setOrigin(0.5, 0);
    rightJetSprite.setOrigin(0.5, 0);
    leftJetSprite.setDisplaySize(JET_SPRITE_WIDTH, JET_SPRITE_HEIGHT);
    rightJetSprite.setDisplaySize(JET_SPRITE_WIDTH, JET_SPRITE_HEIGHT);
    this.jetFlames.add([leftJetSprite, rightJetSprite]);
    this.jetFlames.setVisible(false);
    this.jetFlames.setAlpha(0);

    this.jetSprites = [leftJetSprite, rightJetSprite];

    this.hero.add([
      this.jetFlames,
      this.heroSprite
    ]);
  }

  createHelicopter() {
    this.heli = this.add.container(HERO_X, HELICOPTER_START_Y);
    this.heli.setDepth(55);
    this.heli.setVisible(false);
    this.heliSprite = this.add.image(0, 0, HELICOPTER_TEXTURE_KEY);
    this.heliSprite.setOrigin(0.5, 0);
    this.heliSprite.setDisplaySize(HELICOPTER_DISPLAY_WIDTH, HELICOPTER_DISPLAY_HEIGHT);
    this.heliHook = this.add.zone(0, HELICOPTER_HOOK_OFFSET_Y, 54, 18).setOrigin(0.5, 0.5);

    this.heli.add([this.heliSprite, this.heliHook]);
  }

  createHud() {
    this.hudPanel = this.add.rectangle(GAME_WIDTH * 0.5, 56, GAME_WIDTH - 28, 92, 0x06111f, 0.32);
    this.hudPanel.setDepth(90);
    this.hudPanel.setStrokeStyle(2, 0xffffff, 0.12);
    this.hudPanel.setVisible(false);

    this.altitudeText = this.add.text(34, 28, formatAltitudeDisplay(START_ALTITUDE), {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "28px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#07111d",
      strokeThickness: 6
    });
    this.altitudeText.setDepth(95);

    this.comboText = this.add.text(GAME_WIDTH - 34, 30, "", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffe580",
      stroke: "#07111d",
      strokeThickness: 6,
      align: "right"
    });
    this.comboText.setOrigin(1, 0);
    this.comboText.setDepth(95);

    this.messageText = this.add.text(GAME_WIDTH * 0.5, 216, "Jet Kamen", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "40px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#14305a",
      strokeThickness: 8,
      align: "center"
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setDepth(110);

    this.subMessageText = this.add.text(
      GAME_WIDTH * 0.5,
      288,
      "",
      {
        fontFamily: UI_FONT_FAMILY,
        fontSize: "28px",
        color: "#dff9ff",
        align: "center",
        lineSpacing: 10,
        stroke: "#0b1f38",
        strokeThickness: 6
      }
    );
    this.subMessageText.setOrigin(0.5);
    this.subMessageText.setDepth(110);
    this.subMessageText.setVisible(false);

    this.actionButton = this.add.container(GAME_WIDTH * 0.5, GAME_HEIGHT - 150);
    this.actionButtonShadow = this.add.rectangle(0, 6, 276, 90, 0x06111f, 0.32);
    this.actionButtonShadow.setStrokeStyle(2, 0x000000, 0.08);
    this.actionButtonBg = this.add.rectangle(0, 0, 276, 90, 0x0c2342, 0.92);
    this.actionButtonBg.setStrokeStyle(3, 0xffef84, 0.85);
    this.actionButtonLabel = this.add.text(0, 0, "Start", {
      fontFamily: UI_FONT_FAMILY,
      fontSize: "28px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#07111d",
      strokeThickness: 6
    });
    this.actionButtonLabel.setOrigin(0.5);
    this.actionButton.add([this.actionButtonShadow, this.actionButtonBg, this.actionButtonLabel]);
    this.actionButton.setDepth(120);
    this.actionButtonBg.setInteractive({ useHandCursor: true });
    this.actionButtonBg.on("pointerdown", (pointer, localX, localY, event) => {
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      this.handleActionButton();
    });
    this.actionButton.setVisible(false);
  }

  showActionButton(label) {
    this.actionButtonLabel.setText(label);
    this.actionButton.setVisible(true);
  }

  hideActionButton() {
    this.actionButton.setVisible(false);
  }

  handleActionButton() {
    this.unlockAudio();

    if (this.phase === "ready") {
      this.startRun();
      return;
    }

    if (this.phase === "clear" || this.phase === "gameover") {
      this.scene.restart({ autoStart: true });
    }
  }

  startJetBurst(now) {
    this.tapCooldownUntil = now + JET_BURST_DURATION;
    this.jetActiveUntil = this.tapCooldownUntil;
    this.jetPulse = 0;
    this.jetFlames.setVisible(true);
    this.jetFlames.setAlpha(1);
  }

  handlePointerDown() {
    this.unlockAudio();

    if (this.phase === "ready" || this.phase === "clear" || this.phase === "gameover") {
      return;
    }

    const now = this.time.now;
    if (now < this.tapCooldownUntil) {
      return;
    }

    this.startJetBurst(now);
    const heroFeetY = this.getHeroFeetY();

    let candidate = null;
    let candidateScore = Number.POSITIVE_INFINITY;

    for (const drone of this.drones) {
      if (!drone.active || drone.stomped) {
        continue;
      }

      const distanceX = Math.abs(drone.container.x - HERO_X);
      const distanceY = Math.abs(drone.container.y - heroFeetY);
      const score = distanceX * 1.2 + distanceY;

      if (distanceX <= STOMP_HIT_RANGE_X && distanceY <= STOMP_HIT_RANGE_Y && score < candidateScore) {
        candidate = drone;
        candidateScore = score;
      }
    }

    if (candidate) {
      this.stompDrone(candidate);
      return;
    }

    this.missTap();
  }

  startRun() {
    this.phase = "playing";
    this.playStartSwingSound();
    this.messageText.setVisible(false);
    this.subMessageText.setVisible(false);
    this.hideActionButton();
    this.spawnDrone();
    this.nextDroneAt = this.time.now + DRONE_FIRST_DELAY_MS;
  }

  getHeroFeetY() {
    return this.hero.y + HERO_FEET_OFFSET;
  }

  spawnDrone() {
    const side = this.lastSpawnSide === "left" ? "right" : "left";
    this.lastSpawnSide = side;

    const startX = side === "left" ? 46 : GAME_WIDTH - 46;
    const hitX = HERO_X + Phaser.Math.Between(-18, 18);
    const endX = HERO_X + (side === "left" ? 112 : -112) + Phaser.Math.Between(-26, 26);

    const heroFeetY = this.getHeroFeetY();
    const startY = DRONE_START_Y;
    const hitY = heroFeetY + Phaser.Math.Between(-8, 20);
    const endY = heroFeetY - Phaser.Math.Between(150, 220);
    const hitT = Phaser.Math.FloatBetween(DRONE_HIT_T_MIN, DRONE_HIT_T_MAX);
    const travelTime = Phaser.Math.FloatBetween(DRONE_TRAVEL_TIME_MIN, DRONE_TRAVEL_TIME_MAX);

    const pathX = solveQuadraticPath(startX, hitT, hitX, endX);
    const pathY = solveQuadraticPath(startY, hitT, hitY, endY);

    const container = this.add.container(startX, startY);
    container.setDepth(34);
    const sprite = this.add.image(0, 0, DRONE_TEXTURE_KEY);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDisplaySize(DRONE_DISPLAY_SIZE, DRONE_DISPLAY_SIZE);
    sprite.setFlipX(side === "left");
    container.add(sprite);

    this.drones.push({
      active: true,
      container,
      sprite,
      pathX,
      pathY,
      t: 0,
      hitT,
      speed: 1 / travelTime,
      spinDir: side === "left" ? 1 : -1,
      stomped: false,
      passedHero: false
    });
  }

  stompDrone(drone) {
    if (!drone.active) {
      return;
    }

    drone.stomped = true;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    const comboBoost = Math.min(42, (this.combo - 1) * 8);
    this.verticalSpeed = Phaser.Math.Clamp(
      Math.max(this.verticalSpeed, 80) + STOMP_BOOST + comboBoost,
      MAX_FALL_SPEED,
      MAX_RISE_SPEED
    );
    this.altitude += STOMP_ALTITUDE_BONUS + this.combo * 4;
    this.kickFlash = 1;

    this.tweens.add({
      targets: this.hero,
      scaleX: 1.08,
      scaleY: 0.9,
      duration: 70,
      yoyo: true,
      ease: "Quad.easeOut"
    });

    this.tweens.add({
      targets: drone.container,
      y: drone.container.y + 56,
      alpha: 0,
      angle: drone.spinDir * 120,
      scaleX: 0.58,
      scaleY: 0.58,
      duration: 160,
      ease: "Quad.easeIn",
      onComplete: () => this.removeDrone(drone)
    });

    this.spawnBurst(drone.container.x, drone.container.y, 0x8cf8ff);
    this.playStompChime();
  }

  missTap() {
    this.verticalSpeed = Math.max(this.verticalSpeed - MISS_PENALTY, MAX_FALL_SPEED);
    this.combo = 0;
    this.kickFlash = Math.max(this.kickFlash, 0.28);

    this.tweens.add({
      targets: this.hero,
      angle: 10,
      duration: 60,
      yoyo: true,
      ease: "Sine.easeOut"
    });

  }

  spawnBurst(x, y, color) {
    for (let index = 0; index < 7; index += 1) {
      const spark = this.add.circle(x, y, Phaser.Math.Between(4, 7), color, 0.95);
      spark.setDepth(60);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(-60, 24),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(220, 360),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy()
      });
    }
  }

  removeDrone(drone) {
    if (!drone.active) {
      return;
    }

    drone.active = false;
    drone.container.destroy();
  }

  update(time, delta) {
    const dt = delta / 1000;

    this.updateSkyColor();
    this.updateHelicopter(time);
    this.updateMonster(time);
    this.updateHero(time, dt);
    this.updateReadyPulse(dt);
    this.updateDroneCue();
    this.cleanupDrones();
    this.refreshHud();

    if (this.phase !== "playing") {
      return;
    }

    this.elapsed += dt;
    this.verticalSpeed = Math.max(this.verticalSpeed - GRAVITY * dt, MAX_FALL_SPEED);
    this.altitude += this.verticalSpeed * dt;

    if (time >= this.nextDroneAt) {
      this.spawnDrone();
      this.nextDroneAt = time + Phaser.Math.Between(DRONE_SPAWN_INTERVAL_MIN, DRONE_SPAWN_INTERVAL_MAX);
    }

    for (const drone of this.drones) {
      if (!drone.active || drone.stomped) {
        continue;
      }

      drone.t += drone.speed * dt;

      const x = drone.pathX.a * drone.t * drone.t + drone.pathX.b * drone.t + drone.pathX.c;
      const y = drone.pathY.a * drone.t * drone.t + drone.pathY.b * drone.t + drone.pathY.c;

      drone.container.x = x;
      drone.container.y = y;
      drone.container.angle = Math.sin(drone.t * 15) * 5 * drone.spinDir;

      if (!drone.passedHero && drone.t > drone.hitT + 0.09) {
        drone.passedHero = true;
        this.combo = 0;
      }

      if (
        x < -110 ||
        x > GAME_WIDTH + 110 ||
        y < -110 ||
        y > GAME_HEIGHT + 110
      ) {
        this.removeDrone(drone);
      }
    }

    if (this.altitude <= 0) {
      this.altitude = 0;
      this.triggerGameOver();
    }

    const hookWorldY = this.heli.y + this.heliHook.y;
    if (this.altitude >= GOAL_ALTITUDE && hookWorldY >= this.hero.y - 18) {
      this.triggerClear();
    }
  }

  updateSkyColor() {
    const progress = clamp01(this.altitude / GOAL_ALTITUDE);
    const visualProgress = clamp01(
      (this.altitude - START_ALTITUDE) / Math.max(1, GOAL_ALTITUDE - START_ALTITUDE)
    );
    const targetSkyY = GAME_HEIGHT * 0.5 + Phaser.Math.Linear(-this.skyScrollRange, this.skyScrollRange, visualProgress);
    this.sky.y = Phaser.Math.Linear(this.sky.y, targetSkyY, 0.08);
    this.skyShade.alpha = Phaser.Math.Linear(0.04, 0.16, visualProgress);
    this.topMist.alpha = Phaser.Math.Linear(0.045, 0.12, progress);
  }

  updateMonster(time) {
    if (!this.monster.visible || this.phase === "gameover") {
      return;
    }
  }

  updateHero(time, dt) {
    if (this.phase === "gameover") {
      this.jetFlames.setVisible(false);
      this.jetFlames.setAlpha(0);
      return;
    }

    const bob = Math.sin(time * 0.006) * 4;
    const targetY = HERO_BASE_Y - Phaser.Math.Clamp(this.verticalSpeed * 0.24, -48, 72) + bob;
    this.hero.y = Phaser.Math.Linear(this.hero.y, targetY, 0.12);
    this.heroShadow.scaleX = Phaser.Math.Linear(this.heroShadow.scaleX || 1, 1.08 + (this.hero.y - HERO_BASE_Y) * -0.0025, 0.15);
    this.heroShadow.scaleY = Phaser.Math.Linear(this.heroShadow.scaleY || 1, 1 - (this.hero.y - HERO_BASE_Y) * 0.0015, 0.15);

    this.kickFlash = Math.max(0, this.kickFlash - dt * 2.2);
    this.heroSprite.setTint(lerpColor(0xffffff, 0xffcf93, this.kickFlash * 0.65));

    const jetRemaining = this.jetActiveUntil - time;
    if (jetRemaining > 0 && this.phase === "playing") {
      const intensity = Phaser.Math.Clamp(jetRemaining / JET_BURST_DURATION, 0, 1);
      this.jetPulse += dt * 28;
      this.jetFlames.setVisible(true);
      this.jetFlames.y = JET_OFFSET_Y + Math.sin(this.jetPulse * 0.55) * 2;
      this.jetFlames.alpha = 0.72 + Math.sin(this.jetPulse) * 0.12;

      for (let index = 0; index < this.jetSprites.length; index += 1) {
        const wobble = 0.92 + Math.sin(this.jetPulse + index * 0.85) * 0.14;
        this.jetSprites[index].scaleY = (0.72 + intensity * 0.78) * wobble;
        this.jetSprites[index].scaleX = 0.9 + intensity * 0.12 + Math.cos(this.jetPulse + index) * 0.05;
        this.jetSprites[index].alpha = 0.86 + Math.sin(this.jetPulse * 1.25 + index * 0.5) * 0.08;
      }
    } else {
      this.jetFlames.setVisible(false);
      this.jetFlames.setAlpha(0);
      this.jetFlames.y = JET_OFFSET_Y;
      for (const jetSprite of this.jetSprites) {
        jetSprite.scaleX = 1;
        jetSprite.scaleY = 1;
        jetSprite.alpha = 1;
      }
    }
  }

  updateHelicopter(time) {
    const reveal = clamp01((this.altitude - (GOAL_ALTITUDE - 280)) / 280);
    if (reveal <= 0) {
      this.heli.setVisible(false);
      this.heli.alpha = 0;
      return;
    }

    this.heli.setVisible(true);
    this.heli.y = Phaser.Math.Linear(HELICOPTER_START_Y, HELICOPTER_REVEAL_Y, reveal) + Math.sin(time * 0.0042) * 4 * reveal;
    this.heli.x = HERO_X + Math.sin(time * 0.0035) * 24;
    this.heli.angle = Math.sin(time * 0.0028) * 1.2;
    this.heli.alpha = Phaser.Math.Linear(0.24, 1, reveal);
  }

  updateReadyPulse(dt) {
    this.readyPulse += dt * 2.8;
    const pulse = 0.08 + Math.sin(this.readyPulse) * 0.03;
    this.stompZone.setAlpha(this.phase === "playing" ? this.stompZone.alpha : 0.12 + pulse);
  }

  updateDroneCue() {
    if (this.phase !== "playing") {
      return;
    }

    if (this.time.now < this.tapCooldownUntil) {
      this.stompZone.setFillStyle(0xffad54, 0.2);
      this.stompZone.setStrokeStyle(2, 0xffd28a, 0.45);
      return;
    }

    const heroFeetY = this.getHeroFeetY();
    let hot = false;

    for (const drone of this.drones) {
      if (!drone.active || drone.stomped) {
        continue;
      }

      if (
        Math.abs(drone.container.x - HERO_X) <= STOMP_CUE_RANGE_X &&
        Math.abs(drone.container.y - heroFeetY) <= STOMP_CUE_RANGE_Y
      ) {
        hot = true;
        break;
      }
    }

    this.stompZone.setFillStyle(hot ? 0xfff1b3 : 0xffffff, hot ? 0.18 : 0.08);
    this.stompZone.setStrokeStyle(2, hot ? 0xffe270 : 0xffffff, hot ? 0.34 : 0.18);
  }

  cleanupDrones() {
    this.drones = this.drones.filter((drone) => drone.active);
  }

  refreshHud() {
    this.altitudeText.setText(formatAltitudeDisplay(this.altitude));

    if (this.phase === "clear") {
      this.comboText.setText(this.clearBestComboVisible ? `BEST COMBO x${this.bestCombo}` : "");
    } else if (this.phase === "gameover") {
      this.comboText.setText(this.gameOverBestComboVisible ? `BEST COMBO x${this.bestCombo}` : "");
    } else if (this.phase === "playing") {
      this.comboText.setText(this.combo >= 2 ? `COMBO x${this.combo}` : "");
    } else {
      this.comboText.setText("");
    }
  }

  triggerGameOver() {
    if (this.phase !== "playing") {
      return;
    }

    this.phase = "gameover";
    this.gameOverReady = false;
    this.gameOverBestComboVisible = false;
    this.verticalSpeed = 0;
    this.jetActiveUntil = 0;
    this.messageText.setVisible(false);
    this.subMessageText.setVisible(false);
    this.hideActionButton();
    this.stompZone.setVisible(false);

    const monsterTargetY = MONSTER_ATTACK_TARGET_Y;
    const mouthTargetY = monsterTargetY + 18;

    this.playMonsterBiteSound();

    this.monster.setVisible(true);
    this.monster.y = this.monsterHiddenY;
    this.monster.scaleX = 1;
    this.monster.scaleY = 1;
    this.monster.angle = 0;
    this.monsterShadow.alpha = 0.24;
    this.monsterSprite.scaleX = 1;
    this.monsterSprite.scaleY = 1;

    this.tweens.killTweensOf(this.monster);
    this.tweens.killTweensOf(this.hero);
    this.tweens.killTweensOf(this.heroShadow);
    this.tweens.killTweensOf(this.monsterSprite);
    this.tweens.killTweensOf(this.monsterShadow);

    this.tweens.add({
      targets: this.monster,
      y: monsterTargetY,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 460,
      ease: "Back.easeOut"
    });

    this.tweens.add({
      targets: this.monsterSprite,
      scaleX: 1.02,
      scaleY: 1.12,
      duration: 220,
      ease: "Quad.easeOut"
    });

    this.tweens.add({
      targets: this.monsterShadow,
      alpha: 0.42,
      scaleX: 1.15,
      duration: 260,
      ease: "Quad.easeOut"
    });

    this.tweens.add({
      targets: this.hero,
      y: mouthTargetY,
      scaleX: 0.28,
      scaleY: 0.28,
      alpha: 0.08,
      angle: 12,
      duration: 360,
      ease: "Quad.easeIn"
    });

    this.tweens.add({
      targets: this.heroShadow,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 260,
      ease: "Quad.easeIn"
    });

    this.time.delayedCall(460, () => {
      this.messageText.setText("GAME OVER");
      this.messageText.setVisible(true);

      this.time.delayedCall(500, () => {
        this.gameOverBestComboVisible = true;
        this.showActionButton("Play");
        this.gameOverReady = true;
      });
    });
  }

  triggerClear() {
    if (this.phase !== "playing") {
      return;
    }

    this.phase = "clear";
    this.clearBestComboVisible = false;
    this.messageText.setText("RESCUE!");
    this.messageText.setVisible(true);
    this.subMessageText.setVisible(false);
    this.hideActionButton();

    this.tweens.add({
      targets: this.hero,
      y: this.hero.y - 48,
      duration: 260,
      ease: "Sine.easeOut"
    });

    this.spawnBurst(HERO_X, this.hero.y - 24, 0xffef84);
    this.spawnBurst(HERO_X - 46, this.hero.y - 6, 0xffffff);
    this.spawnBurst(HERO_X + 46, this.hero.y - 6, 0x7ef8ff);

    this.time.delayedCall(500, () => {
      this.clearBestComboVisible = true;
      this.showActionButton("Play");
    });
  }
}

window.addEventListener("load", async () => {
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('16px "PressStart2P"'),
        document.fonts.ready
      ]);
    } catch (error) {
      console.warn("PressStart2P font preload failed", error);
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-shell",
    backgroundColor: "#07111d",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [LoadingScene, SkyKickRescueScene]
  };

  new Phaser.Game(config);
});
