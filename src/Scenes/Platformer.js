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
        this.TILE_SIZE = 18; // Define tile size for easy use
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", this.TILE_SIZE, this.TILE_SIZE, 45, 25);

        // Add a tileset to the map
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);

        // Find water tiles
        this.waterTiles = [];
        this.groundLayer.filterTiles(tile => {
            if (tile.properties.water == true) {
                this.waterTiles.push(tile);
            }
            return false; 
        });

        ////////////////////
        // TODO: put water bubble particle effect here
        // It's OK to have it start running
        ////////////////////
        if (this.waterTiles.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            this.waterTiles.forEach(tile => {
                minX = Math.min(minX, tile.pixelX);
                minY = Math.min(minY, tile.pixelY);
                maxX = Math.max(maxX, tile.pixelX);
                maxY = Math.max(maxY, tile.pixelY);
            });

            const waterZoneWidth = (maxX - minX) + this.TILE_SIZE;
            const waterZoneHeight = (maxY - minY) + this.TILE_SIZE;

            // Create a single emitter for all water bubbles
            this.waterBubbleEmitter = this.add.particles(0, 0, 'kenny-particles', { // Assuming 'kenny-particles' is the key
                frame: 'circle_01.png',
                // Emit from a random point within the calculated zone
                emitZone: { 
                    source: new Phaser.Geom.Rectangle(minX, minY, waterZoneWidth, waterZoneHeight), 
                    type: 'random', 
                    quantity: 1 // Emit 1 particle from a random spot in the zone at each frequency interval
                },
                speedY: { min: -this.PARTICLE_VELOCITY, max: -this.PARTICLE_VELOCITY - 30 },
                speedX: { min: -10, max: 10 },
                scale: { start: 0.15, end: 0.01, ease: 'Expo.easeIn' },
                alpha: { start: 0.7, end: 0, ease: 'Expo.easeIn' },
                lifespan: { min: 1000, max: 2000 },
                quantity: 1, // Number of particles emitted per emission event
                frequency: 150, // Emit particles more often from the single source, adjust as needed
                blendMode: 'ADD'
            });
            this.waterBubbleEmitter.setDepth(0); // Ensure bubbles are behind player, etc.
        }


        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // TODO: create coin collect particle effect here
        // Important: make sure it's not running
        this.coinCollectParticles = this.add.particles(0, 0, 'kenny-particles', {
            frame: 'star_03.png', 
            lifespan: 600,
            speed: { min: 100, max: 200 }, // Slightly reduced speed/spread
            angle: { min: 220, max: 320 },
            gravityY: 250,
            scale: { start: 0.07, end: 0, ease: 'Expo.easeIn' },
            emitting: false 
        });
        this.coinCollectParticles.setDepth(5);


        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); 
            ////////////////////
            // TODO: start the coin collect particle effect here
            ////////////////////
            if (this.coinCollectParticles) {
                this.coinCollectParticles.setPosition(obj2.x, obj2.y);
                this.coinCollectParticles.explode(10); // Reduced quantity slightly
            }
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');

        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // TODO: Add movement vfx here
        
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); 
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here

        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
        }

        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }
}