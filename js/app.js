// Global helper fxn gives a random integer between 0 and the argument, inclusive
function gRand (x) {
    return Math.floor(Math.random() * x);
}

/* First, some info about the board itself that our updates will need (in a
 * single global object).
 */
var Board = function() {
    // Enemies need to know if they've overshot the right edge of the canvas
    //this.canvasWidth = document.querySelector('canvas').width;
    this.canvasWidth = 505;
    this.canvasHeight = 606;

    // Some magic numbers we'll use throughout the application
    this.numRows = 6;
    this.numCols = 5;
    this.blockHeight = 83;      // pixels
    this.blockWidth = 101;       // pixels
    this.numEnemies = 4;
//this.numEnemies = 1;    //debug

    // A flag to end the game. Set with the Esc key, checked by engine.main().
    this.gameStatus = 'run';

    // Pre-calculate base coordinates for rows and columns of background blocks
    var xOffset = [], yOffset = [];
    for (var i = 0, offset = 0; i < this.numCols; i++) {
        // Permanent array converts player colIdx to x coordinates
        xOffset[i] = offset;
        offset += this.blockWidth;
    }
    for (i = 0, offset = 0; i < this.numRows; i++) {
        yOffset[i] = offset;
        offset += this.blockHeight;
    }

    // TODO Row array stores non-player profiles that are in each row

    // PUBLIC FUNCTIONS

    // For a new frame cycle: reset the board
    this.reset = function () {
        return; // TODO board structure
    };

    /* Record a non-player's location during update. Note: collisions between
     * non-players are not fatal.
     */
    this.recordLocation = function (pathIdx, x, spriteWidth) {
        return; // TODO board structure
    };

    // Check for enemy congestion on a particular row (new ones will wait)
    this.congestionCheck = function (row) {
        return false;   // TODO base on length of row's profileCount
    };

    /* Calculate the drawing coordinates for a block's (x,y) index
     * coordinates. Pixel coordinates are returned in a 2-element array.
     */
    this.getCoordinates = function (x, y) {
        return [xOffset[x], yOffset[y]];
    };

    /* Does the player's current position collide with anything? For initial
     * implementation, only enemies exist. The first Enemy collision is fatal.
     * Reward collisions may come later.
     */
    this.detectCollision = function (column, row) {
        return 'clear';   // TODO collision processing
    };
};
var board = new Board;

// Enemies our player must avoid
var Enemy = function() {
    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    // The image/sprite for our enemies, this uses
    // a helper we've provided to easily load images
    this.sprite = 'images/enemy-bug.png';

    /* My code: first, the image. We'll use the image itself and its width,
     * but they won't be available till Resources loads them (via imgInit).
     */
    this.spriteImg = null;
    this.spriteWidth = null;

    // An index number to ID the Enemy instance when debugging
    this.ID = allEnemies.length;

    /* The following three sets of properties are all set/reset at the start of
     * each pass by setNewPass().
     *
     * Information about where the image appears:
     *  pathIdx = which of the 3 stone rows (1, 2, or 3) this Enemy will cross on
     *      the current pass
     *  pathY = y coordinate of the top of the chosen path. Computed once per pass.
     *  currX = current x coordinate of the sprite's left corner. Computed each frame.
     */
     this.pathIdx = null;
     this.pathY = null;
     this.currX = null;

    /* Rate-of-travel information:
     *  crossTime = time (in seconds) to traverse the horizontal path
     *  xPerSec = x distance (in pixels) to cover per second.
     */
     this.crossTime = null;
     this.xPerSec = null;

    /* Delay-of-entry info, so we don't get too much traffic in one row.
     *  pauseSec = time this enemy should wait before entering the game.
     */
     this.pauseSec = null;

     /* The first setup for these properties happens in the first call to
      * setNewPass(), called from imgInit()
     */
};

// Deferred setup, has to wait till Resources is loaded. Called by gImgInit().
Enemy.prototype.imgInit = function() {
    this.spriteImg = Resources.get(this.sprite);
    this.spriteWidth = this.spriteImg.width;
    this.setNewPass();
};

