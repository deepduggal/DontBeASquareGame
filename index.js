/**
 * Some JS Game
 * 
 */

// Phaser Game object
var game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, '', {
  preload: preload,
  create: create,
  update: update
});

// The player
var player;

// Enemy groups
let enemies, squares, pentagons, hexagons;

// Score
var score = 0, scoreText;

/********************************************
 * Game States
 ********************************************/

class Menu extends Phaser.State {

  constructor() {
    super();
  }

}

class Level extends Phaser.State {

  constructor() {
    super();
  }

} 

/**
 * Load game assets
 */
function preload() {

  game.load.image('sky', 'assets/sky.png');

  game.load.spritesheet('player', 'assets/dude.png', 32, 48);

  game.load.spritesheet('square', 'assets/baddie.png', 32, 32);
  game.load.spritesheet('pentagon', 'assets/diamond.png', 32, 28);
  game.load.spritesheet('hexagon', 'assets/star.png', 24, 22);
}

/**
 * Setup the game 
 */
function create() {

  // Enable the Arcade Physics system
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // Game background
  let sky = game.add.image(0, 0, 'sky');
  sky.scale.set(2, 2);

  // Game Size
  game.world.setBounds(0, 0, window.innerWidth - 48, window.innerHeight - 32);


  /******************
   * PLAYER
   *****************/

  // The player and its settings
  player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');

  // Enable physics on the player
  game.physics.arcade.enable(player);

  // Player physics properties. Give the little guy a slight bounce.
  player.body.bounce.y = 0.2;
  player.body.collideWorldBounds = true;

  // Make the player face forward
  player.frame = 4;


  /******************
   * Enemies
   *****************/

  // The 3 Types of Enemies
  squares = game.add.group('', 'squares', false, true, Phaser.Physics.ARCADE);
  pentagons = game.add.group('', 'pentagons', false, true, Phaser.Physics.ARCADE);
  hexagons = game.add.group('', 'hexagons', false, true, Phaser.Physics.ARCADE);

  // One group for all the enemies
  enemies = game.add.group('', 'enemies', true, true, Phaser.Physics.ARCADE);

  enemies.add(squares);
  enemies.add(pentagons);
  enemies.add(hexagons);

  // Add some square enemies at random places
  squares.createMultiple(5, 'square', 0, true, (child) => {
    
    // Square enemy settings
    child.x = game.world.randomX;
    child.y = game.world.randomY;
  });

  // Add some pentagon enemies at random places
  pentagons.createMultiple(5, 'pentagon', 0, true, (child) => {
    
    // Pentagon enemy settings
    child.x = game.world.randomX;
    child.y = game.world.randomY;
  });

  // Add some hexagon enemies at random places
  hexagons.createMultiple(5, 'hexagon', 0, true, (child) => {
    
    // Hexagon enemy settings
    child.x = game.world.randomX;
    child.y = game.world.randomY;
  });

  // Physics settings for all enemies
  enemies.setAllChildren('body.collideWorldBounds', true, true, true, 0);
  enemies.setAllChildren('body.gravity.y', 300, true, true, 0);
  enemies.setAllChildren('body.bounce.y', 0.2, true, true, 0);  

  // Our two animations, walking left and right.
  // enemy.animations.add('left', [0, 1], 5, true);
  // enemy.animations.add('right', [2, 3], 5, true);


  /******************
   * SCORE
   *****************/

  scoreText = game.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });
}

/**
 * THE GAME LOOP
 */
function update() {

  // Handle overlap between players and enemies
  game.physics.arcade.overlap(player, squares, playerHitEnemy);
  game.physics.arcade.overlap(player, pentagons, playerHitEnemy);
  game.physics.arcade.overlap(player, hexagons, playerHitEnemy);

  // Move player
  movePlayer(player, game.input.mouse.event);

  // Move square enemies
  moveSprites(squares, 20, 20);
}

/**
 * (Optional) Render the game
 */
function render() {
  game.debug.text('', 32, 32);
}


/********************************************
 * Game Methods
 ********************************************/

/**
 * Handle key presses to move the player
 * @param player - The player
 * @param event - The native mouse event
 */
function movePlayer(player) {

  // Follow the mouse
  if (!game.input.activePointer.position.isZero()) {
    player.body.position.set(game.input.activePointer.x, game.input.activePointer.y);
  }
}

/**
 * Move a sprite
 * @param sprite - The sprite
 * @param xVelocity - The sprite's horizontal movement speed. Defaults to 0.
 * @param yVelocity - The sprite's vertical movement speed. Defaults to 0. 
 */
function moveSprite(sprite, xVelocity, yVelocity) {
  sprite.body.velocity.x = xVelocity || 0;
  sprite.body.velocity.y = yVelocity || 0;
}

/**
 * Move all children in a group
 * @param group - The group
 * @param xVelocity - Each child's horizontal movement speed. Defaults to 0.
 * @param yVelocity - Each child's vertical movement speed. Defaults to 0. 
 */
function moveSprites(group, xVelocity, yVelocity) {
  group.forEach(moveSprite, this, true, xVelocity, yVelocity);
}

/**
 * Handle Collision between an enemy and the player
 */
function playerHitEnemy (player, enemy) {

  // Kill the enemy
  enemy.kill();

  // TODO: Remove this
  // Add and update the score
  score += 10;
  scoreText.text = 'Score: ' + score;
  
  // Update the score
  // scoreText.text = 'Game Over!';
}

/**
 * Handle when a player collects a star
 */
function collectStar (player, star) {

  // Remove the star from the screen
  star.kill();

  // Add and update the score
  score += 10;
  scoreText.text = 'Score: ' + score;
}