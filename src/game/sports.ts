import Phaser from "phaser";
import type { PlayScene } from "./runtime";
import { random } from "./level";
export class SportsController {
  scene: PlayScene;
  ball!: Phaser.Physics.Arcade.Sprite;
  aim = 55;
  charge = 0;
  targetPower = 0.5;
  previousAction = false;
  phase: "waiting" | "charging" | "flight" | "incoming" | "hit" | "settling" =
    "waiting";
  hoopX = 510;
  hoopY = 150;
  lastBallY = 0;
  settle = 0;
  flightTime = 0;
  delivery = 0;
  swing = 0;
  scored = false;
  meter!: Phaser.GameObjects.Graphics;
  label!: Phaser.GameObjects.Text;
  bat!: Phaser.GameObjects.Graphics;
  constructor(scene: PlayScene) {
    this.scene = scene;
  }
  create() {
    const s = this.scene,
      spec = s.spec,
      rng = random(spec.seed),
      basket = spec.genre === "basketball";
    s.elapsed = 0;
    s.worldWidth = 640;
    s.status = {
      health: spec.health,
      score: 0,
      state: "ready",
      progress: 0,
      detail: basket
        ? "Hold Space to charge, release to shoot."
        : "Watch the delivery. Tap Space as the ball reaches your bat.",
    };
    s.physics.world.setBounds(0, 0, 640, 360);
    s.cameras.main.setBounds(0, 0, 640, 360);
    s.background = s.add.tileSprite(0, 0, 640, 360, "background").setOrigin(0);
    if (spec.night) s.background.setTint(0x7897b1);
    s.player = s.physics.add
      .sprite(basket ? 165 : 150, basket ? 286 : 280, spec.hero)
      .setScale(3)
      .setDepth(8);
    (s.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    if (!s.anims.exists(spec.hero + "-move"))
      s.anims.create({
        key: spec.hero + "-move",
        frames: s.anims.generateFrameNumbers(spec.hero, { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
    const key = basket ? "basketball-ball" : "cricket-ball";
    if (!s.textures.exists(key)) {
      const g = s.add.graphics();
      g.fillStyle(0x253331);
      g.fillCircle(8, 8, 8);
      g.fillStyle(basket ? 0xf9a358 : 0xd97458);
      g.fillCircle(8, 8, 6);
      g.lineStyle(1, basket ? 0x724329 : 0xffe7c9);
      g.lineBetween(2, 8, 14, 8);
      g.lineBetween(8, 2, 8, 14);
      if (basket) g.strokeEllipse(8, 8, 7, 14);
      g.generateTexture(key, 16, 16);
      g.destroy();
    }
    this.ball = s.physics.add
      .sprite(185, 260, key)
      .setScale(basket ? 1.3 : 0.75)
      .setDepth(10);
    this.ball.setCircle(7, 1, 1).setBounce(0.65);
    this.meter = s.add.graphics().setDepth(12);
    this.label = s.add
      .text(24, 18, "", {
        fontFamily: "Space, sans-serif",
        fontSize: "12px",
        color: "#fff4d9",
        backgroundColor: "#20342c",
        padding: { x: 10, y: 7 },
      })
      .setDepth(13);
    const art = s.add.graphics().setDepth(7);
    if (basket) {
      this.hoopX = 480 + Math.floor(rng() * 65);
      this.hoopY = 125 + Math.floor(rng() * 40);
      art.fillStyle(0x344e59);
      art.fillRect(this.hoopX + 31, this.hoopY - 53, 7, 162);
      art.fillStyle(0xf5ebd3);
      art.fillRect(this.hoopX + 23, this.hoopY - 58, 9, 63);
      art.lineStyle(2, 0x2e5363);
      art.strokeRect(this.hoopX + 24, this.hoopY - 40, 7, 26);
      art.lineStyle(2, 0xffefd7);
      for (let i = 0; i < 5; i++) {
        art.lineBetween(
          this.hoopX - 22 + i * 11,
          this.hoopY,
          this.hoopX - 13 + i * 6,
          this.hoopY + 27,
        );
        art.lineBetween(
          this.hoopX - 22 + i * 11,
          this.hoopY + 5,
          this.hoopX - 13 + i * 6,
          this.hoopY + 27,
        );
      }
      art.lineBetween(
        this.hoopX - 18,
        this.hoopY + 14,
        this.hoopX + 18,
        this.hoopY + 14,
      );
      art.lineStyle(4, 0xeb9462);
      art.lineBetween(this.hoopX - 24, this.hoopY, this.hoopX + 24, this.hoopY);
      const floor = s.add.rectangle(320, 326, 640, 12, 0xc79262, 0);
      s.physics.add.existing(floor, true);
      s.physics.add.collider(this.ball, floor, () => {
        if (this.phase === "flight") this.completeShot();
      });
      for (const x of [this.hoopX - 26, this.hoopX + 26]) {
        const rim = s.add.rectangle(x, this.hoopY, 6, 6, 0xeb9462);
        s.physics.add.existing(rim, true);
        s.physics.add.collider(this.ball, rim);
      }
      const board = s.add.rectangle(
        this.hoopX + 30,
        this.hoopY - 29,
        6,
        58,
        0xf7ebd3,
      );
      s.physics.add.existing(board, true);
      s.physics.add.collider(this.ball, board);
      this.resetShot();
    } else {
      art.fillStyle(0xf6e3ac);
      for (const x of [122, 129, 136]) art.fillRect(x, 273, 3, 38);
      art.fillRect(120, 270, 20, 3);
      art.fillStyle(0xefd7ad);
      for (const x of [530, 537, 544]) art.fillRect(x, 278, 3, 30);
      s.add
        .sprite(549, 281, "athlete")
        .setScale(2.5)
        .setTint(0xa9c8df)
        .setFlipX(true);
      this.bat = s.add.graphics().setDepth(9);
      const zone = s.add.zone(185, 278, 55, 52);
      s.physics.add.existing(zone, true);
      s.physics.add.overlap(this.ball, zone, () => {
        if (this.phase === "incoming" && this.swing > 0) this.hitBall();
      });
      this.bowl();
    }
    if (s.input.keyboard) {
      s.input.keyboard.disableGlobalCapture();
      s.keys = s.input.keyboard.addKeys(
        {
          left: "LEFT",
          right: "RIGHT",
          up: "UP",
          down: "DOWN",
          a: "A",
          d: "D",
          w: "W",
          s: "S",
          jump: "SPACE",
          dash: "SHIFT",
          shoot: "J",
        },
        false,
      ) as Record<string, Phaser.Input.Keyboard.Key>;
    }
    s.events.once("shutdown", () => {
      void s.audio?.close();
      s.audio = undefined;
    });
    s.emit();
  }
  resetShot() {
    this.phase = "waiting";
    this.charge = 0;
    this.scored = false;
    this.flightTime = 0;
    this.ball
      .setPosition(this.scene.player.x + 19, 265)
      .setVelocity(0)
      .setGravityY(0)
      .setAngularVelocity(0);
    this.ball.body!.reset(this.ball.x, this.ball.y);
    this.lastBallY = this.ball.y;
  }
  completeShot() {
    if (this.phase !== "flight") return;
    const s = this.scene;
    if (!this.scored) {
      s.status.health--;
      s.status.detail = "Missed. Adjust your aim or release in the green band.";
      s.tone(150, 0.1);
      if (s.status.health <= 0) s.finish("lost");
    }
    this.phase = "settling";
    this.settle = 0.65;
    s.emit();
  }
  bowl() {
    const s = this.scene,
      rng = random(s.spec.seed + this.delivery++ * 37);
    this.phase = "incoming";
    this.swing = 0;
    this.flightTime = 0;
    this.ball
      .setPosition(540, 272 + rng() * 12)
      .setVelocity(
        -Math.min(420, 170 + s.spec.speed * 0.5 + s.spec.difficulty * 18),
        0,
      )
      .setGravityY(0)
      .setAngularVelocity(180);
    this.ball.body!.reset(this.ball.x, this.ball.y);
    this.ball.setVelocityX(
      -Math.min(420, 170 + s.spec.speed * 0.5 + s.spec.difficulty * 18),
    );
    s.status.detail = "Ball incoming — swing when it reaches the green zone.";
  }
  hitBall() {
    const s = this.scene,
      precision = Math.max(0, 1 - Math.abs(this.ball.x - 185) / 28),
      runs = precision > 0.68 ? 6 : precision > 0.25 ? 4 : 1;
    this.phase = "hit";
    this.flightTime = 0;
    this.ball
      .setGravityY(430)
      .setVelocity(260 + precision * 180, -190 - precision * 180)
      .setAngularVelocity(400);
    s.status.score += runs;
    s.status.detail =
      runs === 6
        ? "SIX! Perfect timing."
        : runs === 4
          ? "FOUR! A beautiful boundary."
          : "One run. Aim for the center of the timing zone.";
    s.spark(185, 275, 0xf6ce70);
    s.tone(runs === 6 ? 900 : 650, 0.13);
    s.status.progress = Math.min(1, s.status.score / s.spec.goal);
    if (s.status.score >= s.spec.goal) s.finish("won");
    s.emit();
  }
  update(
    dt: number,
    input: { left: boolean; right: boolean; action: boolean },
  ) {
    const s = this.scene,
      basket = s.spec.genre === "basketball";
    this.flightTime += dt;
    if (basket) {
      if (this.phase === "waiting" || this.phase === "charging") {
        this.aim = Phaser.Math.Clamp(
          this.aim + (Number(input.left) - Number(input.right)) * 32 * dt,
          45,
          72,
        );
        const angle = Phaser.Math.DegToRad(this.aim),
          distance = this.hoopX - this.ball.x,
          height = this.ball.y - this.hoopY;
        const v = Math.sqrt(
          (600 * distance * distance) /
            (2 * Math.cos(angle) ** 2 * (distance * Math.tan(angle) - height)),
        );
        this.targetPower = Phaser.Math.Clamp((v - 320) / 360, 0.06, 0.94);
        if (input.action) {
          this.phase = "charging";
          this.charge = Math.min(
            1,
            this.charge +
              dt * (0.45 + s.spec.speed / 500 + s.spec.difficulty * 0.03),
          );
        }
        if (!input.action && this.previousAction && this.phase === "charging") {
          const inGreenBand =
            Math.abs(this.charge - this.targetPower) <=
            0.065 - s.spec.difficulty * 0.006;
          const speed =
            320 + (inGreenBand ? this.targetPower : this.charge) * 360;
          this.phase = "flight";
          this.flightTime = 0;
          this.ball
            .setGravityY(600)
            .setVelocity(Math.cos(angle) * speed, -Math.sin(angle) * speed)
            .setAngularVelocity(220);
          s.tone(370, 0.06);
        }
      }
      if (this.phase === "flight") {
        if (
          !this.scored &&
          this.ball.body!.velocity.y > 0 &&
          this.lastBallY < this.hoopY &&
          this.ball.y >= this.hoopY &&
          Math.abs(this.ball.x - this.hoopX) < 20
        ) {
          this.scored = true;
          s.status.score += 2;
          s.status.detail = "Swish! Two points.";
          s.spark(this.hoopX, this.hoopY, 0xf6ce70);
          s.tone(850, 0.12);
          if (s.status.score >= s.spec.goal) s.finish("won");
          s.emit();
        }
        if (this.flightTime > 3 || this.ball.x > 665 || this.ball.x < 0)
          this.completeShot();
      }
      this.lastBallY = this.ball.y;
      if (this.phase === "settling") {
        this.settle -= dt;
        if (this.settle <= 0) this.resetShot();
      }
      this.meter.clear();
      this.meter.fillStyle(0x20342c, 0.9);
      this.meter.fillRoundedRect(24, 54, 184, 43, 5);
      this.meter.fillStyle(0x5a6d59);
      this.meter.fillRect(34, 75, 164, 9);
      this.meter.fillStyle(0xd8ed83);
      const band = 0.065 - s.spec.difficulty * 0.006;
      this.meter.fillRect(
        34 + 164 * (this.targetPower - band),
        73,
        328 * band,
        13,
      );
      this.meter.fillStyle(0xffd29b);
      this.meter.fillRect(34, 75, 164 * this.charge, 9);
      if (this.phase === "waiting" || this.phase === "charging") {
        const angle = Phaser.Math.DegToRad(this.aim),
          v =
            320 +
            (this.phase === "waiting" ? this.targetPower : this.charge) * 360;
        this.meter.fillStyle(0xfff0d4, 0.6);
        for (let i = 1; i < 10; i++) {
          const time = i * 0.055;
          this.meter.fillCircle(
            this.ball.x + Math.cos(angle) * v * time,
            this.ball.y - Math.sin(angle) * v * time + 300 * time * time,
            1.2,
          );
        }
      }
      this.label.setText(
        `AIM ${Math.round(this.aim)}°  ·  POWER ${Math.round(this.charge * 100)}%`,
      );
      s.status.charge = this.charge;
      s.status.targetPower = this.targetPower;
    } else {
      this.swing = Math.max(0, this.swing - dt);
      if (input.action && !this.previousAction && this.phase === "incoming") {
        this.swing = 0.16;
        s.tone(380, 0.05);
      }
      this.bat.clear();
      this.bat.lineStyle(6, 0xeec98d);
      const swinging = this.swing > 0;
      this.bat.lineBetween(
        158,
        276,
        swinging ? 210 : 174,
        swinging ? 266 : 315,
      );
      this.bat.lineStyle(3, 0x644c35);
      this.bat.lineBetween(153, 270, 158, 276);
      this.meter.clear();
      this.meter.fillStyle(0xd8ed83, 0.35);
      this.meter.fillRect(171, 250, 28, 58);
      this.label.setText(
        `RUNS ${s.status.score}/${s.spec.goal}  ·  WICKETS LEFT ${s.status.health}`,
      );
      if (this.phase === "incoming" && this.ball.x < 115) {
        s.status.health--;
        s.status.detail = "Bowled! Watch the ball and time the next swing.";
        s.spark(128, 287, 0xf3934e);
        s.tone(140, 0.15);
        this.phase = "settling";
        this.settle = 0.75;
        if (s.status.health <= 0) s.finish("lost");
        s.emit();
      }
      if (
        this.phase === "hit" &&
        (this.flightTime > 1.1 || this.ball.x > 650)
      ) {
        this.phase = "settling";
        this.settle = 0.4;
      }
      if (this.phase === "settling") {
        this.settle -= dt;
        if (this.settle <= 0) this.bowl();
      }
    }
    this.previousAction = input.action;
    s.status.progress = Math.min(1, s.status.score / s.spec.goal);
    if (Math.floor(s.elapsed * 10) !== Math.floor((s.elapsed - dt) * 10))
      s.emit();
  }
}
