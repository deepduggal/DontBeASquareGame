/**
 * Don't Be a Square
 * @description A JS game made with Phaser.js
 * @author Deep Duggal
 */

// import Phaser from 'phaser-ce/build/phaser';

/**
 * For debugging
 */
let debug = {

    on: true,

    /**
     * Output a log to the console w/ optional styles
     * @param str - The value to log
     * @param css - A string of CSS styles
     */
    log (str, css = '') {
        if (this.on) {
            console.log('%c'+str, css);
        }
    },

    logMany (css = '', ...logs) {
        for (let i = 0, len = logs.length; i < len; i++) {
            console.log('%c' + logs[i], css);
        }
    },

    /**
     * Output a group of logs to the console
     * @param groupName - The name of the group
     * @param css - CSS styles to apply to the logs
     * @param logs - The strings to log
     */
    group (groupName = 'Log Group') {

        if (this.on) {
            console.group(groupName);
        }
    },

    groupCollapsed (groupName = 'Log Group') {

        if (this.on) {
            console.groupCollapsed(groupName);
        }
    },

    /**
     * End the current logging group
     */
    groupEnd () {
        if (this.on) {
            console.groupEnd();
        }
    }
};


/**
 * Get a random int in some range
 * @param min - The smallest value in the range (inclusive)
 * @param max - The largest value in the range (exclusive)
 * @returns {number} It's an integer.
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/**
 * forEach that handles groups within groups
 */
Phaser.Group.prototype.forEachRecursive = function (callback, callbackContext=this) {

    this.forEach((child) => {

        // Handle Groups
        if (child instanceof Phaser.Group) {
            child.forEachRecursive(callback);
        }

        // Handle Sprites and all other DisplayObjects
        else {
            callback.call(callbackContext, child);
        }

    });

};

/**
 * Move a displayObject to a Phaser.Point
 */
Phaser.Physics.Arcade.prototype.moveToPoint = function(displayObject, point, speed, maxTime) {
    this.moveToXY(displayObject, point.x, point.y, speed, maxTime);
};


/**
 * The enemy sprites
 */
class Enemy extends Phaser.Sprite {

    constructor (game, x, y, key, frame) {
        super(game, x, y, key, frame);

        // Physics
        game.physics.arcade.enable(this);
        this.body.collideWorldBounds = true;
        this.speed = Math.max(game.height, game.width) / 4;
        this.body.bounce.y = 0.2;
        this.x = game.world.randomX;
        this.y = game.world.randomY;
        this.anchor.setTo(0.5, 0.5);

        // Bullets
        this.weapon = game.add.weapon(1, 'bullet');
        this.weapon.bulletKillType = Phaser.Weapon.KILL_LIFESPAN;
        this.weapon.bulletSpeed = this.speed * 1.25;
        this.weapon.firerate = 5000;
        this.weapon.bulletLifespan = 5000;
        this.weapon.bulletRotateToVelocity = true;
        // this.weapon.bulletAngleVariance = 10;
        this.weapon.trackSprite(this, 14, 0);
        this.isShooting = false;
        this.pauseBeforeShootRate = 1000; // The amount of time to stop moving before shooting a bullet
        this.nextShootTime = getRandomInt(game.time.now + 300, game.time.now + 3000);
        this.shootTimer = game.time.create(true);

        // Events
        this.events.onKilled.add(this.onKilled, this);

        //  Bind functions' 'this' keyword to instance of this class
        this.shoot = this.shoot.bind(this);
        this.canShoot = this.canShoot.bind(this);
        this.moveTo = this.moveTo.bind(this);
        this.onKilled = this.onKilled.bind(this);
    }

    /**
     * Shoot at a sprite
     * @param sprite - The sprite to shoot at
     */
    shoot (sprite) {

        if (this.canShoot()) {

            // Create timer if one doesn't exist
            if (this.shootTimer == null || this.shootTimer.expired) {
                this.shootTimer = game.time.create(true);
            }

            this.isShooting = true;

            // Add timer event to shoot after a short pause
            this.shootTimer.add(this.pauseBeforeShootRate, (sprite) => {

                // Shoot
                if (this.alive) {
                    this.weapon.fireAtSprite(sprite);
                }

                // Update values
                this.nextShootTime = game.time.now + this.weapon.firerate;
                this.isShooting = false;

            }, this, sprite);

            this.shootTimer.start();
        }

    }

