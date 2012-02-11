var traverse = require('traverse');
var Stream = require('stream').Stream;
var charm = require('charm');
var deepEqual = require('deep-equal');

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
    
    function equals () {
        
    }
    
    function stringify (node) {
        var prevNode = traverse.get(prev, this.path || []);
        var inserted = prevNode === undefined;
        
        if (Array.isArray(node)) {
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
            var deleted = typeof prevNode === 'object'
                ? Object.keys(prevNode).filter(function (key) {
                    return !Object.hasOwnProperty.call(node, key);
                })
                : []
            ;
                    
            this.before(function () {
                if (inserted) set('green');
                c.write('{');
            });
            
            this.pre(function (x, key) {
                var obj = traverse.get(prev, this.path.concat(key));
                if (obj === undefined) {
                    insertedKey = true;
                    set('green');
                }
                plainStringify(key);
                c.write(':');
            });
            
            this.post(function (child) {
                if (child.isLast && deleted.length) {
                    if (insertedKey) unset();
                    c.write(',');
                }
                else {
                    if (!child.isLast) c.write(',');
                    if (insertedKey) unset();
                }
            });
            
            this.after(function () {
                if (inserted) unset();
                
                if (deleted.length) {
                    set('red');
                    deleted.forEach(function (key) {
                        plainStringify(key);
                        c.write(':');
                        plainStringify(prevNode[key]);
                    });
                    unset();
                }
                
                c.write('}');
            });
        }
        else {
            var changed = false;
            
            if (inserted) set('green');
            else if (!deepEqual(prevNode, node)) {
                changed = true;
                set('blue');
            }
            
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
            
            if (inserted || changed) unset();
        }
    }
    
    function plainStringify (node) {
        if (Array.isArray(node)) {
            this.before(function () { c.write('[') });
            
            this.post(function (child) {
                if (!child.isLast) c.write(',');
            });
            
            this.after(function () { c.write(']') });
        }
        else if (typeof node === 'object'
        && node && typeof node.inspect === 'function') {
            this.block();
            c.write(node.inspect());
        }
        else if (typeof node == 'object') {
            this.before(function () { c.write('{') });
            
            this.pre(function (x, key) {
                stringify(key);
                c.write(':');
            });
            
            this.post(function (child) {
                if (!child.isLast) c.write(',');
            });
            
            this.after(function () { c.write('}') });
        }
        else if (typeof node === 'string') {
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
    }
    
    return stream;
};
