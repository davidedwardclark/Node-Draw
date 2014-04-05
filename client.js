$(function(){

    // Configuration
    var url = 'http://127.0.0.1'; // URL of your webserver
    var line_thickness = 7;
    var line_colour = "blue";

    // Variables
    var canvas = $('#paper');
    var ctx = canvas[0].getContext('2d');
    var id = Math.round($.now() * Math.random()); // Generate a unique ID
    var drawing = false; // A flag for drawing activity
    var touchUsed = false; // A flag to figure out if touch was used
    var clients = {};
    var cursors = {};
    var prev = {}; // Previous coordinates container
    var socket = io.connect(url);
    var lastEmit = $.now();

    // Drawing helper function
    function drawLine(fromx, fromy, tox, toy)
    {
        ctx.lineWidth = line_thickness;
        ctx.strokeStyle = line_colour;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
    }
    
    // On mouse down
    canvas.on('mousedown', function(e) {
        e.preventDefault();
        drawing = true;
        prev.x = e.pageX;
        prev.y = e.pageY;
    });

    // On touch start
    canvas.on('touchstart', function(e) {
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
        drawing = true;
        prev.x = touch.pageX;
        prev.y = touch.pageY;
    });

    // On mouse move
    canvas.on('mousemove', function(e) {
        // Emit the event to the server
        if ($.now() - lastEmit > 30)
        {
            socket.emit('mousemove', {
                'x': e.pageX,
                'y': e.pageY,
                'touch': false,
                'drawing': drawing,
                'id': id
            });
            lastEmit = $.now();
        }
        
        // Draw a line for the current user's movement
        if (drawing)
        {
            drawLine(prev.x, prev.y, e.pageX, e.pageY);
            prev.x = e.pageX;
            prev.y = e.pageY;
        }
    });

    // On touch move
    canvas.on('touchmove', function(e) {
        e.preventDefault();
        var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];

        // Emit the event to the server
        if ($.now() - lastEmit > 10)
        {
            socket.emit('mousemove', {
                'x': touch.pageX,
                'y': touch.pageY,
                'startX': prev.x,
                'startY': prev.y,
                'touch': true,
                'drawing': drawing,
                'id': id
            });
            lastEmit = $.now();
        }
        
        // Draw a line for the current user's movement
        if (drawing)
        {
            drawLine(prev.x, prev.y, touch.pageX, touch.pageY);
            prev.x = touch.pageX;
            prev.y = touch.pageY;
        }
    });

    // On mouse up
    canvas.on('mouseup mouseleave', function(e) {
        drawing = false;
    });

    // On touch end
    canvas.on('touchend touchleave touchcancel', function(e) {
        drawing = false;
    });

    // Keep users screen up to date with other users cursors & lines
    socket.on('moving', function (data) {
        // Create cursor
        if ( !(data.id in clients) )
        {
            cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
        }
        
        // Move cursor
        cursors[data.id].css({
            'left' : data.x,
            'top' : data.y
        });
        
        // Set the starting point to where the user first touched
        if (data.drawing && clients[data.id] && data.touch)
        {
            clients[data.id].x = data.startX;
            clients[data.id].y = data.startY;
        }

        // Show drawing
        if (data.drawing && clients[data.id])
        {
            // clients[data.id] holds the previous position of this user's mouse pointer
            drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y);
        }
        
        // Save state
        clients[data.id] = data;
        clients[data.id].updated = $.now();
    });
});