    /**
     * Should the enemy be allowed to shoot?
     */
    canShoot() {
        return (
            this.alive
            && !this.isShooting
            && game.time.now > this.nextShootTime
        );
    }

    /**
     * Move towards a sprite. Intended to make enemy sprites follow the player.
     * @param sprite - The sprite to move startSprite to.
     * @param speed - The speed it will move, in pixels per second (default is 60 pixels/sec)
     * @param maxTime - Time given in milliseconds (1000 = 1 sec). If set the speed is adjusted so the object will arrive at destination in the given number of ms.
     */
    moveTo (sprite, speed = this.speed, maxTime) {

        if (Phaser.Rectangle.containsPoint(this.getBounds(), sprite.getBounds())) {
            // When enemy is on player
        }
        else if (this.canMove()) {
            game.physics.arcade.moveToObject(this, sprite, speed, maxTime);
        }
        else {
            this.body.velocity.set(0, 0);
        }

    }

    /**
     * Should this enemy be allowed to move
     */
    canMove() {
        return (
            this.alive
            && !this.isShooting
        );
    }

    /**
     * Perform clean up when this sprite is killed
     */
    onKilled () {
        this.shootTimer.destroy();
    }
}

/**
 * The player sprite
 */
class Player extends Phaser.Sprite {

    constructor (game, x, y, key, frame) {
        super(game, x, y, key, frame);
        this.game = game;
        this.health = 4;

        // Dash Values
        this.isDashing = false;
        this.nextDashPos = new Phaser.Point();
        this.nextDashTime = game.time.now;
        this.allowDashStart = true;
        this.maxDash = Math.min(game.width, game.height) / 5;
        this.dashRate = 500;

        // Physics
        game.physics.arcade.enable(this);
        this.speed = Math.max(game.height, game.width) / 4;
        this.body.collideWorldBounds = true;
        this.anchor.setTo(0.5, 0.5);
        this.frame = 4;

        // Bind class functions 'this' keyword to this class
        this.dash = this.dash.bind(this);
        this.canStartDash = this.canStartDash.bind(this);
        this.startDash = this.startDash.bind(this);
        this.followPointer = this.followPointer.bind(this);
        this.move = this.move.bind(this);
    }

    /**
     * Do the dash movement for the player
     */
    dash () {
        game.physics.arcade.moveToPoint(this, this.nextDashPos, this.speed * 6);
    }

    /**
     * Should the player be allowed to start dashing?
     */
    canStartDash (pointer = game.input.activePointer) {

        return (
            pointer.leftButton.justPressed()
            && pointer.leftButton.isDown
            && game.time.now > this.nextDashTime
            && !this.isDashing
            && this.allowDashStart
        );

    }

    /**
     * Setup things before dashing
     * @param pointer - The active game pointer object
     */
    startDash (pointer = game.input.activePointer) {

        let playerX = this.body.position.x,
            playerY = this.body.position.y,

            // Difference btwn. player and pointer positions
            difX = pointer.position.x - playerX,
            difY = pointer.position.y - playerY,

            // The amount to move when dashing
            dashAmtX = Math.min(this.maxDash, Math.abs(difX)),
            dashAmtY = Math.min(this.maxDash, Math.abs(difY)),

            // The point to dash to
            dashX = (difX < 0)? playerX - dashAmtX: playerX + dashAmtX,
            dashY = (difY < 0)? playerY - dashAmtY: playerY + dashAmtY;


        this.nextDashPos = new Phaser.Point(dashX, dashY);
        this.isDashing = true;
        this.allowDashStart = false;
        this.nextDashTime = game.time.now + this.dashRate;
    }

    /**
     * Follow the active game pointer
     */
    followPointer () {
        game.physics.arcade.moveToPointer(this, this.speed);
    }

