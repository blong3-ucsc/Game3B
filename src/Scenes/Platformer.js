class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50; // Used for water bubbles
        this.SCALE = 2.0;
        this.TILE_SIZE = 16; // Define tile size for easy use
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", this.TILE_SIZE, this.TILE_SIZE, 45, 25);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("monochrome_tilemap", "tilemap_tiles");

        // Create a layer
        this.backgroundLayer = this.map.createLayer("Background", this.tileset, 0, 0);
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        this.groundLayer.setCollisionByExclusion([-1]);

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 2,
        });
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);

        this.diamonds = this.map.createFromObjects("Objects", {
            name: "diamond",
            key: "tilemap_sheet",
            frame: 82,
        });
        this.physics.world.enable(this.diamonds, Phaser.Physics.Arcade.STATIC_BODY);
        this.diamondGroup = this.add.group(this.diamonds);

        // Find water tiles
        this.waterTiles = [];
        this.groundLayer.filterTiles(tile => {
            if (tile.properties.water) {
                this.waterTiles.push(tile);
            }
            return false; 
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(10, 10, "platformer_characters", "tile_0000.png");
        my.sprite.player.setDepth(1);
        my.sprite.player.setDragX(this.DRAG);
        my.sprite.player.setCollideWorldBounds(true);

        // enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // coin particles
        this.coinCollectParticles = this.add.particles(0, 0, 'kenny-particles', {
            frame: 'star_01.png', 
            lifespan: 600,
            speed: { min: 100, max: 200 }, // Slightly reduced speed/spread
            angle: { min: 220, max: 320 },
            gravityY: 250,
            scale: { start: 0.07, end: 0, ease: 'Expo.easeIn' },
            emitting: false,
        });
        this.coinCollectParticles.setDepth(2);

        // coin text
        this.coinsCollected = 0;
        this.coinText = this.add.text(1600/4, 900/4, String(this.coinsCollected), { fontFamily: '"Lucida Console", "Courier New", monospace' });
        this.coinText.setScrollFactor(0);

        // coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); 
            if (this.coinCollectParticles) {
                this.coinCollectParticles.setPosition(obj2.x, obj2.y);
                this.coinCollectParticles.explode(10); // Reduced quantity slightly
            }
            this.coinsCollected += 1;
            this.coinText.text = String(this.coinsCollected);
        });

        // diamond particles
        this.diamondCollectParticles = this.add.particles(0, 0, 'kenny-particles', {
            frame: 'star_08.png', 
            lifespan: 600,
            speed: { min: 100, max: 200 }, // Slightly reduced speed/spread
            angle: { min: 220, max: 320 },
            gravityY: 250,
            scale: { start: 0.07, end: 0, ease: 'Expo.easeIn' },
            emitting: false,
        });
        this.diamondCollectParticles.setDepth(2);

        // diamond collision handler
        this.physics.add.overlap(my.sprite.player, this.diamondGroup, (obj1, obj2) => {
            obj2.destroy(); 
            if (this.diamondCollectParticles) {
                this.diamondCollectParticles.setPosition(obj2.x, obj2.y);
                this.diamondCollectParticles.explode(10); // Reduced quantity slightly
            }
            obj1.visible = false;
            this.winText.visible = true;
        });

        // set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            left: Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            r: Phaser.Input.Keyboard.KeyCodes.R,
            f: Phaser.Input.Keyboard.KeyCodes.F,
        });

        // camera code
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); 
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        // movement vfx
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ["smoke_03.png", "smoke_09.png"],
            scale: {start: 0.04, end: 0.02},
            lifespan: 200,
            alpha: {start: 1, end: 0.1},
        });
        my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-10, false);
        my.vfx.walking.stop();

        my.vfx.jumping = this.add.particles(0, 0, "kenny-particles", {
            frame: ["smoke_03.png", "smoke_09.png"],
            scale: {start: 0.02, end: 0.005},
            lifespan: 150,
            alpha: {start: 1, end: 0.1},
        });
        my.vfx.jumping.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-10, false);
        my.vfx.jumping.stop();

        // win text
        this.winText = this.add.text(1600/4 + 800/2, 900/4 + 450/2, "you win!", { fontFamily: '"Lucida Console", "Courier New", monospace' });
        this.winText.setScrollFactor(0);
        this.winText.setOrigin(0.5, 0,5);
        this.winText.visible = false;
        this.toggleDebug();
    }

    update() {
        let inputDirection = 0;
        if (this.keys.left.isDown || this.keys.a.isDown) {
            inputDirection -= 1;
        }
        if (this.keys.right.isDown || this.keys.d.isDown) {
            inputDirection += 1;
        }
        let inputJump = Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w);
        let inputReset = Phaser.Input.Keyboard.JustDown(this.keys.r);
        let inputDebug = Phaser.Input.Keyboard.JustDown(this.keys.f);

        my.sprite.player.setAccelerationX(this.ACCELERATION*inputDirection);
        if (inputDirection === 0) {
            my.sprite.player.anims.play('idle');
        } else {
            if (inputDirection < 0) {
                my.sprite.player.resetFlip();
            } else {
                my.sprite.player.setFlip(true, false);
            }
            my.sprite.player.anims.play('walk', true);
        }

        if (my.sprite.player.body.blocked.down && inputDirection) {
            my.vfx.walking.start();
        } else {
            my.vfx.walking.stop();
        }

        if (my.sprite.player.body.velocity.y < -500) {
            my.vfx.jumping.start();
        } else if (my.sprite.player.body.velocity.y >  -100) {
            my.vfx.jumping.stop();
        }

        if (!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if (my.sprite.player.body.blocked.down && inputJump) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if (inputDebug) {
            this.toggleDebug();
        }

        if (inputReset) {
            this.scene.restart();
        }

        if (my.sprite.player.visible === false) {
            my.sprite.player.setVelocityX(0);
            my.sprite.player.setVelocityY(0);
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setAccelerationY(0);
            my.vfx.walking.stop();
            my.vfx.jumping.stop();
        }
    }

    toggleDebug() {
        this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
        this.physics.world.debugGraphic.clear()
    }
}
