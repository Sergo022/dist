let canvas = document.createElement('canvas');
let context = canvas.getContext('2d');
canvas.id = 'viewport';
canvas.width = window.innerWidth*.5;
canvas.height = window.innerHeight*.5;
context.imageSmoothingEnabled = false;
document.getElementsByTagName('body')[0].appendChild(canvas);

/** https://www.piskelapp.com/ */

// бонус
let powerUpSprite = 'up.png';

//пуля
let bulletSprite = 'bull.png';

// ворожий корабель
let popCornSprite = 'enemy.png';

// корабель
let shipSprite = 'sprite.png';

// вибух
let explosionSprite = 'exspl1.png';

  UP = 38;
  DOWN = 40;
  LEFT = 37;
  RIGHT = 39;
  SHOOT = 32;
  START = 13;

//==================================перевірка чи перетинаються обєкти в грі===============================

class Intersection {
  static rectanglesIntersect(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.height + rect1.y > rect2.y
    );
  }
}

//==========================================================================================
class Star {
  static SPEED = 5;
  static MAX_SIZE = 2;

  constructor(x, y) {
    const r = Math.max(50, Math.floor(Math.random() * 256));
    const g = Math.max(125, Math.floor(Math.random() * 256));
    const b = Math.max(240, Math.floor(Math.random() * 256));

    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.size = Math.floor(Math.random() * Star.MAX_SIZE);
    this.letiance = Math.max(Math.random(), 0.2);
    this.color = `rgb(${r}, ${g}, ${b})`;
  }

  update() {
    const travel = Star.SPEED * this.letiance;
    this.width = this.height = this.size;
    this.x -= travel;

    if (this.x + this.width < 0) {
      this.x = canvas.width;
    }
  }

  render(context) {
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}

// //=================================================вибух=============================================
class Explosion { 
  constructor(x, y) {
    this.currentFrame = 0;
    this.currentBuffer = 0;
    this.alive = false;
    this.img = new Image();
    this.img.src = explosionSprite;
  }

  reset() {
    this.currentFrame = 0;
    this.currentBuffer = 0;
    this.alive = false;
  }

  update() {
  if (!this.alive) {  
     return;
  }
  this.x -= Popcorn.SPEED;
  if (this.currentBuffer === 4) {
    this.currentBuffer = 0;
    this.currentFrame++;
    if (this.currentFrame === 6) {
      this.reset();
    }
  }
  this.currentBuffer++;
  }

  render(context) {
    if (!this.alive) {
      return;
    }
    context.drawImage(
      this.img,
      0, this.currentFrame * 32, 32, 32,
      this.x - 16, this.y - 16, 64, 64
    );
  }
}
//===================================початкова частина===================================
class TitleState {

  init() {
    game.showUI('title');
  }

  update() {
    if (inputManager.start) {
      game.setState(game.states.game);
      game.currentState.init();
    }
  }
}
//======================закінчення гри====================================
class GameOverState {

  init() {
    this.timer = 0;
    game.showUI('game_over');
    document.querySelector('#final_score').innerHTML = 'FINAL SCORE: ' + game.score;
  }

  update() {
    if (inputManager.start) {
      game.setState(game.states.game);
      game.currentState.init();
      game.reset();
    }
    this.timer++;
  }

