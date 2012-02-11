var traverse = require('traverse');
var Stream = require('stream').Stream;
var charm = require('charm');

module.exports = function (prev, next) {
    var stream = new Stream;
    stream.readable = true;
    stream.writable = true;
    stream.write = function (buf) { this.emit('data', buf) };
    stream.end = function () { this.emit('end') };
    
    var c = charm(stream);
    
    process.nextTick(function () {
        traverse(next).forEach(stringify);
        stream.emit('end');
    });
    
    var levels = 0;
    function set (color) {
        c.foreground(color);
        levels ++;
    }
    
    function unset () {
        if (--levels === 0) c.display('reset');
    }
    
    function stringify (node) {
        var inserted = this.path
            ? traverse.get(prev, this.path) === undefined
            : false
        ;
        
        if (Array.isArray(node)) {
            var insertedElem = false;
            
            this.before(function () {
                if (inserted) set('green');
                c.write('[');
            });
            
            this.post(function (child) {
                if (!child.isLast) c.write(',');
            });
            
            this.after(function () {
                c.write(']');
                if (inserted) unset();
            });
        }
        else if (typeof node === 'object'
        && node && typeof node.inspect === 'function') {
            this.block();
            if (inserted) set('green');
            c.write(node.inspect());
            if (inserted) unset();
        }
        else if (typeof node == 'object') {
            var insertedKey = false;
            
            this.before(function () {
                if (inserted) set('green');
                c.write('{');
            });
            
            this.pre(function (x, key) {
                if (traverse.get(prev, this.path.concat(key)) === undefined) {
                    insertedKey = true;
                    set('green');
                }
                stringify(key);
                c.write(':');
            });
            
            this.post(function (child) {
                if (!child.isLast) c.write(',');
                if (insertedKey) unset();
            });
            
            this.after(function () {
                if (inserted) unset();
                c.write('}');
            });
        }
        else {
            if (inserted) set('green');
            
            if (typeof node === 'string') {
                c.write('"' + node.toString().replace(/"/g, '\\"') + '"');
            }
            else if (node instanceof RegExp
            || (typeof node === 'function' && node.name === undefined)) {
                c.write(node.toString());
            }
            else if (typeof node === 'function') {
                c.write(node.name
                    ? '[Function]'
                    : '[Function: ' + node.name + ']'
                );
            }
            else {
                c.write(node.toString());
            }
            
            if (inserted) unset();
        }
    }
    
    return stream;
};
