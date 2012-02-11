var traverse = require('traverse');
var Stream = require('stream').Stream;
var charm = require('charm');
var deepEqual = require('deep-equal');

module.exports = function (opts) {
    return difflet.bind(null, opts);
};

function difflet (opts, prev, next) {
    var stream = new Stream;
    stream.readable = true;
    stream.writable = true;
    stream.write = function (buf) { this.emit('data', buf) };
    stream.end = function () { this.emit('end') };
    
    if (!opts) opts = {};
    if (opts.start === undefined && opts.stop === undefined) {
        var c = charm(stream);
        opts.start = function (type) {
            c.foreground({
                inserted : 'green',
                updated : 'blue',
                deleted : 'red',
            }[type]);
        };
        opts.stop = function (type) {
            c.display('reset');
        };
    }
    var write = opts.write || function (buf) {
        stream.write(buf);
    };
    
    process.nextTick(function () {
        traverse(next).forEach(stringify);
        stream.emit('end');
    });
    
    var levels = 0;
    function set (type) {
        if (levels === 0) opts.start(type, stream);
        levels ++;
    }
    
    function unset (type) {
        if (--levels === 0) opts.stop(type, stream);
    }
    
    function stringify (node) {
        var prevNode = traverse.get(prev, this.path || []);
        var inserted = prevNode === undefined;
        
        if (Array.isArray(node)) {
            this.before(function () {
                if (inserted) set('inserted');
                write('[');
            });
            
            this.post(function (child) {
                if (!child.isLast) write(',');
            });
            
            this.after(function () {
                write(']');
                if (inserted) unset('inserted');
            });
        }
        else if (typeof node === 'object'
        && node && typeof node.inspect === 'function') {
            this.block();
            if (inserted) set('inserted');
            write(node.inspect());
            if (inserted) unset('inserted');
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
                if (inserted) set('inserted');
                write('{');
            });
            
            this.pre(function (x, key) {
                var obj = traverse.get(prev, this.path.concat(key));
                if (obj === undefined) {
                    insertedKey = true;
                    set('inserted');
                }
                plainStringify(key);
                write(':');
            });
            
            this.post(function (child) {
                if (child.isLast && deleted.length) {
                    if (insertedKey) unset('inserted');
                    write(',');
                }
                else {
                    if (!child.isLast) write(',');
                    if (insertedKey) unset('inserted');
                }
            });
            
            this.after(function () {
                if (inserted) unset('inserted');
                
                if (deleted.length) {
                    set('deleted');
                    deleted.forEach(function (key) {
                        plainStringify(key);
                        write(':');
                        plainStringify(prevNode[key]);
                    });
                    unset('deleted');
                }
                
                write('}');
            });
        }
        else {
            var changed = false;
            
            if (inserted) set('inserted');
            else if (!deepEqual(prevNode, node)) {
                changed = true;
                set('updated');
            }
            
            if (typeof node === 'string') {
                write('"' + node.toString().replace(/"/g, '\\"') + '"');
            }
            else if (node instanceof RegExp
            || (typeof node === 'function' && node.name === undefined)) {
                write(node.toString());
            }
            else if (typeof node === 'function') {
                write(node.name
                    ? '[Function]'
                    : '[Function: ' + node.name + ']'
                );
            }
            else {
                write(node.toString());
            }
            
            if (inserted) unset('inserted');
            else if (changed) unset('changed');
        }
    }
    
    function plainStringify (node) {
        if (Array.isArray(node)) {
            this.before(function () { write('[') });
            
            this.post(function (child) {
                if (!child.isLast) write(',');
            });
            
            this.after(function () { write(']') });
        }
        else if (typeof node === 'object'
        && node && typeof node.inspect === 'function') {
            this.block();
            write(node.inspect());
        }
        else if (typeof node == 'object') {
            this.before(function () { write('{') });
            
            this.pre(function (x, key) {
                stringify(key);
                write(':');
            });
            
            this.post(function (child) {
                if (!child.isLast) write(',');
            });
            
            this.after(function () { write('}') });
        }
        else if (typeof node === 'string') {
            write('"' + node.toString().replace(/"/g, '\\"') + '"');
        }
        else if (node instanceof RegExp
        || (typeof node === 'function' && node.name === undefined)) {
            write(node.toString());
        }
        else if (typeof node === 'function') {
            write(node.name
                ? '[Function]'
                : '[Function: ' + node.name + ']'
            );
        }
        else {
            write(node.toString());
        }
    }
    
    return stream;
}