  render(context) {
    // Щоб при завершенні гри пікселі розходились вгору-вниз
    for (let i = 0; i < canvas.width; i++) {
      context.drawImage(canvas, i, 0, 1, canvas.height, i, Math.sin((i * 20 * Math.PI / 180)) * 2, 1, canvas.height);
    }
  }
}
//==================================================================================================

class GameState{
  init() {
    game.showUI('game');
    this.timer = 0;
    // this.tier1 = 1800 //30секунд
    this.tier2 = 2*1800;// другий рівень гри через 60сек
    this.tier3 = 3*1800;
    this.tier4 = 4*1800;

    this.enemyTimerMedium = 60;
    this.enemyTimerHard = 30;
    this.enemyTimerNightmare = 5;

    this.currentEnemyTimer = 120;// за замовчуванням вороги кожні 120 кадрів
    
    this.powerUpTimer = 1200;
    this.starField = [];
    for (let i = 0; i < 1024; i++) {
      this.starField.push(
        new Star(
          Math.random()*canvas.width,
          Math.random()*canvas.height
        )
      );
    }
    //створення гравця
    this.player = new Player(20, Math.floor(canvas.height / 2), 400);
  //басейн снарядів
    for (let i = 0; i < 256; i++) {
      this.player.bulletPool.push(new Bullet(this.player.x + 32, this.player.y + 16, 15));
    }

    this.enemyList = [];
    for (let i = 0; i < 32; i++) {
      this.enemyList.push(new Popcorn(canvas.width, Math.random() * (canvas.height - 32)));
    }
    
    this.explosions = [];
    for (let i = 0; i < 32; i++) {
      this.explosions.push(new Explosion(0, 0));
    }
    
    this.powerUps = [];
    for (let i = 0; i < 32; i++) {
      this.powerUps.push(new PowerUp(0, 0));
    }
    
    this.entities = [this.player];
    this.entities = this.entities.concat(
      this.enemyList,
      this.explosions,
      this.powerUps,
      this.player.bulletPool
    );
  }
  // поява ворогів
  deployEnemies() {
    if (this.timer && (this.timer % this.currentEnemyTimer === 0) ) {
      let enemy = this.enemyList.find(function(enemy) {
        return !enemy.alive;
      });
      enemy.reset();
      enemy.x = canvas.width;
      enemy.alive = true;
      enemy.y = Math.max(4, (canvas.height * Math.random()) - 24);
    }
  }
  //випадання бонусів
  deployPowerUps() {
    if (this.timer && (this.timer % this.powerUpTimer === 0) ) {
      if (Math.random() >= .01) {
        let powerup = this.powerUps.find(function(powerup) {
          return !powerup.alive;
        });
        powerup.x = canvas.width;
        powerup.alive = true;
        powerup.y = (canvas.height * Math.random()) - 16;
      }
    }
  }

  update() {
    
    if (this.timer > this.tier2) {
        this.currentEnemyTimer = this.enemyTimerMedium;
    }
    
    if (this.timer > this.tier3) {
        this.currentEnemyTimer = this.enemyTimerHard;
    }
    
    if (this.timer > this.tier4) {
        this.currentEnemyTimer = this.enemyTimerNightmare;
    }
    
    this.timer++;
    
    this.deployEnemies();
    this.deployPowerUps();
    
    this.entities.forEach(function(entity) {
      entity.update();
    });
    // зіткнення кулі і корабля 
    this.player.bulletPool.forEach(function(bullet) {
      if (!bullet.alive) {
        return;
      }
      
      game.currentState.enemyList.forEach(function(enemy) {
        if (!enemy.alive) {
          return;
        }
        if (Intersection.rectanglesIntersect(bullet, enemy)) {
          enemy.takeDamage(10);
          bullet.alive = false;
          if (!enemy.alive) {
            game.score += enemy.value;
            game.updateScore();
            
            let explosion = game.currentState.explosions.find(bullet => !bullet.alive);
            explosion.x = enemy.x;
            explosion.y = enemy.y;
            explosion.alive = true;
          }
        }
      });
    });
    //зіткнення гравця і ворога
    let player = game.currentState.player;
    if (player.alive) { 
      this.enemyList.forEach(function(enemy) {
        if(!enemy.alive) {
          return;
        }
        if(Intersection.rectanglesIntersect(enemy, player.getHitBox())) {
        game.lives--;

        
          if (game.lives === 0) {
            game.setState(game.states.game_over);
            game.currentState.init();
          }
        }
      });
      
      this.powerUps.forEach(function(powerup) {
        if (!powerup.alive) {
          return;
        }
        if (Intersection.rectanglesIntersect(powerup, player.getHitBox())) {
          player.powerLevel++;
          powerup.reset();
        }
      });
    }
  }
  renderBackground(context) {
    this.starField.forEach(function(star) {
      star.update();
      star.render(context);
    });
  }

  render(context)  {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.renderBackground(context);
    this.entities.forEach(
      function(entity){
        entity.render(context);
      }
    );
  }
}
//====================================це спільне для усіх кораблів================================

class Ship{
  constructor(x, y, width, height, health){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.health = health;
    this.alive = true;
    this.vx = 0;
    this.vy = 0;
  }