    /**
     * Handle mouse movement/clicks to move the player
     * @param player - The player
     * @param pointer - The active mouse pointer
     */
    move (pointer = game.input.activePointer) {

        if (!pointer.position.isZero()) {

            if (this.canStartDash(pointer)) {
                this.startDash(pointer);
            }

            // Dash
            if (this.isDashing) {

                if (Phaser.Rectangle.containsPoint(this.getBounds(), this.nextDashPos)) {
                    // Stop dashing
                    this.isDashing = false;
                }

                else {
                    // Keep Dashing
                    this.dash();
                }
            }

            // Follow the pointer (if player is not already there)
            else if (!Phaser.Circle.intersectsRectangle(pointer.circle, this.getBounds())) {
                this.followPointer();
            }

            // Stop
            else {
                this.body.velocity.set(0, 0);
            }
        }

    }
}


/**
 * A class with useful utilities for Menus
 */
class Menu extends Phaser.State {
    constructor (game) {
        super();
        this.game = game;
    }

    preload (game) {
    }

    static createButton (game, text, x, y, height, width, callback) {

        let button, buttonText;

        button = game.add.button(x, y, 'menuButton', callback);
        button.height = height;
        button.width = width;
        button.anchor.setTo(0.5, 0.5);

        buttonText = game.add.text(button.x, button.y, text, {
            font: '2rem Arial',
            fill: '#000',
            align: 'center'
        });
        buttonText.anchor.setTo(0.5, 0.5);
    }

    static createHeader (game, text, x, y) {

        let buttonText;

        buttonText = game.add.text(x, y, text, {
            font: '3.5rem Arial',
            fill: '#fff',
            align: 'center'
        });
        buttonText.anchor.setTo(0.5, 0.5);
    }
}

/**
 * The Main Menu
 */
class MainMenu extends Menu {

    constructor (game) {
        super();
        this.game = game;
    }

    preload (game) {

        // Menu
        game.load.image('menuButton', 'assets/button.png');
        game.load.image('cityBackground', 'assets/City Background.png');
        game.load.image('cityForeground', 'assets/City Foreground.png');
        game.load.image('sky', 'assets/Sky.png');


        // Audio
        game.load.audio('mainMenuMusic', 'assets/mainMenuMusic.mp3');
        game.load.audio('gameMusic', 'assets/gameMusic.mp3');
        game.load.audio('gameOverMusic', 'assets/gameOverMusic.mp3');
        game.load.audio('justDoIt', 'assets/justDoIt.mp3');
        game.load.audio('buttonClick', 'assets/buttonClick.wav');
        game.load.audio('levelComplete', 'assets/levelComplete.wav');

        game.sound.add('mainMenuMusic', 1, true);
        game.sound.add('gameMusic', 1, true);
        game.sound.add('gameOverMusic', 1, true);
        game.sound.add('justDoIt', 1, true);
        game.sound.add('buttonClick', 1);
        game.sound.add('levelComplete', 1);
    }

    create (game) {

        let sky, cityBackground, cityForeground;

        sky = game.add.image(0, 0, 'sky');
        cityBackground = game.add.image(0, 0, 'cityBackground');
        cityForeground = game.add.image(0, 0, 'cityForeground');

        sky.scale.set(3, 3);

        game.sound.stopAll();
        game.sound.play('mainMenuMusic');

        Menu.createButton(game, 'PLAY', game.world.centerX, game.world.height / 3.5, game.world.height / 6, game.world.width / 2, () => {
            game.sound.play('buttonClick');
            Game.start(game);
        });
        Menu.createHeader(game, "Don't Be A Square", game.world.centerX, game.world.height / 8)
    }
}

/**
 * Game Over Menu
 */
class GameOverMenu extends Menu {

    constructor (game) {
        super();
        this.game = game;
    }

