// ADD RESET LEVEL BUTTON

// Only allow arrow movement when canvas is in focus

// Remove static/dynamic arrays from JSON files
// keep only 1 array for each color wall
// keep both dynamic and static symbols on same arrays

document.addEventListener('DOMContentLoaded', function() {

    // Initialize canvas
    var canvas = document.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var canWidth = canvas.width;
    var canHeight = canvas.height;
    var canDiag = (canWidth + canHeight) / 2; // Diagonal length of canvas

    // Add game object names as constants
    var BG = null;
    var player = null;
    var walls = [];
    var checkpoint = null;

    // Create default game settings
    var TS = canHeight / 16 // Tile size
    var ShiftSettings = {
        player: {
            color: 'rgba(200,0,0,1)',
            static: true,
            target: null,
            shiftHue: null,
            shiftAxis: null,
            reversed: false
        },
        BG: {
            color: 'rgba(255,255,255,1)',
            static: true,
            target: null,
            shiftHue: null,
            shiftAxis: null,
            reversed: false
        }
    }

    // Define icons to be used when parsing levels
    const Icons = {
        'empty': '.',
        'player': '@',
        'checkpoint': '#',

        // Icons for dynamic walls, and dynamic walls w/ 'reversed' effect applied
        'dynamic': {
            'x': 'x', 'reverseX': 'X',
            'y': 'y', 'reverseY': 'Y',
            'xy': 'z', 'reverseXY': 'Z'
        },

        // Levels of any given gradient, to be multiplied by tile size
        // Limited to a range of 36
        'gradient': [
            '0','1','2','3','4','5','6','7','8','9',
            'a','b','c','d','e','f','g','h','i','j',
            'k','l','m','n','o','p','q','r','s','t',
            'u','v','x','y','z'
        ]
    }

    // File names for levels to be loaded
    // MUST prefix with 'level-data/' and end with '.json' when processing
    const levels = [
        'dev-level', 'level-1', 'level-2', 'level-3', 'level-4',
        'level-5', 'level-6', 'level-7', 'level-8', 'level-9', 'level-10',
        'level-11', 'level-12', 'level-13', 'end-level'
    ]
    var levelNum = 0;

    // Add control settings

    // Add event flags
    var leftPressed = false;
    var rightPressed = false;
    var upPressed = false;
    var downPressed = false;

    // Add listeners for events
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);

    // Define event handlers
    function keyDownHandler(event) {
        switch(event.key) {
            case 'ArrowRight' || 'right':
                rightPressed = true;
                break;
            case 'ArrowLeft' || 'left':
                leftPressed = true;
                break;
            case 'ArrowDown' || 'down':
                downPressed = true;
                break;
            case 'ArrowUp' || 'up':
                upPressed = true;
                break;
            default:
                break;
        }
    }

    function keyUpHandler(event) {
        switch(event.key) {
            case 'ArrowRight' || 'right':
                rightPressed = false;
                break;
            case 'ArrowLeft' || 'left':
                leftPressed = false;
                break;
            case 'ArrowDown' || 'down':
                downPressed = false;
                break;
            case 'ArrowUp' || 'up':
                upPressed = false;
                break;
            default:
                break;
        }
    }

    // Add object constructors

    // Background
    function Background(x, y, width, height, color) {
        this.x = x; this.y = y; 
        this.width = width; this.height = height;
        this.color = color;

        // Draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // Wall
    // 'type' arg specifies if wall is have shift effect applied
    // Possible typs: 'static', 'x' ,'y', 'xy'
    function Wall(x, y, width, height, color, static=true,
            shiftAxis='x', shiftHue='all', shiftReveresed=false) {
        this.x = x; this.y = y;
        this.width = width; this.height = height;
        this.color = color;

        this.static = static;
        this.shiftAxis = shiftAxis;
        this.shiftHue = shiftHue;
        this.shiftReveresed = shiftReveresed;

        // Draw image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // Checkpoint
    // Checks for collision with assigned target
    // Triggers level change on collision
    function Checkpoint(x, y, radius, color, target) {
        this.x = x; this.y = y;
        this.radius = radius;
        this.color = color;
        this.target = target;

        // Set flag for detecting collisions
        this.active = true;

        // Check for collision with target
        this.update = function() {
            if (this.active && 
                this.x < target.x + target.width && this.x > target.x &&
                this.y < target.y + target.height && this.y > target.y) {

                // Change level
                levelNum++;
                changeLevel(levelNum);

                // Change color
                this.color = 'rgba(240,240,255,1)';

                // Set active to false so level transition only happens once
                this.active = false;
            }
        }

        // Draw image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.arc(this.x, this.x, this.radius, 0, Math.PI*2);
            surface.fill();
        }
    }

    // Player
    // color arg must be rbga!
    function Player(x, y, width, height, speed, color) {
        this.x = x; this.y = y; 
        this.width = width; this.height = height;
        this.color = color;
        this.speed = speed;
        this.slideSpeed = 1; // speed during move assist


        // Draw image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }

        this.update = function() {
            // For strange reasons, collision seems to only work if
            // x/y coordinates are checked for collision independantly

            // Apply x velocity and check horizontal wall collisions
            this.x += (rightPressed - leftPressed) * speed;
            // Check wall collisions
            if (walls) {
                for (var w=0; w<walls.length; w++) {
                    var wall = walls[w];
                    if (this.x < wall.x + wall.width &&
                        this.x + this.width > wall.x &&
                        this.y < wall.y + wall.height &&
                        this.y + this.height > wall.y) {
                        if (rightPressed) {
                            this.x = wall.x - this.width;

                            // Crawl along wall if close enough to edge / touching corner of wall (move assist)
                            // Make sure that RIGHT is the only key being pressed
                            if (this.y < wall.y && !upPressed &&
                                !upPressed && !downPressed) {
                                this.y -= this.slideSpeed;
                            } else if ( this.y + this.height > wall.y + wall.height
                                        && !downPressed) {
                                this.y += this.slideSpeed;
                            }
                        } else if (leftPressed) {
                            this.x = wall.x + wall.width;

                            if (this.y < wall.y && !rightPressed &&
                                !upPressed && !downPressed) {
                                this.y -= this.slideSpeed;
                            } else if ( this.y + this.height > wall.y + wall.height
                                        && !downPressed) {
                                this.y += this.slideSpeed;
                            }
                        }
                    }
                }
            }

            // Apply y velocity and check vertical collisions
            // Only seems to work if collision is checked again
            this.y += (downPressed - upPressed) * speed;
            if (walls) {
                for (var w=0; w<walls.length; w++) {
                    var wall = walls[w];
                    if (this.x < wall.x + wall.width &&
                        this.x + this.width > wall.x &&
                        this.y < wall.y + wall.height &&
                        this.y + this.height > wall.y) {
                        if (downPressed) {
                            this.y = wall.y - this.height;
                            // check for move assist when pushing down on CORNER of wall
                            // make sure DOWN is the only key being pressed
                            if (this.x < wall.x && !upPressed &&
                                !leftPressed && !rightPressed) {
                                this.x -= this.slideSpeed;
                            } else if (this.x+this.width > wall.x+wall.width) {
                                this.x += this.slideSpeed;
                            }
                        } else if (upPressed) {
                            this.y = wall.y + wall.height;
                            // check for move assist when pushing up
                            if (this.x < wall.x && !downPressed &&
                                !leftPressed && !rightPressed) {
                                this.x -= this.slideSpeed;
                            } else if (this.x+this.width > wall.x+wall.width) {
                                this.x += this.slideSpeed;
                            }
                        }
                    }
                }
            }

            // Stop at screen bounds
            if (this.x < 0) {
                this.x = 0
            } else if (this.x > canWidth-this.width) {
                this.x = canWidth - this.width;
            }
            if (this.y < 0) {
                this.y = 0;
            } else if (this.y > canHeight-this.height) {
                this.y = canHeight - this.height;
            }
        }
    }

    // Shifter object changes properties of an object (ex: color) based on
    // properties of another subject (ex: position)
    // ALL COLORS USED HERE MUST BE RGBA FORMAT WITHOUT SPACES
    const Shifter = {

        // breakClrString() returns obj w/ isolated values from RGBA string
        breakClrString: function(clrString) {
            var ClrProps = {r:0, g:0, b:0, a:0};
            // Remove unnecessary characters and split numbers into array
            var tempString = clrString.replace('rgba(', '');
            tempString = tempString.replace(')', '');
            tempString = tempString.split(',');

            // Convert characters to numbers and assign
            ClrProps.r = Number(tempString[0]);
            ClrProps.g = Number(tempString[1]);
            ClrProps.b = Number(tempString[2]);
            ClrProps.a = Number(tempString[3]);

            return ClrProps;
        },

        // makeClrString() returns string a useable string version of
        // object of rgba properties (made in breakClrString()) 
        makeClrString: function(clrProps) {
            var clrString = 'rgba(' + clrProps.r + ',' + clrProps.g + 
                ',' + clrProps.b + ',' + clrProps.a + ')';
            
            return clrString;
        },

        /*  
        objToClr() changes the color values of a given subject based on the position 
        of a given object, in the range of the canvas size 

        Subject AND object MUST have:
         - x/y, and color properties
         - color MUST be rgba format with NO SPACES

        'axis' args:
         - 'x': horizontal
         - 'y': vertical
         - 'xy': diagonal (topleft to bottomright)

        'hue' args include 'r', 'g', 'b', 'a', 'all'
        NOTE: 'all' only affects rgb, NOT transparency

        'reversed' arg (optional) starts the effect slider at the other end of the arena,
        ex: hue='r', axis='x', reversed=false -> moving from left to right increases hue, starting at min
            reversed=true -> moving from left to right decreases hue, starting at at max
        */
        posToClr: function(subject, object, axis, hue, reversed) {
            // Separate subject and object color values
            var objClrProps = this.breakClrString(object.color);

            // Get new color value based on object position and axis
            var value = 0;
            switch(axis) {
                case 'x': 
                    // If reversed, the given hue brightness is affected inversly
                    if(reversed) {
                        value = 255 - (255*(subject.x/canWidth));
                    } else {
                        value = 255 * (subject.x/canWidth);
                    }
                    break;
                
                case 'y':
                    if(reversed) {
                        value = 255 - (255*(subject.y/canHeight));
                    } else {
                        value = 255 * (subject.y/canHeight);
                    }
                    break;
                
                case 'xy':
                    if(reversed) {
                        value = 255 - (255*((subject.x+subject.y)/2) 
                            / canDiag);
                    } else {
                        value = 255 * ((subject.x+subject.y)/2) / canDiag;
                    }
                    break;
                
                default: value = 0; 
                    break;
            }
            // Apply value to specified color property
            switch(hue) {
                case 'all':
                    objClrProps.r = objClrProps.g = objClrProps.b = value;
                    break;
                case 'r': objClrProps.r = value; break;
                case 'g': objClrProps.g = value; break;
                case 'b': objClrProps.b = value; break;
                case 'a': objClrProps.a = (1/255)*value;break;
                default: break;
            }
            // Reset object's Color.string property
            object.color = this.makeClrString(objClrProps);
        }
    }

    // initObjs() resets main game objects to default versions
    function initObjs() {
        // Default tile size
        TS = canHeight/16;

        // Make default background
        BG = new Background(0, 0, canWidth, canHeight, 'rgba(255,255,255,1');

        // Make sure player size is slightly smaller than tile size!!
        // This is in order to fit between gaps
        // 3.5 is fastest w/out skipping over gaps w/ current size+speed
        player = new Player(TS, TS, TS*0.94, TS*0.94, 2, 'rgba(240,0,0,1)');
        
        // Default checkpoint
        checkpoint = new Checkpoint(999, 999, TS/2, 'rgba(80,80,255,1)', player);

        // Empty walls
        walls = [];
    }

    // parseLevel() resets game elements to defaults, 
    // assignes properties and settings based on JSON file,
    // and restarts mainLoop()
    function parseLevel(filename) {

        // Create new XHR request
        var request = new XMLHttpRequest();
        var url = filename;
        request.open('GET', filename);
        request.responseType = 'json';

        // Assign request repsonse 
        request.onload = function() {
            // Reset objects to defaults
            initObjs();

            var LevelData = request.response;

            // Get new tile size
            // Note: canvas is always set at constant ratio
            TS = canHeight / LevelData.tileSize;

            // Background data
            var BGData = LevelData.BG;

            BG.color = BGData.color;

            // Assign checkpoint position
            var CheckPos = LevelData.checkpoint.position;

            for (var r=0; r<CheckPos.length; r++) {
                for (var c=0; c<CheckPos[r].length; c++) {

                    // Check for matching icon
                    if (CheckPos[r][c] === Icons.checkpoint) {

                        // Add 1/2 tile size to account for radius center
                        checkpoint.x = TS*c + TS/2;
                        checkpoint.y = TS*r + TS/2;
                    }
                }
            }
            
            // Assign shift settings
            ShiftSettings.BG.static = BGData.static;
            ShiftSettings.BG.target = BGData.target;
            ShiftSettings.BG.shiftHue = BGData.shiftHue;
            ShiftSettings.BG.shiftAxis = BGData.shiftAxis;
            ShiftSettings.BG.reversed = BGData.reversed;

            // Player data
            var PlayData = LevelData.player;

            player.width = TS * PlayData.width;
            player.height = TS * PlayData.height;
            player.color = PlayData.color;

            // Assign shift settings
            ShiftSettings.player.static = PlayData.static;
            ShiftSettings.player.target = PlayData.target;
            ShiftSettings.player.shiftHue = PlayData.shiftHue;
            ShiftSettings.player.shiftAxis = PlayData.shiftAxis;
            ShiftSettings.player.reversed = PlayData.reversed;

            // Loop through columns and rows in text array to get position
            for (var r=0; r<PlayData.position.length; r++) {
                for (var c=0; c<PlayData.position[r].length; c++) {

                    // Check for matching icon
                    if (PlayData.position[r][c] === Icons.player) {
                        player.x = TS*c;
                        player.y = TS*r;
                    }
                }
            }

            // Assign walls

            // Static

            // Black and white
            var monoData = LevelData.wallLayout.static.mono;

            // Loop through columns and rows
            for (var r=0; r<monoData.length; r++) {
                for (var c=0; c<monoData[r].length; c++) {

                    // Check for matching icons (any icon in the 'gradient' property of 'Icon' obj)
                    var icon = monoData[r][c]
                    for (var i=0; i<Icons.gradient.length; i++) {

                        // Calculate color value based on index of icon in array
                        var clrValue = 0;
                        if (Icons.gradient[i] === icon) {
                            // Convert RGBA color range to be used based on width of canvas,
                            //  and the current tile size
                            clrValue = (TS / (canWidth/255)) * i; // VERY IMPORTANT FORMULA

                            walls.push(new Wall(TS*c, TS*r, TS, TS,  
                                'rgba('+clrValue+','+clrValue+','+clrValue+',1)'));
                        }
                    }
                }
            }

            // Red
            var redData = LevelData.wallLayout.static.red;

            for (var r=0; r<redData.length; r++) {
                for (var c=0; c<redData[r].length; c++) {
                    var icon = redData[r][c]
                    for (var i=0; i<Icons.gradient.length; i++) {
                        var clrValue = 0;
                        if (Icons.gradient[i] === icon) {
                            clrValue = (TS / (canWidth/255)) * i;
                            walls.push(new Wall(TS*c, TS*r, TS, TS,  
                                'rgba('+clrValue+',0,0,1)'));
                        }
                    }
                }
            }

            // Green
            var GreenData = LevelData.wallLayout.static.green;

            for (var r=0; r<GreenData.length; r++) {
                for (var c=0; c<GreenData[r].length; c++) {
                    var icon = GreenData[r][c]
                    for (var i=0; i<Icons.gradient.length; i++) {
                        var clrValue = 0;
                        if (Icons.gradient[i] === icon) {
                            clrValue = (TS / (canWidth/255)) * i;
                            walls.push(new Wall(TS*c, TS*r, TS, TS,  
                                'rgba(0,'+clrValue+',0,1)'));
                        }
                    }
                }
            }

            // Blue
            var BlueData = LevelData.wallLayout.static.blue;

            for (var r=0; r<BlueData.length; r++) {
                for (var c=0; c<BlueData[r].length; c++) {
                    var icon = BlueData[r][c]
                    for (var i=0; i<Icons.gradient.length; i++) {
                        var clrValue = 0;
                        if (Icons.gradient[i] === icon) {
                            clrValue = (TS / (canWidth/255)) * i;
                            walls.push(new Wall(TS*c, TS*r, TS, TS,  
                                'rgba(0,0,'+clrValue+',1)'));
                        }
                    }
                }
            }

            // Alpha
            var AlphaData = LevelData.wallLayout.static.alpha;

            for (var r=0; r<AlphaData.length; r++) {
                for (var c=0; c<AlphaData[r].length; c++) {
                    var icon = AlphaData[r][c]
                    for (var i=0; i<Icons.gradient.length; i++) {
                        var clrValue = 0;
                        if (Icons.gradient[i] === icon) {
                            
                            // Divide canWidth by 1 NOT 255!
                            clrValue = (TS / (canWidth/1)) * i;
                            walls.push(new Wall(TS*c, TS*r, TS, TS,  
                                'rgba(0,0,0,'+clrValue+')'));
                        }
                    }
                }
            }

            // Dynamic/shiftable

            // Black and white
            var dynMonoData = LevelData.wallLayout.dynamic.mono;

            for (var r=0; r<dynMonoData.length; r++) {
                for (var c=0; c<dynMonoData[r].length; c++) {

                    // Check for matching icons (any icon in the 'dynamic' property of 'Icon' obj)
                    var icon = dynMonoData[r][c];
                    switch(icon) {
                        case Icons.dynamic.x:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'x', 'all', false));
                            break;
                        case Icons.dynamic.reverseX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'x', 'all'.XHue, true));
                            break;
                        case Icons.dynamic.y:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'all'.YHue, false));
                            break;
                        case Icons.dynamic.reverseY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'all'.YHue, true));
                            break;
                        case Icons.dynamic.xy:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'xy', 'all'.XYHue, false));
                            break;
                        case Icons.dynamic.reverseXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'xy', 'all'.XYHue, true));
                            break;
                        default:
                            break;
                    }
                }
            }

            // Red
            var dynRedData = LevelData.wallLayout.dynamic.red;

            for (var r=0; r<dynRedData.length; r++) {
                for (var c=0; c<dynRedData[r].length; c++) {

                    // Check for matching icons (any icon in the 'dynamic' property of 'Icon' obj)
                    var icon = dynRedData[r][c];
                    switch(icon) {
                        case Icons.dynamic.x:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'x', 'r', false));
                            break;
                        case Icons.dynamic.reverseX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'x', 'r', true));
                            break;
                        case Icons.dynamic.y:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'r', false));
                            break;
                        case Icons.dynamic.reverseY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'r', true));
                            break;
                        case Icons.dynamic.xy:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'xy', 'r', false));
                            break;
                        case Icons.dynamic.reverseXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'xy', 'r', true));
                            break;
                        default:
                            break;
                    }
                }
            }

            // Green
            var dynGreenData = LevelData.wallLayout.dynamic.green;

            for (var r=0; r<dynGreenData.length; r++) {
                for (var c=0; c<dynGreenData[r].length; c++) {

                    // Check for matching icons (any icon in the 'dynamic' property of 'Icon' obj)
                    var icon = dynGreenData[r][c];
                    switch(icon) {
                        case Icons.dynamic.x:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'x', 'g', false));
                            break;
                        case Icons.dynamic.reverseX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'x', 'g', true));
                            break;
                        case Icons.dynamic.y:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'g', false));
                            break;
                        case Icons.dynamic.reverseY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'g', true));
                            break;
                        case Icons.dynamic.xy:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'xy', 'g', false));
                            break;
                        case Icons.dynamic.reverseXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'xy', 'g', true));
                            break;
                        default:
                            break;
                    }
                }
            }

            // Blue
            var dynBlueData = LevelData.wallLayout.dynamic.blue;

            for (var r=0; r<dynBlueData.length; r++) {
                for (var c=0; c<dynBlueData[r].length; c++) {

                    // Check for matching icons (any icon in the 'dynamic' property of 'Icon' obj)
                    var icon = dynBlueData[r][c];
                    switch(icon) {
                        case Icons.dynamic.x:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'x', 'b', false));
                            break;
                        case Icons.dynamic.reverseX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'x', 'b', true));
                            break;
                        case Icons.dynamic.y:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'b', false));
                            break;
                        case Icons.dynamic.reverseY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'b', true));
                            break;
                        case Icons.dynamic.xy:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'xy', 'b', false));
                            break;
                        case Icons.dynamic.reverseXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'xy', 'b', true));
                            break;
                        default:
                            break;
                    }
                }
            }

            // Alpha
            var dynAlphaData = LevelData.wallLayout.dynamic.alpha;

            for (var r=0; r<dynAlphaData.length; r++) {
                for (var c=0; c<dynAlphaData[r].length; c++) {

                    // Check for matching icons (any icon in the 'dynamic' property of 'Icon' obj)
                    var icon = dynAlphaData[r][c];
                    switch(icon) {
                        case Icons.dynamic.x:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'x', 'a', false));
                            break;
                        case Icons.dynamic.reverseX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'x', 'a', true));
                            break;
                        case Icons.dynamic.y:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'a', false));
                            break;
                        case Icons.dynamic.reverseY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'y', 'a', true));
                            break;
                        case Icons.dynamic.xy:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                                false,'xy', 'a', false));
                            break;
                        case Icons.dynamic.reverseXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)',
                            false,'xy', 'a', true));
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        request.send();
    }

    // Gets filename from list of levels, and calls parser function
    // also starting the game loop
    function changeLevel(levelIndex) {
        // If level number is higher than level list, restart count
        if(levelIndex > levels.length-1) {
            levelNum = 0;
            levelIndex = levelNum;
        }
        parseLevel('level-data/' + levels[levelIndex] + '.json');
    }

    // Define main game loop to update and draw game elements
    function mainLoop() {
        var Settings = ShiftSettings;
        // Clear canvas
        ctx.clearRect(0, 0, canWidth, canHeight);

        // Draw background
        if(BG) {
            //console.log(Settings.BG.reversed);
            // Apply color shift effect if specified in ShiftSettings
            if(!Settings.BG.static) {
                // wrap first arg in eval() to convert from string in settings
                Shifter.posToClr(eval(Settings.BG.target), BG, 
                    Settings.BG.shiftAxis, Settings.BG.shiftHue, Settings.BG.reversed);
            }
            BG.draw(ctx);
        }

        // Draw walls
        for(var i=0; i<walls.length; i++) {
            if(!walls[i].static) {
                if(walls[i].shiftAxis==='x' && walls[i].shiftHue==='a') {
                }
                Shifter.posToClr(player, walls[i], walls[i].shiftAxis, 
                    walls[i].shiftHue, walls[i].shiftReveresed);
            }
            walls[i].draw(ctx);
        }

        if(checkpoint) {
            checkpoint.update();
            checkpoint.draw(ctx);
        }

        // Draw/update player
        if(player) {
            // Apply shift effect
            if(!Settings.player.static) {
                Shifter.posToClr(eval(Settings.player.target), player, 
                    Settings.player.shiftAxis, Settings.player.shiftHue, 
                    Settings.player.reversed);
            }
            player.update();
            player.draw(ctx);
        }
    }

    // Initialize game
    // Start main loop at 5 second interval
    levelNum = 1;
    //parseLevel('level-data/test-level.json');
    changeLevel(levelNum);
    setInterval(mainLoop, 5);
});