  takeDamage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      this.alive = false;
    }
  }
}
//========================================пуля реалізація=====================================================
class Bullet {
  constructor(x, y, speed) {
    this.vx = 0;
    this.vy = 0;
    this.width = 16;
    this.height = 8;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.alive = false;
    this.img = new Image();
    this.img.src = bulletSprite;
  }

  update() {
    this.vx = this.speed;
    this.x += this.vx;

    if (this.x > canvas.width) {
      this.alive = false;
    }
  }

  render(context) {
    if (!this.alive) {
      return;
    }
    context.drawImage(this.img, this.x, this.y, 16, 8);
  }
}

//==========================================бонус реалізація==================================================
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.timer = Math.random() * 256;
    this.jump = canvas.height / 2;
    this.speed = 3;
    this.width = 16;
    this.height = 16;
    this.img = new Image();
    this.img.src = powerUpSprite;
  }
  update() {
    this.vy = Math.cos(this.timer) * this.jump;
    this.timer += 0.03;
    this.y = canvas.height / 2 + this.vy;
    this.x -= this.speed;
    if (this.x + this.width <= 0) {
      this.reset();
    }
  }
  reset() {
    this.alive = false;
  }

  render(context) {
    if (!this.alive) {
      return;
    }
    context.drawImage(this.img, this.x, this.y, this.width, this.height)
  }
}
//===========================================гравець==============================================
class Player extends Ship {
  constructor(x, y, health) {
    super(x, y, 32, 32, health);
    this.speed = 5;
    this.powerLevel = 1;
    this.bulletTimer = 5;
    this.img = new Image();
    this.img.src = shipSprite;
    this.bulletPool = [];
    this.hitBoxSize = [5, 5];
  }

getHitBox() {
    return {
      x: this.x + (this.width * .5) - (this.hitBoxSize[0] * .5),
      y: this.y + (this.height * .5) - (this.hitBoxSize[1] * .5),
      width: this.hitBoxSize[0],
      height: this.hitBoxSize[1],
    }
  }

  update() {
    if (!this.alive) {
      if (inputManager.start) {
        game.currentState.init();
      }
      return;
    }
    this.vx = 0;
    this.vy = 0;
    if (inputManager.upPressed) {
      this.vy -= this.speed;
    }
    
    if (inputManager.downPressed) {
      this.vy += this.speed;
    }
    
    if (inputManager.rightPressed) {
      this.vx += this.speed;
    } 
    
    if (inputManager.leftPressed) {
      this.vx -= this.speed;
    }
    // пуля вилітяє кожні 5 кадрів
    if (inputManager.shooting ) {
      if (this.bulletTimer === 5) {
        this.shoot();
        this.bulletTimer = 0;
      } else {
        this.bulletTimer++;
      }
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    // щоб корабель не виходив за межі екрану
    if (this.x < 0) {
        this.x = 0;
    }
    
    if (this.y < 0) {
      this.y = 0;
    }
    
    if (this.x+this.width > canvas.width) {
      this.x = canvas.width - this.width;
    }
    
    if (this.y+this.height > canvas.height) {
      this.y = canvas.height - this.height;
    }
  }

  //====================================кількість пуль коли зловив бонус=======================================
  shoot() {
  
    if (this.powerLevel === 1) {
      const bullet =  this.getAvailableBullet();
      if (!bullet) {
        return;
      }
      bullet.x = this.x + this.width - 16;
      bullet.y = (this.y + (this.height / 2)) - (8 / 2);
      bullet.alive = true;
    }
    
    if (this.powerLevel >= 2) {
      const bullet = this.getAvailableBullet();
      if (!bullet) {
        return;
      }
      bullet.alive = true;
      
      const bullet2 =  this.getAvailableBullet();
      if (!bullet) {
        return;
      }
      bullet2.alive = true;
      
      bullet.x = this.x + this.width - 16;
      bullet.y = (this.y + (this.height / 2)) - (8 / 2) - 6;
      
      
      bullet2.x = this.x + this.width - bullet2.width;
      bullet2.y = (this.y + (this.height / 2)) - (bullet2.height / 2) + 6;
    }
  }
 
  getAvailableBullet() {
    return this.bulletPool.find((bullet) => !bullet.alive);
  }
  //=================================================================================================================
  render(context) {
    if (!this.alive) return;

    context.drawImage(
      this.img, 0, 0, 32, 32,
      this.x, this.y, this.width, this.height
    )
    
    
    this.bulletPool.forEach(function(bullet) {
      if (!bullet.alive) return false;
      bullet.render(context);
    })
    
  }
}
//============================================ворожі кораблі==================================================

class Popcorn extends Ship {
  constructor(x, y) {
    super(x, y, 42, 42, Popcorn.HEALTH);
    this.img = document.createElement('img');
    this.img.src = popCornSprite;
    this.speed = Popcorn.SPEED;
    this.value = 5;
    this.healthMax = Popcorn.HEALTH;
    this.reset();
  }