    create (game) {

        let sky, cityBackground, cityForeground;

        // Background
        sky = game.add.image(0, 0, 'sky');
        cityBackground = game.add.image(0, 0, 'cityBackground');
        cityForeground = game.add.image(0, 0, 'cityForeground');

        sky.scale.set(3, 3);

        // Sounds
        game.sound.stopAll();
        game.sound.play('gameOverMusic');
        game.sound.play('justDoIt');

        Menu.createButton(game, 'Play Again?', game.world.centerX, game.world.height / 3.5, game.world.height / 6, game.world.width / 2, () => {
            game.sound.play('buttonClick');
            Game.start(game);
        });
        Menu.createHeader(game, "Game Over!", game.world.centerX, game.world.height / 8)
    }
}


/**
 * The game state
 */
class Game extends Phaser.State {

    constructor (game) {
        super();
        this.game = game;
        this.score = 0;
        this.numEnemiesAlive = 0;
        this.numEnemiesKilled = 0;

        // Enemy Spawn
        this.minSpawnRate = 3000;
        this.maxSpawnRate = 7000;
        this.nextSpawnTime = null;

        // Sprite speeds
        this.maxSpeed = Math.max(game.height, game.width) / 4;
        this.minSpeed = Math.max(game.height, game.width) / 8;

        // Do I need to bind preload, create, and update functions?
        this.addEnemies = this.addEnemies.bind(this);
        this.addSquareEnemies = this.addSquareEnemies.bind(this);
        this.onPlayerEnemyOverlap = this.onPlayerEnemyOverlap.bind(this);
    }

    /**
     * Load game assets
     */
    preload (game) {

        // Sprites
        game.load.spritesheet('player', 'assets/dude.png', 32, 48);

        game.load.spritesheet('square', 'assets/baddie.png', 32, 32);
        // game.load.spritesheet('pentagon', 'assets/diamond.png', 32, 28);
        // game.load.spritesheet('hexagon', 'assets/star.png', 24, 22);

        // Power Ups
        game.load.spritesheet('star', 'assets/star.png', 24, 22);
        // game.load.spritesheet('timeFreeze', 'assets/timeFreeze.png', 32, 32);

        // Bullets
        game.load.image('bullet', 'assets/fireball.png');
    }

    /**
     * Setup the game
     */
    create (game) {

        let sky, cityBackground, cityForeground;

        /******************
         * GAME SETTINGS
         *****************/

        // Enable the Arcade Physics system
        game.physics.startSystem(Phaser.Physics.ARCADE);

        // Game background
        sky = game.add.image(0, 0, 'sky');
        cityBackground = game.add.image(0, 0, 'cityBackground');
        cityForeground = game.add.image(0, 0, 'cityForeground');

        sky.scale.set(3, 3);


        /******************
         * PLAYER
         *****************/

        // Create player
        this.player = new Player(game, game.world.centerX, game.world.centerY, 'player');
        game.add.existing(this.player);

        // Game Over when player is killed
        this.player.events.onKilled.add(Game.gameOver);


        /******************
         * Enemies
         *****************/

        // 3 Types of Enemies: Squares, Pentagons, and Hexagons
        this.squares = game.add.group('', 'squares', false, true, Phaser.Physics.ARCADE);
        this.squares.classType = Enemy;

        // A group of all enemies
        this.enemies = game.add.group('', 'enemies', true, true, Phaser.Physics.ARCADE);
        this.enemies.add(this.squares);

        // Create initial enemies
        this.addEnemies(this.numEnemiesAlive);


        /******************
         * Text Objects
         *****************/
        this.healthTextContainer = game.add.text(16, 32, 'Health: ' + this.player.health, { fontSize: '16px', fill: '#fff' });
        this.scoreTextContainer = game.add.text(16, 16, 'Score: ' + this.score, { fontSize: '16px', fill: '#fff' });

    }

