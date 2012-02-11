var diff = require('../')({ indent : 2 });

function qqq () {}

diff(
    {
        yy : 6,
        zz : 5,
        a : [1,2,3],
        fn : qqq,
        c : { x : 7, z : 3 }
    },
    {
        a : [ 1, 2, "z", /beep/, new Buffer(3) ],
        fn : 8,
        b : [5,6,7],
        c : { x : 8, y : 5 }
    }
).pipe(process.stdout, { end : false });