  reset() {
    this.x = canvas.width;
    this.y = Math.random() * canvas.height - this.height;
    this.alive = false;
    this.health = Popcorn.HEALTH;
  }

  update() {
    this.vx = -this.speed;
    this.x += this.vx;
    if (this.x + this.width <= 0) {
      this.reset();
    }
  }

  render(context) {
    if (!this.alive) {
      return;
    }

    context.drawImage(
      this.img, 0, 0, 32, 32,
      this.x, this.y, this.width, this.height
    );

    context.fillStyle = '#f00';
    context.fillRect(this.x, this.y - 2, this.width, 1);
    
    context.fillStyle = '#0f0';
    this.perc = this.health / this.healthMax;
    
    context.fillRect(this.x, this.y - 2, this.width * this.perc , 1);
    
  }
}
Popcorn.SPEED = 5;
Popcorn.HEALTH = 80;
//=======================================основна гра============================================================


class Game{
  constructor() {
    this.reset();
    this.states = {};
    this.states['game'] = new GameState('game');
    this.states['title']  = new TitleState('title');
    this.states['game_over'] = new GameOverState('game_over');  
  }

  reset() {
    this.score = 0;
    this.lives = 1;
    this.updateScore();  
  }

  setState(state) {
    this.currentState = state;
  }

  showUI(name)  {
    document.querySelectorAll('.state-ui-container').forEach(function(element) {
      element.style.display = 'none';
    });
    document.querySelector('#'+name).style.display = 'flex';
  }  

  update() {
    this.currentState.update();
  }

  render(context) {
    if (this.currentState && this.currentState.render) {
      this.currentState.render(context);
    }    
  }

  loop() {
    window.requestAnimationFrame(() => this.loop());
    this.update();
    this.render(context);
  }

  init() {
    this.setState(this.states.title);
    this.currentState.init();
    window.requestAnimationFrame(function(){ this.loop() }.bind(this));
  }
  updateScore() {
    document.getElementById('score').innerHTML = 'SCORE: ' + this.score;
  } 
}
const game = new Game();
//=================================================================================================================
class InputManager {
  constructor() {
  this.upPressed = false;
  this.downPressed = false;
  this.leftPressed = false;
  this.rightPressed = false;
  this.shooting = false;
  this.start = false;
}

  handleKey = function(e, state) {
  switch(e.keyCode) {
    case InputManager.UP:
      this.upPressed = state;
      break;
    case InputManager.DOWN:
      this.downPressed = state;
      break;
    case InputManager.LEFT:
      this.leftPressed = state;
      break;
    case InputManager.RIGHT:
      this.rightPressed = state;
      break;
    case InputManager.SHOOT:
      this.shooting = state;
      break;
    case InputManager.START:
      this.start = state;
      break;
  }
  }
}
InputManager.UP = UP;
InputManager.DOWN = DOWN;
InputManager.LEFT = LEFT;
InputManager.RIGHT = RIGHT;
InputManager.SHOOT = SHOOT;
InputManager.START = START;

let inputManager = new InputManager();

window.addEventListener(
  'keydown', 
  function(e) {
    this.handleKey(e, true)
  }.bind(inputManager)
);

window.addEventListener(
  'keyup', 
  function(e){ 
    this.handleKey(e, false)
  }.bind(inputManager)
);

game.init();