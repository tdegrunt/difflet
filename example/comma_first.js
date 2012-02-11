var diff = require('../')({
    indent : 2,
    comma : 'first',
});

function qqq () {}

diff(
    { yy : 6, zz : 5, a : [1,2,3], fn : qqq },
    {
        a : [ 1, 2, 3, [4], "z", /beep/, new Buffer(3) ],
        fn : 8,
        b : [5,6,7]
    }
).pipe(process.stdout, { end : false });
