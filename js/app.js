// Global helper fxn gives a random integer between 0 and the argument, inclusive
function gRand (x) {
    return Math.floor(Math.random() * x);
}

/* First, some info about the board itself that our updates will need (in a
 * single global object).
 */
var Board = function() {
    /* Enemies need to know if they've overshot the right edge of the canvas.
     * Engine.js has been modified to use these dimensions when the canvas
     * is created.
     */
    this.canvasWidth = 505;
    this.canvasHeight = 606;

    // Some magic numbers we'll use throughout the application
    this.numRows = 6;
    this.numCols = 5;
    this.blockHeight = 83;      // pixels
    this.blockWidth = 101;       // pixels
    this.numEnemies = 3;
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

    /* An array for each row holds the profile of each non-player entity
     * that is drawn on it. Each entity's update() calls recordLocation() to
     * set its location and the player's call to detectCollision() queries
     * it. Profiles are stored in the format {ID, type, xStart, xEnd}.
     */
     this.rowProfiles = [];
     for (i = 0; i < this.numRows; i++) {
        this.rowProfiles[i] = [];
     }

    // PUBLIC FUNCTIONS

    // For a new frame cycle: reset the board
    this.reset = function () {
        for (var i = 0, stop = this.numRows; i < stop; i++) {
            this.rowProfiles[i] = [];
        }
    };

    /* Record a non-player's location during update. Note: collisions between
     * non-players are not fatal. Location profiles are stored in the format
     * {ID, type, xStart, xEnd}.
     */
    this.recordLocation = function (row, profile) {
        this.rowProfiles[row].push(profile);
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
        // First, set the x pixel boundaries of the block the player is in
        var pStart = xOffset[column];
        var pEnd = pStart + this.blockWidth - 1;
        var eStart, eEnd;     // loop internal lookup variables

        // Loop through the enemy profiles in the player's row
        for (var i = 0, stop = this.rowProfiles[row].length; i < stop; i++) {
            /* The player and enemy collide if the enemy starts or ends
             * in the player's square. The player "occupies" a whole square,
             * even though the graphic doesn't reach its boundaries. Because
             * enemies' animation is smooth, they often have parts in two
             * squares. Their space is defined by img location and width,
             * which may include some transparent pixels at the borders.
             */
             eStart = this.rowProfiles[row][i].xStart;
             eEnd = this.rowProfiles[row][i].xEnd;
             if ( (pStart <= eStart && eStart <= pEnd) ||
                  (pStart <= eEnd && eEnd <= pEnd) ) {
                // Report a collision
                return this.rowProfiles[row][i].type;
             }
        }
        // Made it through
        return 'clear';
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

    // An index number to identify the Enemy instance when debugging
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

    // Have we exited the board?
    if (this.currX > board.canvasWidth) {
        // Reset for a new pass across the board
        this.setNewPass();
    } else {
        /* Register our ID and location for collision detection. The first
         * frame of a new pass we're offscreen, so we didn't register above.
         */
        var profile = {
            ID: this.ID,
            type: 'enemy',
            xStart: this.currX,
            xEnd: this.currX + this.spriteWidth - 1
        };
        board.recordLocation(this.pathIdx, profile);
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
    this.sprite = playerSprite;             // as specified in the assignment
    // The image will be linked by imgInit once Resources is done loading.
    playerImg = null;

    /* A delay field allows the player to remain in place while the rest of
     * the board's animations continue. This is used to let wins and
     * collisions register visually before the player's position is reset.
     * A useSecondaryImage flag lets update() tell render() about special cases,
     * used so far in the case of a win or a collision.
     */
     var animationDelay = 0;
     var useSecondaryImage = 'none';

    // Secondary images: halo celebrates a win, ghost reflects a collision
    haloSprite = 'images/star2.png';
    haloImg = null;
    ghostSprite = 'images/anti-char-boy.png';   // inverted image of player
    ghostImg = null;

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

    this.update = function(dt) {
        /* If an animation delay has been set, process it first. If it still
         * applies, return. We'll reset any keyPresses when the delay's over.
         */
        if (animationDelay > 0) {
            animationDelay -= dt;
            if (animationDelay > 0) {
                return;
            }
            else {
                // Delay is over. Reset to start and continue normally.
                animationDelay = 0;
                useSecondaryImage = 'none';
                x = startCol;
                y = startRow;
                keyPresses['left'] = 0;
                keyPresses['up'] = 0;
                keyPresses['right'] = 0;
                keyPresses['down'] = 0;
            }
        }

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
        } else {
            // Test for a collision, which doesn't apply to a win.
            if (board.detectCollision(x, y) === 'enemy') {
                this.processEnemyCollision();
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
        switch (useSecondaryImage) {
            case 'halo':
                ctx.drawImage(haloImg, coord[0], coord[1]);
                // Fall through & draw the normal player sprite over the halo
            case 'none':
            default:
                ctx.drawImage(playerImg, coord[0], coord[1]);
                break;
            case 'ghost':
                ctx.drawImage(ghostImg, coord[0], coord[1]);
        }
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
        haloImg = Resources.get(haloSprite);
        ghostImg = Resources.get(ghostSprite);
    };

    this.processWin = function() {
        // Processing when the player wins (reaches the water row)
        useSecondaryImage = 'halo';     // Add a halo to our hero
        animationDelay = 1;             // Savor the moment
        console.log('You win');     // debug
    };

    this.processEnemyCollision = function() {
        // Processing for when the player collides with an enemy
        useSecondaryImage = 'ghost';
        animationDelay = 1;
        console.log('You lose');    // debug
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
