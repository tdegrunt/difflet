difflet
=======

Create colorful diffs for javascript objects.

example
=======

``` js
var diff = require('difflet')({ indent : 2 });

var prev = {
    yy : 6,
    zz : 5,
    a : [1,2,3],
    fn : 'beep',
    c : { x : 7, z : 3 }
};

var next = {
    a : [ 1, 2, "z", /beep/, new Buffer(3) ],
    fn : function qqq () {},
    b : [5,6,7],
    c : { x : 8, y : 5 }
};

diff(prev, next).pipe(process.stdout);
```

output:

![colorful output](http://substack.net/images/screenshots/difflet_colors.png)

green for inserts, blue for updates, red for deletes

methods
=======

var difflet = require('difflet')

var diff = difflet(opts={})
---------------------------

Create a difflet from optional options `opts`.

With `opts.start(type, stream)` and `opts.stop(type, stream)`,
you can write custom handlers for all the types of differences:
`'inserted'`, `'updated'`, and `'deleted'`.
By default green is used for insertions, blue for updates, and red for
deletions.

If `opts.indent` is set, output will span multiple lines and `opts.indent`
spaces will be used for leading whitespace.

If `opts.comma === 'first'` then commas will be placed at the start of lines.

diff(prev, next)
----------------

Return a stream with the colorful changes between objects `prev` and `next`.

install
=======

With [npm](http://npmjs.org) do:

```
npm install difflet
```

test
====

With [npm](http://npmjs.org) do:

```
npm test
```

license
=======

MIT/X11
