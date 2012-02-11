var difflet = require('../');
var test = require('tap').test;

test('html output', function (t) {
    var tags = {
        inserted : 'g',
        updated : 'b',
        deleted : 'r',
    };
    var diff = difflet({
        start : function (t, s) {
            s.write('<' + tags[t] + '>');
        },
        stop : function (t, s) {
            s.write('</' + tags[t] + '>');
        },
    });
    
    function qqq () {}
    var s = diff(
        { yy : 6, zz : 5, a : [1,2,3], fn : qqq },
        {
            a : [ 1, 2, 3, [4], "z", /beep/, new Buffer([0,1,2]) ],
            fn : 8,
            b : [5,6,7]
        }
    );
    s.pipe(process.stdout, { end : false });
    
    var data = ''
    s.on('data', function (buf) { data += buf });
    s.on('end', function () {
        t.equal(data,
            '{"a":[1,2,3,<g>[4]</g>,<g>"z"</g>,<g>/beep/</g>,<g>'
            + '<Buffer 00 01 02></g>],"fn":<b>8</b>,'
            + '<g>"b":[5,6,7]</g>,<r>"yy":6,"zz":5</r>}'
        );
        t.end();
    });
});
