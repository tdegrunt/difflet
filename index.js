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
    var commaFirst = opts.comma === 'first';
    var indent = opts.indent;
    
    var stringify = function (node) {
        return stringifier.call(this, true, node);
    };
    var plainStringify = function (node) {
        return stringifier.call(this, false, node);
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
    
    function stringifier (insertable, node) {
        if (insertable) {
            var prevNode = traverse.get(prev, this.path || []);
        }
        var inserted = insertable && prevNode === undefined;
        
        var indentx = indent && Array(
            ((this.path || []).length + 1) * indent + 1
        ).join(' ');
        if (commaFirst) indentx = indentx.slice(indent);
        
        if (Array.isArray(node)) {
            this.before(function () {
                if (inserted) set('inserted');
                if (indent && commaFirst) {
                    if ((this.path || []).length === 0
                    || Array.isArray(this.parent.node)) {
                        write('[ ');
                    }
                    else write('\n' + indentx + '[ ');
                }
                else if (indent) {
                    write('[\n' + indentx);
                }
                else {
                    write('[');
                }
            });
            
            this.post(function (child) {
                if (!child.isLast) {
                    if (indent && commaFirst) {
                        write('\n' + indentx + ', ');
                    }
                    else if (indent) {
                        write(',\n' + indentx);
                    }
                    else write(',');
                }
            });
            
            this.after(function () {
                if (indent && commaFirst) write('\n' + indentx);
                else if (indent) write('\n' + indentx.slice(indent));
                
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
            var deleted = insertable && typeof prevNode === 'object'
                ? Object.keys(prevNode).filter(function (key) {
                    return !Object.hasOwnProperty.call(node, key);
                })
                : []
            ;
            
            this.before(function () {
                if (inserted) set('inserted');
                write(indent && commaFirst && !this.isRoot
                    ? '\n' + indentx + '{ '
                    : '{'
                );
            });
            
            this.pre(function (x, key) {
                if (insertable) {
                    var obj = traverse.get(prev, this.path.concat(key));
                    if (obj === undefined) {
                        insertedKey = true;
                        set('inserted');
                    }
                }
                
                if (indent && !commaFirst) write('\n' + indentx);
                
                plainStringify(key);
                write(indent ? ' : ' : ':');
            });
            
            this.post(function (child) {
                if (child.isLast && deleted.length) {
                    if (insertedKey) unset('inserted');
                    insertedKey = false;
                    
                    if (indent && commaFirst) {
                        write('\n' + indentx + ', ')
                    }
                    else if (indent) write(',\n' + indentx)
                    else write(',');
                }
                else {
                    if (!child.isLast) {
                        if (indent && commaFirst) {
                            write('\n' + indentx + ', ');
                        }
                        else write(',');
                    }
                    if (insertedKey) unset('inserted');
                    insertedKey = false;
                }
            });
            
            this.after(function () {
                if (inserted) unset('inserted');
                
                if (deleted.length) {
                    if (indent && !commaFirst
                    && Object.keys(node).length === 0) {
                        write('\n' + indentx);
                    }
                    
                    set('deleted');
                    deleted.forEach(function (key, ix) {
                        plainStringify(key);
                        write(indent ? ' : ' : ':');
                        plainStringify(prevNode[key]);
                        
                        var last = ix === deleted.length - 1;
                        if (insertable && !last) {
                            if (indent && commaFirst) {
                                write('\n' + indentx + ', ');
                            }
                            else if (indent) {
                                write(',\n' + indentx);
                            }
                            else write(',');
                        }
                    });
                    unset('deleted');
                }
                
                if (commaFirst && indent) {
                    write(indentx.slice(indent) + ' }');
                }
                else if (indent) {
                    write('\n' + indentx.slice(indent) + '}');
                }
                else write('}');
            });
        }
        else {
            var changed = false;
            
            if (inserted) set('inserted');
            else if (insertable && !deepEqual(prevNode, node)) {
                changed = true;
                set('updated');
            }
            
            if (typeof node === 'string') {
                write('"' + node.toString().replace(/"/g, '\\"') + '"');
            }
            else if (isRegExp(node)) {
                write(node.toString());
            }
            else if (typeof node === 'function') {
                write(node.name
                    ? '[Function: ' + node.name + ']'
                    : '[Function]'
                );
            }
            else {
                write(node.toString());
            }
            
            if (inserted) unset('inserted');
            else if (changed) unset('updated');
        }
    }
    
    return stream;
}

function isRegExp (node) {
    return node instanceof RegExp || (node
        && typeof node.test === 'function' 
        && typeof node.exec === 'function'
        && typeof node.compile === 'function'
        && node.constructor && node.constructor.name === 'RegExp'
    );
}
