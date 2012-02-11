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
    
    function stringify (node) {
        var inserted = this.path
            ? traverse.get(prev, this.path) === undefined
            : false
        ;
        
        if (Array.isArray(node)) {
            var insertedElem = false;
            
            this.before(function () {
                if (inserted) c.foreground('green');
                c.write('[');
            });
            
            this.post(function (child) {
                if (!child.isLast) c.write(',');
            });
            
            this.after(function () {
                c.write(']');
                if (inserted) c.display('reset');
            });
        }
        else if (typeof node === 'object'
        && node && typeof node.inspect === 'function') {
            this.block();
            if (inserted) c.foreground('green');
            c.write(node.inspect());
            if (inserted) c.display('reset');
        }
        else if (typeof node == 'object') {
            var insertedKey = false;
            
            this.before(function () {
                if (inserted) c.foreground('green');
                c.write('{');
            });
            
            this.pre(function (x, key) {
                if (traverse.get(prev, this.path.concat(key)) === undefined) {
                    insertedKey = true;
                    c.foreground('green');
                }
                stringify(key);
                c.write(':');
            });
            
            this.post(function (child) {
                if (!child.isLast) c.write(',');
                if (insertedKey) c.display('reset');
            });
            
            this.after(function () {
                if (inserted) c.display('reset');
                c.write('}');
            });
        }
        else {
            if (inserted) c.foreground('green');
            
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
            
            if (inserted) c.display('reset');
        }
    }
    
    return stream;
};