// Helper function to (re)initialize for a new pass
Enemy.prototype.setNewPass = function() {
    this.crossTime = gRand(3) + 1;  // cross in 1 - 3 sec
    this.pathIdx = gRand(3) + 1;    // path 0 is the water, 1-3 are enemy paths
//this.pathIdx = 0;   //debug
    this.xPerSec = Math.floor(board.canvasWidth / this.crossTime);
    this.pathY = this.pathIdx * board.blockHeight;
    this.currX = -(this.spriteWidth); // Completely offscreen until first update

    // If the path is already congested, choose a pause time
    if (board.congestionCheck(this.pathIdx)) {
        this.pauseSec = gRand(4) + 1;
    } else {
        this.pauseSec = 0;
    }
//console.log(this.ID, this.pathIdx, this.crossTime, this.xPerSec, this.currX);   //debug
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
//console.log(dt, this.ID, this.pathIdx, this.crossTime, this.xPerSec, this.currX);
    /* If this enemy is waiting to enter the board because of congestion, see
     * if the wait is over. Return immediately if pauseSec is still positive.
     */
    if (this.pauseSec > 0) {
        this.pauseSec -= dt;
        if (this.pauseSec > 0) {
            return;
        } else {
            // Zap the delay and proceed normally
            this.pauseSec = 0;
        }
    }

    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.currX += Math.floor(this.xPerSec * dt);
//console.log(dt, this.currX);    //debug

    // Have we exited the board? Reset for a new pass. Otherwise, register loc
    if (this.currX > board.canvasWidth) {
        this.setNewPass();
    } else {
        board.recordLocation(this.pathIdx, this.currX, this.spriteWidth);
    }

    return;
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function() {
    if (this.PauseSec > 0) {    // Skip render if waiting for congestion
        return;
    } else {
        /* Note name differences from Udacity assignment code: X and Y names
         * are more descriptive, and we only look up the image once (on
         * construction), not on each pass.
         */
        if (this.spriteImg == null) {            // debug test
            alert("Null enemy image" + this.sprite);
        }
        ctx.drawImage(this.spriteImg, this.currX, this.pathY);
    }
};

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.
var Player = function() {

    playerSprite = 'images/char-boy.png';  // Default-only. TODO: choose avatar
    // The image will be linked by imgInit once Resources is done loading.
    playerImg = null;

    /* Starting location, using block indexes, in the middle of the bottom
     * row. We'll return here whenever we win or die.
     */
    startCol = Math.floor(board.numCols / 2);
    startRow = board.numRows - 1;

    x = startCol;
    y = startRow;

    // An array stores keystroke counts from handleInput each frame cycle
    var keyPresses = {
        'left':  0,
        'up':    0,
        'right': 0,
        'down':  0
    };

    this.update = function() {
         /* Apply all keystrokes to x and y indexes. At a normal frame rate we
          * can at most expect one keystroke per frame, but it's cheap to not
          * make that assumption. Note that y coordinates are 0 at the top
          * and increase down the screen.
          */
        x += (keyPresses['right'] - keyPresses['left']);
        y += (keyPresses['down'] - keyPresses['up']);

        // Test for board boundaries
        if (x < 0) {
            x = 0;
        } else if (x > board.numCols - 1) {
            x = board.numCols - 1;
        }
        if (y < 0) {
            y = 0;
        } else if (y > board.numRows - 1) {
            y = board.numRows - 1;
        }

        // Test for a win. Our goal, the water, is in row 0.
        if (y === 0) {
            this.processWin();
console.log('win');     //debug
        } else {
            // Test for a collision, which doesn't apply to a win.
            if (board.detectCollision(x, y) === 'enemy') {
                this.processEnemyCollision();
console.log('collision');       //debug
            } // Other collision types (e.g. rewards) may be added later.
        }

        // Reset keycounts for the next frame cycle
        keyPresses['left'] = 0;
        keyPresses['up'] = 0;
        keyPresses['right'] = 0;
        keyPresses['down'] = 0;

        return;
    };

    this.render = function() {
        if (playerImg == null) {            // debug test
            alert("Null player image " + playerSprite);
        }
        var coord = board.getCoordinates(x, y);
        ctx.drawImage(playerImg, coord[0], coord[1]);
    };

    this.handleInput = function(move) {
        // Increment the member of the keyPresses object indexed by 'move'
        if (typeof keyPresses[move] === "undefined") {
            return;
        }
        keyPresses[move] ++;
//console.log(keyPresses);    //debug
    };

    this.imgInit =  function() {
        // Called to complete setup once Resources is loaded
        playerImg = Resources.get(playerSprite);
    };

    this.processWin = function() {
        // Processing when the player wins (reaches the water row)
        // First implementation just returns to start. Bells and whistles TBA.
        x = startCol;
        y = startRow;
    };

    this.processEnemyCollision = function() {
        // Processing for when the player collides with an enemy
        // First implementation just returns to start. Bells and whistles TBA.
        x = startCol;
        y = startRow;
    };

};

// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
var allEnemies = [];
for (var i = 0; i < board.numEnemies; i++) {
    allEnemies[i] = new Enemy;
}
// Place the player object in a variable called player
var player = new Player;

// Tell Resources to initialize our images when it's done loading.
function gImgInit() {
    for (var i = 0, stop = allEnemies.length; i < stop; i++) {
        allEnemies[i].imgInit();
    }
    player.imgInit();
}
Resources.onReady(gImgInit);

// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        27: 'esc'
    };

    if (e.keyCode == 27) {
        board.gameStatus = 'stop';
    } else {
        player.handleInput(allowedKeys[e.keyCode]);
    }
});