    /**
     * The Game Loop
     */
    update (game) {

        if (this.player.alive) {

            /******************
             * PLAYER
             *****************/

            // Allow player to start dashing if mouse up occurred
            if (game.input.activePointer.leftButton.isUp) {
                this.player.allowDashStart = true;
            }

            // Move
            this.player.move();


            /******************
             * Enemies
             *****************/

            // For Each Enemy
            this.enemies.forEachRecursive((enemy) => {

                // Move
                enemy.moveTo(this.player);

                // Shoot
                enemy.shoot(this.player);

                // Handle player and enemy overlap
                game.physics.arcade.overlap(this.player, enemy, this.onPlayerEnemyOverlap);

                // Handle player and enemy bullet overlap
                enemy.weapon.bullets.forEach((bullet) => {
                    game.physics.arcade.overlap(this.player, bullet, Game.onPlayerBulletOverlap);
                }, this);

            }, this);

            // Spawn btwn. 1 - 3 enemies, every so often
            this.spawnEnemies(getRandomInt(1, 3));

            // Spawn enemies if there are none
            if (this.numEnemiesAlive === 0) {
                this.addEnemies(getRandomInt(1, 3));
            }


            /******************
             * Text Objects
             *****************/

            // Update score
            this.score = Math.floor(game.time.totalElapsedSeconds()) + this.numEnemiesKilled * 100;
            this.scoreTextContainer.text = 'Score: ' + this.score;

            // Update Health
            this.healthTextContainer.text = 'Health: ' + this.player.health;
        }
    }

    /**
     * Handle collision between an enemy and the player
     */
    onPlayerEnemyOverlap (player, enemy) {

        // Kill dashed enemies
        if (player.isDashing) {

            // Kill the enemy
            enemy.kill();

            // Increase player and new enemy speeds
            this.minSpeed++;
            this.maxSpeed++;
            Enemy.prototype.speed++;

            // Increase enemy spawn rates
            this.minSpawnRate++;
            this.maxSpawnRate++;

            // Update values
            this.numEnemiesKilled++;
            this.numEnemiesAlive--;
        }
    }

    /**
     * Handle collision between a bullet and the player
     */
    static onPlayerBulletOverlap (player, bullet) {

        /**
         * If player is dashing
         *
         */
        if (!player.isDashing) {
            player.damage(1);
        }

        bullet.kill();
    }

    /**
     * Spawn Enemies every so often
     * @param numEnemies - The number of enemies to spawn
     */
    spawnEnemies(numEnemies = 1) {

        let now = game.time.now;

        if (now > this.nextSpawnTime) {
            this.nextSpawnTime = now + getRandomInt(this.minSpawnRate, this.maxSpawnRate);
            this.addEnemies(numEnemies);
        }
    }

    /**
     * Add enemies to the game. Will randomly select the type of enemy (square, pentagon, hexagon).
     */
    addEnemies(numEnemies = 1) {

        switch (getRandomInt(1, 1)) {
            case 1:
                this.addSquareEnemies(numEnemies);
                break;
            // TODO: Add different types of enemies
            default:
                this.addSquareEnemies(numEnemies);
                break;
        }

    }

    /**
     * Add square enemies to the game
     */
    addSquareEnemies(numEnemies) {
        this.squares.createMultiple(numEnemies, 'square', 0, true);
        this.numEnemiesAlive += numEnemies;
    }

    /**
     * Setup the game. Add levels/menus/states to the state manager.
     */
    static init (game) {

        // Create Menus
        game.state.add('mainMenu', new MainMenu(game));
        game.state.add('gameOverMenu', new GameOverMenu(game));

        // Create game levels
        game.state.add('game', new Game(game, 1));
    }

    /**
     * Open the main menu
     */
    static toMainMenu(game) {
        game.state.start('mainMenu');
    }

    /**
     * Start or restart the game
     */
    static start(game) {

        // Start game
        game.state.start('game');

        // Music
        game.sound.stopAll();
        game.sound.play('gameMusic');
    }

    /**
     * End the game and open the game over menu
     */
    static gameOver () {

        game.state.start('gameOverMenu');
    }

    /**
     * Perform clean up when switching to another state
     * @param game - A phaser game object
     */
    shutdown (game) {
        game.time.reset();
        game.stage.removeChildren(1);
        game.sound.stopAll();
        this.numEnemiesAlive = 0;
        this.numEnemiesKilled = 0;
        this.score = 0;
    }
}


// Phaser game object
let game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO);

Game.init(game);
Game.toMainMenu(game);
