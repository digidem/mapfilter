(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Backbone sync adapter to use js-git as storage
 * Version 0.0.0
 *
 * https://github.com/digidem/Backbone.js-git
 * (c) 2014 Gregor MacLennan / Digital Democracy
 *
 * Backbone.js-git may be freely distributed under the MIT license
 */

(function(root) {
    'use strict';

    var concurrentConnections = 10;

    var BackboneGithub;
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = BackboneGithub ;
    } 

    if (typeof window !== 'undefined') {
        BackboneGithub = root.BackboneGithub = {};
    }

    // Require Underscore, if we're on the server, and it's not already present.
    var _ = root._;
    if (!_ && (typeof require === 'function')) {
        _ = require('underscore');
    }

    var Backbone = root.Backbone;
    if (!Backbone && (typeof require === 'function')) {
        Backbone = require('backbone');
    }

    var q;
    // Require async queue, if we're on the server, and it's not already present.
    if (!root.async && (typeof require === 'function')) {
        q = require('queue-from-async')(syncWorker, concurrentConnections);
    } else {
        q = async.queue(syncWorker, concurrentConnections);
    }

    // Pause the queue until we have initialized the IndexedDb cache
    q.pause();

    var indexedDbCache = require('js-git/mixins/indexed-db');

    indexedDbCache.init(function() {
        q.resume();
    });

    // cache for repo connections
    var repos = {};

    // inspired from https://github.com/Raynos/xtend
    function extend() {
        var target = {};

        for (var i = 0; i < arguments.length; i++) {
            var source = arguments[i];

            if (typeof source !== 'object') {
                continue;
            }

            for (var name in source) {
                if (source[name] && target[name] && typeof source[name] === 'object' && typeof target[name] === 'object' && name !== 'db') {
                    target[name] = extend(target[name] || {}, source[name]);
                } else {
                    target[name] = source[name];
                }
            }
        }
        return target;
    }

    // This provides symbolic names for the octal modes used by git trees.
    var modes = require('js-git/lib/modes');

    var githubNameRe = /https:\/\/github\.com\/(.+?\/.+?)\//;
    var githubRefRe = /https:\/\/github\.com\/.+?\/.+?\/tree\/(.+?)\//;

    // backbone-github sync adapter
    BackboneGithub.sync = function(defaults) {
        defaults = defaults || {};

        // ensure we have a github API token
        if (!defaults.githubToken) {
            throw new Error('A "githubToken" property must be specified');
        }

        return function adapter(method, model, options) {

            options = options || {};
            options = extend(defaults, model && model.github || {}, options);

            var githubName = _.result(model, 'url').match(githubNameRe);
            githubName = (githubName && githubName[1]) || options.user + "/" + options.repo;

            var repo = getRepo(githubName, options.githubToken);

            q.push({
                method: method,
                model: model,
                repo: repo,
                options: options
            }, function(err, data) {
                if (err) return options.error(err);
                return options.success(data);
            });
        };
    };

    function syncWorker(data, callback) {
        var model = data.model,
            repo = data.repo;

        var collection = (model instanceof Backbone.Collection) ? model : model.collection;

        var branch = _.result(collection, 'url').match(githubRefRe);
        branch = (branch && branch[1]) || options.branch || 'master';

        // *TODO* no handling of tags yet
        var ref = 'refs/heads/' + branch;

        if (data.method === 'read') {
            if (model instanceof Backbone.Collection) {
                findAll();
            } else {
                find();
            }
            if (model.trigger) model.trigger('request', model, null, data.options);
        } else {
            callback('Only "read" supported at this stage');
        }

        function find() {
            var collectionId = _.result(collection, 'url').split('/').pop();
            var filename = model.id + '.json';
            getTree(collectionId, function(err, tree) {
                if (!tree[filename]) return callback('model not found');
                repo.loadAs("text", tree[filename].hash, function(err, json) {
                    callback(err, JSON.parse(json));
                });
            });
        }

        function findAll() {
            var error,
                models = [],
                count = 0,
                collectionId = _.result(collection, 'url').split('/').pop();

            function onModelLoad(err, model) {
                if (err) {
                    error = err;
                    models.push(undefined);
                } else {
                    models.push(model);
                }
                if (models.length + 1 === count) callback(error, models);
            }

            getTree(collectionId, function(err, tree) {
                var taskData;
                for (var entry in tree) {
                    if (tree.hasOwnProperty(entry) && entry.match(/\.json$/) && tree[entry].mode === modes.file) {
                        count += 1;
                        taskData = _.extend({}, data, {
                            model: {
                                id: entry.replace('.json', ''),
                                collection: model
                            }
                        });
                        q.push(taskData, onModelLoad);
                    }
                }
            });
        }

        function getTree(collectionId, callback) {
            repo.readRef(ref, loadTree);

            function loadTree(err, hash) {
                if (err) return callback(err);
                repo.loadAs('commit', hash, function(err, commit) {
                    repo.loadAs('tree', commit.tree, function(err, tree) {
                        if (!tree[collectionId]) callback('Collection not found');
                        repo.loadAs('tree', tree[collectionId].hash, function(err, tree) {
                            callback(err, tree);
                        });
                    });
                });
            }
        }
    }

    function getRepo(githubName, githubToken) {
        // return cached repo object if it exists
        if (repos[githubName]) return repos[githubName];

        var repo = {};

        // Mixin the main library using github to provide the following:
        // - repo.loadAs(type, hash) => value
        // - repo.saveAs(type, value) => hash
        // - repo.readRef(ref) => hash
        // - repo.updateRef(ref, hash) => hash
        // - repo.createTree(entries) => hash
        // - repo.hasHash(hash) => has
        require('js-github/mixins/github-db')(repo, githubName, githubToken);

        // Github has this built-in, but it's currently very buggy so we replace with
        // the manual implementation in js-git.
        require('js-git/mixins/create-tree')(repo);

        var localRepoCache = {};

        indexedDbCache(localRepoCache, githubName);

        // Cache github objects locally in indexeddb
        require('js-git/mixins/add-cache')(repo, localRepoCache);

        // Cache references in indexeddb
        require('js-git-ref-cache')(repo, localRepoCache);

        // Cache everything except blobs over 100 bytes in memory.
        // This makes path-to-hash lookup a sync operation in most cases.
        // require('js-git/mixins/mem-cache')(repo);

        // Combine concurrent read requests for the same hash
        require('js-git/mixins/read-combiner')(repo);

        // Add in value formatting niceties.  Also adds text and array types.
        require('js-git/mixins/formats')(repo);

        repos[githubName] = repo;

        return repo;
    }
}(window));

},{"backbone":undefined,"js-git-ref-cache":3,"js-git/lib/modes":4,"js-git/mixins/add-cache":6,"js-git/mixins/create-tree":7,"js-git/mixins/formats":8,"js-git/mixins/indexed-db":9,"js-git/mixins/read-combiner":10,"js-github/mixins/github-db":14,"queue-from-async":undefined,"underscore":undefined}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
module.exports = function addRefCache(repo, cache) {
  "use strict";

  var memCache = {};
  var ttl = 60000;
  var readRef = repo.readRef;
  if (readRef) repo.readRef = readRefCached;
  var updateRef = repo.updateRef;
  if (updateRef) repo.updateRef = updateRefCached;

  function readRefCached(ref, callback) {
    // First check whether we have cached the ref in memory
    var hash = readMemCache(ref);
    if (hash) return callback(null, hash);

    // Check ref in origin repo
    readRef.call(repo, ref, onReadRef);

    function onReadRef(err, hash) {
      if (err) {
        // If there is a problem connecting to the origin repo
        // then read the reference in the cache
        cache.readRef(ref, callback);
      } else {
        // If we do get the ref, cache it.
        memCache[ref] = {
          hash: hash,
          timestamp: Date.now()
        };
        cache.updateRef(ref, hash, function(err) {
          callback(err, hash);
        });
      }
    }
  }

  // This serves to rate limit requests to the server for the same hash
  function readMemCache(ref) {
    if (!memCache[ref]) return;
    var age = Date.now() - memCache[ref].timestamp;
    if (age < ttl) return memCache[ref].hash;
    return;
  }

  function updateRefCached(ref, hash, callback) {
    updateRef.call(repo, ref, hash, onUpdateRef);

    function onUpdateRef(err) {
      if (err) return callback(err);
      // Update the cache to match the remote
      memCache[ref] = {
        hash: hash,
        timestamp: Date.now()
      };
      cache.updateRef(ref, hash, callback);
    }
  }
};

},{}],4:[function(require,module,exports){
// Not strict mode because it uses octal literals all over.
module.exports = {
  isBlob: function (mode) {
    return (mode & 0140000) === 0100000;
  },
  isFile: function (mode) {
    return (mode & 0160000) === 0100000;
  },
  toType: function (mode) {
    if (mode === 0160000) return "commit";
    if (mode ===  040000) return "tree";
    if ((mode & 0140000) === 0100000) return "blob";
    return "unknown";
  },
  tree:    040000,
  blob:   0100644,
  file:   0100644,
  exec:   0100755,
  sym:    0120000,
  commit: 0160000
};

},{}],5:[function(require,module,exports){
"use strict";
var bodec = require('bodec');
var modes = require('./modes');

// (body) -> raw-buffer
var encoders = exports.encoders = {
  blob: encodeBlob,
  tree: encodeTree,
  commit: encodeCommit,
  tag: encodeTag
};

  // ({type:type, body:raw-buffer}) -> buffer
exports.frame = frame;

// (raw-buffer) -> body
var decoders = exports.decoders ={
  blob: decodeBlob,
  tree: decodeTree,
  commit: decodeCommit,
  tag: decodeTag
};

// (buffer) -> {type:type, body:raw-buffer}
exports.deframe = deframe;

// Export git style path sort in case it's wanted.
exports.treeMap = treeMap;
exports.treeSort = treeSort;

function encodeBlob(body) {
  if (!bodec.isBinary(body)) throw new TypeError("Blobs must be binary values");
  return body;
}

function treeMap(key) {
  /*jshint validthis:true*/
  var entry = this[key];
  return {
    name: key,
    mode: entry.mode,
    hash: entry.hash
  };
}

function treeSort(a, b) {
  var aa = (a.mode === modes.tree) ? a.name + "/" : a.name;
  var bb = (b.mode === modes.tree) ? b.name + "/" : b.name;
  return aa > bb ? 1 : aa < bb ? -1 : 0;
}

function encodeTree(body) {
  var tree = "";
  if (Array.isArray(body)) throw new TypeError("Tree must be in object form");
  var list = Object.keys(body).map(treeMap, body).sort(treeSort);
  for (var i = 0, l = list.length; i < l; i++) {
    var entry = list[i];
    tree += entry.mode.toString(8) + " " + bodec.encodeUtf8(entry.name) +
            "\0" + bodec.decodeHex(entry.hash);
  }
  return bodec.fromRaw(tree);
}

function encodeTag(body) {
  var str = "object " + body.object +
    "\ntype " + body.type +
    "\ntag " + body.tag +
    "\ntagger " + formatPerson(body.tagger) +
    "\n\n" + body.message;
  return bodec.fromUnicode(str);
}

function encodeCommit(body) {
  var str = "tree " + body.tree;
  for (var i = 0, l = body.parents.length; i < l; ++i) {
    str += "\nparent " + body.parents[i];
  }
  str += "\nauthor " + formatPerson(body.author) +
         "\ncommitter " + formatPerson(body.committer) +
         "\n\n" + body.message;
  return bodec.fromUnicode(str);
}


function formatPerson(person) {
  return safe(person.name) +
    " <" + safe(person.email) + "> " +
    formatDate(person.date);
}

function safe(string) {
  return string.replace(/(?:^[\.,:;<>"']+|[\0\n<>]+|[\.,:;<>"']+$)/gm, "");
}

function two(num) {
  return (num < 10 ? "0" : "") + num;
}

function formatDate(date) {
  var seconds, offset;
  if (date.seconds) {
    seconds = date.seconds;
    offset = date.offset;
  }
  // Also accept Date instances
  else {
    seconds = Math.floor(date.getTime() / 1000);
    offset = date.getTimezoneOffset();
  }
  var neg = "+";
  if (offset <= 0) offset = -offset;
  else neg = "-";
  offset = neg + two(Math.floor(offset / 60)) + two(offset % 60);
  return seconds + " " + offset;
}

function frame(obj) {
  var type = obj.type;
  var body = obj.body;
  if (!bodec.isBinary(body)) body = encoders[type](body);
  return bodec.join([
    bodec.fromRaw(type + " " + body.length + "\0"),
    body
  ]);
}

function decodeBlob(body) {
  return body;
}

function decodeTree(body) {
  var i = 0;
  var length = body.length;
  var start;
  var mode;
  var name;
  var hash;
  var tree = {};
  while (i < length) {
    start = i;
    i = indexOf(body, 0x20, start);
    if (i < 0) throw new SyntaxError("Missing space");
    mode = parseOct(body, start, i++);
    start = i;
    i = indexOf(body, 0x00, start);
    name = bodec.toUnicode(body, start, i++);
    hash = bodec.toHex(body, i, i += 20);
    tree[name] = {
      mode: mode,
      hash: hash
    };
  }
  return tree;
}

function decodeCommit(body) {
  var i = 0;
  var start;
  var key;
  var parents = [];
  var commit = {
    tree: "",
    parents: parents,
    author: "",
    committer: "",
    message: ""
  };
  while (body[i] !== 0x0a) {
    start = i;
    i = indexOf(body, 0x20, start);
    if (i < 0) throw new SyntaxError("Missing space");
    key = bodec.toRaw(body, start, i++);
    start = i;
    i = indexOf(body, 0x0a, start);
    if (i < 0) throw new SyntaxError("Missing linefeed");
    var value = bodec.toUnicode(body, start, i++);
    if (key === "parent") {
      parents.push(value);
    }
    else {
      if (key === "author" || key === "committer") {
        value = decodePerson(value);
      }
      commit[key] = value;
    }
  }
  i++;
  commit.message = bodec.toUnicode(body, i, body.length);
  return commit;
}

function decodeTag(body) {
  var i = 0;
  var start;
  var key;
  var tag = {};
  while (body[i] !== 0x0a) {
    start = i;
    i = indexOf(body, 0x20, start);
    if (i < 0) throw new SyntaxError("Missing space");
    key = bodec.toRaw(body, start, i++);
    start = i;
    i = indexOf(body, 0x0a, start);
    if (i < 0) throw new SyntaxError("Missing linefeed");
    var value = bodec.toUnicode(body, start, i++);
    if (key === "tagger") value = decodePerson(value);
    tag[key] = value;
  }
  i++;
  tag.message = bodec.toUnicode(body, i, body.length);
  return tag;
}

function decodePerson(string) {
  var match = string.match(/^([^<]*) <([^>]*)> ([^ ]*) (.*)$/);
  if (!match) throw new Error("Improperly formatted person string");
  return {
    name: match[1],
    email: match[2],
    date: {
      seconds: parseInt(match[3], 10),
      offset: parseInt(match[4], 10) / 100 * -60
    }
  };
}

function deframe(buffer, decode) {
  var space = indexOf(buffer, 0x20);
  if (space < 0) throw new Error("Invalid git object buffer");
  var nil = indexOf(buffer, 0x00, space);
  if (nil < 0) throw new Error("Invalid git object buffer");
  var body = bodec.slice(buffer, nil + 1);
  var size = parseDec(buffer, space + 1, nil);
  if (size !== body.length) throw new Error("Invalid body length.");
  var type = bodec.toRaw(buffer, 0, space);
  return {
    type: type,
    body: decode ? decoders[type](body) : body
  };
}

function indexOf(buffer, byte, i) {
  i |= 0;
  var length = buffer.length;
  for (;;i++) {
    if (i >= length) return -1;
    if (buffer[i] === byte) return i;
  }
}

function parseOct(buffer, start, end) {
  var val = 0;
  while (start < end) {
    val = (val << 3) + buffer[start++] - 0x30;
  }
  return val;
}

function parseDec(buffer, start, end) {
  var val = 0;
  while (start < end) {
    val = val * 10 + buffer[start++] - 0x30;
  }
  return val;
}

},{"./modes":4,"bodec":11}],6:[function(require,module,exports){
"use strict";

module.exports = addCache;
function addCache(repo, cache) {
  var loadAs = repo.loadAs;
  if (loadAs) repo.loadAs = loadAsCached;
  var saveAs = repo.saveAs;
  if (saveAs) repo.saveAs = saveAsCached;
  var createTree = repo.createTree;
  if (createTree) repo.createTree = createTreeCached;

  function loadAsCached(type, hash, callback) {
    // Next check in disk cache...
    cache.loadAs(type, hash, onCacheLoad);

    function onCacheLoad(err, value) {
      if (err) return callback(err);
      // ...and return if it's there.
      if (value !== undefined) {
        return callback(null, value, hash);
      }

      // Otherwise load from real data source...
      loadAs.call(repo, type, hash, onLoad);
    }

    function onLoad(err, value) {
      if (value === undefined) return callback(err);

      // Store it on disk too...
      // Force the hash to prevent mismatches.
      cache.saveAs(type, value, onSave, hash);

      function onSave(err) {
        if (err) return callback(err);
        // Finally return the value to caller.
        callback(null, value, hash);
      }
    }
  }

  function saveAsCached(type, value, callback) {
    saveAs.call(repo, type, value, onSave);

    function onSave(err, hash) {
      if (err) return callback(err);
      // Store in disk, forcing hash to match.
      cache.saveAs(type, value, callback, hash);
    }
  }

  function createTreeCached(entries, callback) {
    createTree.call(repo, entries, onTree);

    function onTree(err, hash, tree) {
      if (err) return callback(err);
      cache.saveAs("tree", tree, callback, hash);
    }
  }

}

},{}],7:[function(require,module,exports){
"use strict";

var modes = require('../lib/modes.js');

module.exports = function (repo) {
  repo.createTree = createTree;

  function createTree(entries, callback) {
    if (!callback) return createTree.bind(null, entries);
    callback = singleCall(callback);
    if (!Array.isArray(entries)) {
      entries = Object.keys(entries).map(function (path) {
        var entry = entries[path];
        entry.path = path;
        return entry;
      });
    }

    // Tree paths that we need loaded
    var toLoad = {};
    function markTree(path) {
      while(true) {
        if (toLoad[path]) return;
        toLoad[path] = true;
        trees[path] = {
          add: [],
          del: [],
          tree: {}
        };
        if (!path) break;
        path = path.substring(0, path.lastIndexOf("/"));
      }
    }

    // Commands to run organized by tree path
    var trees = {};

    // Counter for parallel I/O operations
    var left = 1; // One extra counter to protect again zalgo cache callbacks.

    // First pass, stubs out the trees structure, sorts adds from deletes,
    // and saves any inline content blobs.
    entries.forEach(function (entry) {
      var index = entry.path.lastIndexOf("/");
      var parentPath = entry.path.substr(0, index);
      var name = entry.path.substr(index + 1);
      markTree(parentPath);
      var tree = trees[parentPath];
      var adds = tree.add;
      var dels = tree.del;

      if (!entry.mode) {
        dels.push(name);
        return;
      }
      var add = {
        name: name,
        mode: entry.mode,
        hash: entry.hash
      };
      adds.push(add);
      if (entry.hash) return;
      left++;
      repo.saveAs("blob", entry.content, function (err, hash) {
        if (err) return callback(err);
        add.hash = hash;
        check();
      });
    });

    // Preload the base trees
    if (entries.base) loadTree("", entries.base);

    // Check just in case there was no IO to perform
    check();

    function loadTree(path, hash) {
      left++;
      delete toLoad[path];
      repo.loadAs("tree", hash, function (err, tree) {
        if (err) return callback(err);
        trees[path].tree = tree;
        Object.keys(tree).forEach(function (name) {
          var childPath = path ? path + "/" + name : name;
          if (toLoad[childPath]) loadTree(childPath, tree[name].hash);
        });
        check();
      });
    }

    function check() {
      if (--left) return;
      findLeaves().forEach(processLeaf);
    }

    function processLeaf(path) {
      var entry = trees[path];
      delete trees[path];
      var tree = entry.tree;
      entry.del.forEach(function (name) {
        delete tree[name];
      });
      entry.add.forEach(function (item) {
        tree[item.name] = {
          mode: item.mode,
          hash: item.hash
        };
      });
      left++;
      repo.saveAs("tree", tree, function (err, hash, tree) {
        if (err) return callback(err);
        if (!path) return callback(null, hash, tree);
        var index = path.lastIndexOf("/");
        var parentPath = path.substring(0, index);
        var name = path.substring(index + 1);
        trees[parentPath].add.push({
          name: name,
          mode: modes.tree,
          hash: hash
        });
        if (--left) return;
        findLeaves().forEach(processLeaf);
      });
    }

    function findLeaves() {
      var paths = Object.keys(trees);
      var parents = {};
      paths.forEach(function (path) {
        if (!path) return;
        var parent = path.substring(0, path.lastIndexOf("/"));
        parents[parent] = true;
      });
      return paths.filter(function (path) {
        return !parents[path];
      });
    }
  }
};

function singleCall(callback) {
  var done = false;
  return function () {
    if (done) return console.warn("Discarding extra callback");
    done = true;
    return callback.apply(this, arguments);
  };
}

},{"../lib/modes.js":4}],8:[function(require,module,exports){
"use strict";

var bodec = require('bodec');
var treeMap = require('../lib/object-codec').treeMap;

module.exports = function (repo) {
  var loadAs = repo.loadAs;
  repo.loadAs = newLoadAs;
  var saveAs = repo.saveAs;
  repo.saveAs = newSaveAs;

  function newLoadAs(type, hash, callback) {
    if (!callback) return newLoadAs.bind(repo, type, hash);
    var realType = type === "text" ? "blob":
                   type === "array" ? "tree" : type;
    return loadAs.call(repo, realType, hash, onLoad);

    function onLoad(err, body, hash) {
      if (body === undefined) return callback(err);
      if (type === "text") body = bodec.toUnicode(body);
      if (type === "array") body = toArray(body);
      return callback(err, body, hash);
    }
  }

  function newSaveAs(type, body, callback) {
    if (!callback) return newSaveAs.bind(repo, type, body);
    type = type === "text" ? "blob":
           type === "array" ? "tree" : type;
    if (type === "blob") {
      if (typeof body === "string") {
        body = bodec.fromUnicode(body);
      }
    }
    else if (type === "tree") {
      body = normalizeTree(body);
    }
    else if (type === "commit") {
      body = normalizeCommit(body);
    }
    else if (type === "tag") {
      body = normalizeTag(body);
    }
    return saveAs.call(repo, type, body, callback);
  }

};

function toArray(tree) {
  return Object.keys(tree).map(treeMap, tree);
}

function normalizeTree(body) {
  var type = body && typeof body;
  if (type !== "object") {
    throw new TypeError("Tree body must be array or object");
  }
  var tree = {}, i, l, entry;
  // If array form is passed in, convert to object form.
  if (Array.isArray(body)) {
    for (i = 0, l = body.length; i < l; i++) {
      entry = body[i];
      tree[entry.name] = {
        mode: entry.mode,
        hash: entry.hash
      };
    }
  }
  else {
    var names = Object.keys(body);
    for (i = 0, l = names.length; i < l; i++) {
      var name = names[i];
      entry = body[name];
      tree[name] = {
        mode: entry.mode,
        hash: entry.hash
      };
    }
  }
  return tree;
}

function normalizeCommit(body) {
  if (!body || typeof body !== "object") {
    throw new TypeError("Commit body must be an object");
  }
  if (!(body.tree && body.author && body.message)) {
    throw new TypeError("Tree, author, and message are required for commits");
  }
  var parents = body.parents || (body.parent ? [ body.parent ] : []);
  if (!Array.isArray(parents)) {
    throw new TypeError("Parents must be an array");
  }
  var author = normalizePerson(body.author);
  var committer = body.committer ? normalizePerson(body.committer) : author;
  return {
    tree: body.tree,
    parents: parents,
    author: author,
    committer: committer,
    message: body.message
  };
}

function normalizeTag(body) {
  if (!body || typeof body !== "object") {
    throw new TypeError("Tag body must be an object");
  }
  if (!(body.object && body.type && body.tag && body.tagger && body.message)) {
    throw new TypeError("Object, type, tag, tagger, and message required");
  }
  return {
    object: body.object,
    type: body.type,
    tag: body.tag,
    tagger: normalizePerson(body.tagger),
    message: body.message
  };
}

function normalizePerson(person) {
  if (!person || typeof person !== "object") {
    throw new TypeError("Person must be an object");
  }
  if (!person.name || !person.email) {
    throw new TypeError("Name and email are required for person fields");
  }
  return {
    name: person.name,
    email: person.email,
    date: person.date || new Date()
  };
}

},{"../lib/object-codec":5,"bodec":11}],9:[function(require,module,exports){
"use strict";
/*global indexedDB*/

var codec = require('../lib/object-codec.js');
var sha1 = require('git-sha1');
var modes = require('../lib/modes.js');
var db;

mixin.init = init;

mixin.loadAs = loadAs;
mixin.saveAs = saveAs;
module.exports = mixin;

function init(callback) {

  db = null;
  var request = indexedDB.open("tedit", 1);

  // We can only create Object stores in a versionchange transaction.
  request.onupgradeneeded = function(evt) {
    var db = evt.target.result;

    if (evt.dataLoss && evt.dataLoss !== "none") {
      return callback(new Error(evt.dataLoss + ": " + evt.dataLossMessage));
    }

    // A versionchange transaction is started automatically.
    evt.target.transaction.onerror = onError;

    if(db.objectStoreNames.contains("objects")) {
      db.deleteObjectStore("objects");
    }
    if(db.objectStoreNames.contains("refs")) {
      db.deleteObjectStore("refs");
    }

    db.createObjectStore("objects", {keyPath: "hash"});
    db.createObjectStore("refs", {keyPath: "path"});
  };

  request.onsuccess = function (evt) {
    db = evt.target.result;
    callback();
  };
  request.onerror = onError;
}


function mixin(repo, prefix) {
  if (!prefix) throw new Error("Prefix required");
  repo.refPrefix = prefix;
  repo.saveAs = saveAs;
  repo.loadAs = loadAs;
  repo.readRef = readRef;
  repo.updateRef = updateRef;
  repo.hasHash = hasHash;
}

function onError(evt) {
  console.error("error", evt.target.error);
}

function saveAs(type, body, callback, forcedHash) {
  if (!callback) return saveAs.bind(this, type, body);
  var hash;
  try {
    var buffer = codec.frame({type:type,body:body});
    hash = forcedHash || sha1(buffer);
  }
  catch (err) { return callback(err); }
  var trans = db.transaction(["objects"], "readwrite");
  var store = trans.objectStore("objects");
  var entry = { hash: hash, type: type, body: body };
  var request = store.put(entry);
  request.onsuccess = function() {
    // console.warn("SAVE", type, hash);
    callback(null, hash, body);
  };
  request.onerror = function(evt) {
    callback(new Error(evt.value));
  };
}

function loadAs(type, hash, callback) {
  if (!callback) return loadAs.bind(this, type, hash);
  loadRaw(hash, function (err, entry) {
    if (!entry) return callback(err);
    if (type !== entry.type) {
      return callback(new TypeError("Type mismatch"));
    }
    callback(null, entry.body, hash);
  });
}

function loadRaw(hash, callback) {
  var trans = db.transaction(["objects"], "readwrite");
  var store = trans.objectStore("objects");
  var request = store.get(hash);
  request.onsuccess = function(evt) {
    var entry = evt.target.result;
    if (!entry) return callback();
    return callback(null, entry);
  };
  request.onerror = function(evt) {
    callback(new Error(evt.value));
  };
}

function hasHash(hash, callback) {
  if (!callback) return hasHash.bind(this, hash);
  loadRaw(hash, function (err, body) {
    if (err) return callback(err);
    return callback(null, !!body);
  });
}

function readRef(ref, callback) {
  if (!callback) return readRef.bind(this, ref);
  var key = this.refPrefix + "/" + ref;
  var trans = db.transaction(["refs"], "readwrite");
  var store = trans.objectStore("refs");
  var request = store.get(key);
  request.onsuccess = function(evt) {
    var entry = evt.target.result;
    if (!entry) return callback();
    callback(null, entry.hash);
  };
  request.onerror = function(evt) {
    callback(new Error(evt.value));
  };
}

function updateRef(ref, hash, callback) {
  if (!callback) return updateRef.bind(this, ref, hash);
  var key = this.refPrefix + "/" + ref;
  var trans = db.transaction(["refs"], "readwrite");
  var store = trans.objectStore("refs");
  var entry = { path: key, hash: hash };
  var request = store.put(entry);
  request.onsuccess = function() {
    callback();
  };
  request.onerror = function(evt) {
    callback(new Error(evt.value));
  };
}

},{"../lib/modes.js":4,"../lib/object-codec.js":5,"git-sha1":12}],10:[function(require,module,exports){
"use strict";

// This replaces loadAs with a version that batches concurrent requests for
// the same hash.
module.exports = function (repo) {
  var pendingReqs = {};

  var loadAs = repo.loadAs;
  repo.loadAs = newLoadAs;

  function newLoadAs(type, hash, callback) {
    if (!callback) return newLoadAs.bind(null, type, hash);
    var list = pendingReqs[hash];
    if (list) {
      if (list.type !== type) callback(new Error("Type mismatch"));
      else list.push(callback);
      return;
    }
    list = pendingReqs[hash] = [callback];
    list.type = type;
    loadAs.call(repo, type, hash, function () {
      delete pendingReqs[hash];
      for (var i = 0, l = list.length; i < l; i++) {
        list[i].apply(this, arguments);
      }
    });
  }
};

},{}],11:[function(require,module,exports){
(function (process){
"use strict";
/*global escape, unescape*/

var isNode = typeof process === 'object' &&
             typeof process.versions === 'object' &&
             process.versions.node &&
             process.__atom_type !== "renderer";

if (isNode) {
  var nodeRequire = require; // Prevent mine.js from seeing this require
  module.exports = nodeRequire('./bodec-node.js');
}
else {

  // This file must be served with UTF-8 encoding for the utf8 codec to work.
  module.exports = {
    Binary: Uint8Array,
    // Utility functions
    isBinary: isBinary,
    create: create,
    join: join,

    // Binary input and output
    copy: copy,
    slice: slice,

    // String input and output
    toRaw: toRaw,
    fromRaw: fromRaw,
    toUnicode: toUnicode,
    fromUnicode: fromUnicode,
    toHex: toHex,
    fromHex: fromHex,
    toBase64: toBase64,
    fromBase64: fromBase64,

    // Array input and output
    toArray: toArray,
    fromArray: fromArray,

    // Raw <-> Hex-encoded codec
    decodeHex: decodeHex,
    encodeHex: encodeHex,

    decodeBase64: decodeBase64,
    encodeBase64: encodeBase64,

    // Unicode <-> Utf8-encoded-raw codec
    encodeUtf8: encodeUtf8,
    decodeUtf8: decodeUtf8,

    // Hex <-> Nibble codec
    nibbleToCode: nibbleToCode,
    codeToNibble: codeToNibble
  };
}

function isBinary(value) {
  return value &&
      typeof value === "object" &&
      value instanceof Uint8Array || value.constructor.name === "Uint8Array";
}

function create(length) {
  return new Uint8Array(length);
}

function join(chunks) {
  var length = chunks.length;
  var total = 0;
  for (var i = 0; i < length; i++) {
    total += chunks[i].length;
  }
  var binary = create(total);
  var offset = 0;
  for (i = 0; i < length; i++) {
    var chunk = chunks[i];
    copy(chunk, binary, offset);
    offset += chunk.length;
  }
  return binary;
}

function slice(binary, start, end) {
  if (end === undefined) {
    end = binary.length;
    if (start === undefined) start = 0;
  }
  return binary.subarray(start, end);
}

function copy(source, binary, offset) {
  var length = source.length;
  if (offset === undefined) {
    offset = 0;
    if (binary === undefined) binary = create(length);
  }
  for (var i = 0; i < length; i++) {
    binary[i + offset] = source[i];
  }
  return binary;
}

// Like slice, but encode as a hex string
function toHex(binary, start, end) {
  var hex = "";
  if (end === undefined) {
    end = binary.length;
    if (start === undefined) start = 0;
  }
  for (var i = start; i < end; i++) {
    var byte = binary[i];
    hex += String.fromCharCode(nibbleToCode(byte >> 4)) +
           String.fromCharCode(nibbleToCode(byte & 0xf));
  }
  return hex;
}

// Like copy, but decode from a hex string
function fromHex(hex, binary, offset) {
  var length = hex.length / 2;
  if (offset === undefined) {
    offset = 0;
    if (binary === undefined) binary = create(length);
  }
  var j = 0;
  for (var i = 0; i < length; i++) {
    binary[offset + i] = (codeToNibble(hex.charCodeAt(j++)) << 4)
                       |  codeToNibble(hex.charCodeAt(j++));
  }
  return binary;
}

function toBase64(binary, start, end) {
  return btoa(toRaw(binary, start, end));
}

function fromBase64(base64, binary, offset) {
  return fromRaw(atob(base64), binary, offset);
}

function nibbleToCode(nibble) {
  nibble |= 0;
  return (nibble + (nibble < 10 ? 0x30 : 0x57))|0;
}

function codeToNibble(code) {
  code |= 0;
  return (code - ((code & 0x40) ? 0x57 : 0x30))|0;
}

function toUnicode(binary, start, end) {
  return decodeUtf8(toRaw(binary, start, end));
}

function fromUnicode(unicode, binary, offset) {
  return fromRaw(encodeUtf8(unicode), binary, offset);
}

function decodeHex(hex) {
  var j = 0, l = hex.length;
  var raw = "";
  while (j < l) {
    raw += String.fromCharCode(
       (codeToNibble(hex.charCodeAt(j++)) << 4)
      | codeToNibble(hex.charCodeAt(j++))
    );
  }
  return raw;
}

function encodeHex(raw) {
  var hex = "";
  var length = raw.length;
  for (var i = 0; i < length; i++) {
    var byte = raw.charCodeAt(i);
    hex += String.fromCharCode(nibbleToCode(byte >> 4)) +
           String.fromCharCode(nibbleToCode(byte & 0xf));
  }
  return hex;
}

function decodeBase64(base64) {
  return atob(base64);
}

function encodeBase64(raw) {
  return btoa(raw);
}

function decodeUtf8(utf8) {
  return decodeURIComponent(escape(utf8));
}

function encodeUtf8(unicode) {
  return unescape(encodeURIComponent(unicode));
}

function toRaw(binary, start, end) {
  var raw = "";
  if (end === undefined) {
    end = binary.length;
    if (start === undefined) start = 0;
  }
  for (var i = start; i < end; i++) {
    raw += String.fromCharCode(binary[i]);
  }
  return raw;
}

function fromRaw(raw, binary, offset) {
  var length = raw.length;
  if (offset === undefined) {
    offset = 0;
    if (binary === undefined) binary = create(length);
  }
  for (var i = 0; i < length; i++) {
    binary[offset + i] = raw.charCodeAt(i);
  }
  return binary;
}

function toArray(binary, start, end) {
  if (end === undefined) {
    end = binary.length;
    if (start === undefined) start = 0;
  }
  var length = end - start;
  var array = new Array(length);
  for (var i = 0; i < length; i++) {
    array[i] = binary[i + start];
  }
  return array;
}

function fromArray(array, binary, offset) {
  var length = array.length;
  if (offset === undefined) {
    offset = 0;
    if (binary === undefined) binary = create(length);
  }
  for (var i = 0; i < length; i++) {
    binary[offset + i] = array[i];
  }
  return binary;
}

}).call(this,require('_process'))
},{"_process":2}],12:[function(require,module,exports){
(function (process){
"use strict";

var isNode = typeof process === 'object' &&
             typeof process.versions === 'object' &&
             process.versions.node &&
             process.__atom_type !== "renderer";

var shared, create, crypto;
if (isNode) {
  var nodeRequire = require; // Prevent mine.js from seeing this require
  crypto = nodeRequire('crypto');
  create = createNode;
}
else {
  shared = new Uint32Array(80);
  create = createJs;
}


// Input chunks must be either arrays of bytes or "raw" encoded strings
module.exports = function sha1(buffer) {
  if (buffer === undefined) return create(false);
  var shasum = create(true);
  shasum.update(buffer);
  return shasum.digest();
};

// Use node's openssl bindings when available
function createNode() {
  var shasum = crypto.createHash('sha1');
  return {
    update: function (buffer) {
      return shasum.update(buffer);
    },
    digest: function () {
      return shasum.digest('hex');
    }
  };
}

// A pure JS implementation of sha1 for non-node environments.
function createJs(sync) {
  var h0 = 0x67452301;
  var h1 = 0xEFCDAB89;
  var h2 = 0x98BADCFE;
  var h3 = 0x10325476;
  var h4 = 0xC3D2E1F0;
  // The first 64 bytes (16 words) is the data chunk
  var block, offset = 0, shift = 24;
  var totalLength = 0;
  if (sync) block = shared;
  else block = new Uint32Array(80);

  return { update: update, digest: digest };

  // The user gave us more data.  Store it!
  function update(chunk) {
    if (typeof chunk === "string") return updateString(chunk);
    var length = chunk.length;
    totalLength += length * 8;
    for (var i = 0; i < length; i++) {
      write(chunk[i]);
    }
  }

  function updateString(string) {
    var length = string.length;
    totalLength += length * 8;
    for (var i = 0; i < length; i++) {
      write(string.charCodeAt(i));
    }
  }


  function write(byte) {
    block[offset] |= (byte & 0xff) << shift;
    if (shift) {
      shift -= 8;
    }
    else {
      offset++;
      shift = 24;
    }
    if (offset === 16) processBlock();
  }

  // No more data will come, pad the block, process and return the result.
  function digest() {
    // Pad
    write(0x80);
    if (offset > 14 || (offset === 14 && shift < 24)) {
      processBlock();
    }
    offset = 14;
    shift = 24;

    // 64-bit length big-endian
    write(0x00); // numbers this big aren't accurate in javascript anyway
    write(0x00); // ..So just hard-code to zero.
    write(totalLength > 0xffffffffff ? totalLength / 0x10000000000 : 0x00);
    write(totalLength > 0xffffffff ? totalLength / 0x100000000 : 0x00);
    for (var s = 24; s >= 0; s -= 8) {
      write(totalLength >> s);
    }

    // At this point one last processBlock() should trigger and we can pull out the result.
    return toHex(h0) +
           toHex(h1) +
           toHex(h2) +
           toHex(h3) +
           toHex(h4);
  }

  // We have a full block to process.  Let's do it!
  function processBlock() {
    // Extend the sixteen 32-bit words into eighty 32-bit words:
    for (var i = 16; i < 80; i++) {
      var w = block[i - 3] ^ block[i - 8] ^ block[i - 14] ^ block[i - 16];
      block[i] = (w << 1) | (w >>> 31);
    }

    // log(block);

    // Initialize hash value for this chunk:
    var a = h0;
    var b = h1;
    var c = h2;
    var d = h3;
    var e = h4;
    var f, k;

    // Main loop:
    for (i = 0; i < 80; i++) {
      if (i < 20) {
        f = d ^ (b & (c ^ d));
        k = 0x5A827999;
      }
      else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      }
      else if (i < 60) {
        f = (b & c) | (d & (b | c));
        k = 0x8F1BBCDC;
      }
      else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }
      var temp = (a << 5 | a >>> 27) + f + e + k + (block[i]|0);
      e = d;
      d = c;
      c = (b << 30 | b >>> 2);
      b = a;
      a = temp;
    }

    // Add this chunk's hash to result so far:
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;

    // The block is now reusable.
    offset = 0;
    for (i = 0; i < 16; i++) {
      block[i] = 0;
    }
  }

  function toHex(word) {
    var hex = "";
    for (var i = 28; i >= 0; i -= 4) {
      hex += ((word >> i) & 0xf).toString(16);
    }
    return hex;
  }

}

}).call(this,require('_process'))
},{"_process":2}],13:[function(require,module,exports){
(function (process){
"use strict";

var isNode = typeof process === 'object' &&
             typeof process.versions === 'object' &&
             process.versions.node &&
             process.__atom_type !== "renderer";

// Node.js https module
if (isNode) {
  var nodeRequire = require; // Prevent mine.js from seeing this require
  module.exports = nodeRequire('./xhr-node.js');
}

// Browser XHR
else {
  module.exports = function (root, accessToken) {
    var timeout = 2000;
    return request;

    function request(method, url, body, callback) {
      if (typeof body === "function") {
        callback = body;
        body = undefined;
      }
      else if (!callback) return request.bind(null, method, url, body);
      url = url.replace(":root", root);
      var done = false;
      var json;
      var xhr = new XMLHttpRequest();
      xhr.timeout = timeout;
      xhr.open(method, 'https://api.github.com' + url, true);
      xhr.setRequestHeader("Authorization", "token " + accessToken);
      if (body) {
        try { json = JSON.stringify(body); }
        catch (err) { return callback(err); }
      }
      xhr.ontimeout = onTimeout;
      xhr.onerror = function() {
        callback(new Error("Error requesting " + url));
      };
      xhr.onreadystatechange = onReadyStateChange;
      xhr.send(json);

      function onReadyStateChange() {
        if (done) return;
        if (xhr.readyState !== 4) return;
        // Give onTimeout a chance to run first if that's the reason status is 0.
        if (!xhr.status) return setTimeout(onReadyStateChange, 0);
        done = true;
        var response = {message:xhr.responseText};
        if (xhr.responseText){
          try { response = JSON.parse(xhr.responseText); }
          catch (err) {}
        }
        xhr.body = response;
        return callback(null, xhr, response);
      }

      function onTimeout() {
        if (done) return;
        if (timeout < 8000) {
          timeout *= 2;
          return request(method, url, body, callback);
        }
        done = true;
        callback(new Error("Timeout requesting " + url));
      }
    }
  };
}

}).call(this,require('_process'))
},{"_process":2}],14:[function(require,module,exports){
"use strict";

var modes = require('js-git/lib/modes');
var xhr = require('../lib/xhr');
var bodec = require('bodec');
var sha1 = require('git-sha1');
var frame = require('js-git/lib/object-codec').frame;

var modeToType = {
  "040000": "tree",
  "100644": "blob",  // normal file
  "100755": "blob",  // executable file
  "120000": "blob",  // symlink
  "160000": "commit" // gitlink
};

var encoders = {
  commit: encodeCommit,
  tag: encodeTag,
  tree: encodeTree,
  blob: encodeBlob
};

var decoders = {
  commit: decodeCommit,
  tag: decodeTag,
  tree: decodeTree,
  blob: decodeBlob,
};

var typeCache = {};

// Precompute hashes for empty blob and empty tree since github won't
var empty = bodec.create(0);
var emptyBlob = sha1(frame({ type: "blob", body: empty }));
var emptyTree = sha1(frame({ type: "tree", body: empty }));

// Implement the js-git object interface using github APIs
module.exports = function (repo, root, accessToken) {

  var apiRequest = xhr(root, accessToken);

  repo.loadAs = loadAs;         // (type, hash) -> value, hash
  repo.saveAs = saveAs;         // (type, value) -> hash, value
  repo.readRef = readRef;       // (ref) -> hash
  repo.updateRef = updateRef;   // (ref, hash) -> hash
  repo.createTree = createTree; // (entries) -> hash, tree
  repo.hasHash = hasHash;

  function loadAs(type, hash, callback) {
    if (!callback) return loadAs.bind(repo, type, hash);
    // Github doesn't like empty trees, but we know them already.
    if (type === "tree" && hash === emptyTree) return callback(null, {}, hash);
    apiRequest("GET", "/repos/:root/git/" + type + "s/" + hash, onValue);

    function onValue(err, xhr, result) {
      if (err) return callback(err);
      if (xhr.status < 200 || xhr.status >= 500) {
        return callback(new Error("Invalid HTTP response: " + xhr.statusCode + " " + result.message));
      }
      if (xhr.status >= 300 && xhr.status < 500) return callback();
      var body;
      try { body = decoders[type].call(repo, result); }
      catch (err) { return callback(err); }
      if (hashAs(type, body) !== hash) {
        if (fixDate(type, body, hash)) console.log(type + " repaired", hash);
        else console.warn("Unable to repair " + type, hash);
      }
      typeCache[hash] = type;
      return callback(null, body, hash);
    }
  }

  function hasHash(hash, callback) {
    if (!callback) return hasHash.bind(repo, hash);
    var type = typeCache[hash];
    var types = type ? [type] : ["tag", "commit", "tree", "blob"];
    start();
    function start() {
      type = types.pop();
      if (!type) return callback(null, false);
      apiRequest("GET", "/repos/:root/git/" + type + "s/" + hash, onValue);
    }

    function onValue(err, xhr, result) {
      if (err) return callback(err);
      if (xhr.status < 200 || xhr.status >= 500) {
        return callback(new Error("Invalid HTTP response: " + xhr.statusCode + " " + result.message));
      }
      if (xhr.status >= 300 && xhr.status < 500) return start();
      typeCache[hash] = type;
      callback(null, true);
    }
  }

  function saveAs(type, body, callback) {
    if (!callback) return saveAs.bind(repo, type, body);
    var hash;
    try {
      hash = hashAs(type, body);
    }
    catch (err) {
      return callback(err);
    }
    typeCache[hash] = type;
    repo.hasHash(hash, function (err, has) {
      if (err) return callback(err);
      if (has) return callback(null, hash, body);

      var request;
      try {
        request = encoders[type](body);
      }
      catch (err) {
        return callback(err);
      }

      // Github doesn't allow creating empty trees.
      if (type === "tree" && request.tree.length === 0) {
        return callback(null, emptyTree, body);
      }
      return apiRequest("POST", "/repos/:root/git/" + type + "s", request, onWrite);

    });

    function onWrite(err, xhr, result) {
      if (err) return callback(err);
      if (xhr.status < 200 || xhr.status >= 300) {
        return callback(new Error("Invalid HTTP response: " + xhr.status + " " + result.message));
      }
      return callback(null, result.sha, body);
    }
  }

  // Create a tree with optional deep paths and create new blobs.
  // Entries is an array of {mode, path, hash|content}
  // Also deltas can be specified by setting entries.base to the hash of a tree
  // in delta mode, entries can be removed by specifying just {path}
  function createTree(entries, callback) {
    if (!callback) return createTree.bind(repo, entries);
    var toDelete = entries.base && entries.filter(function (entry) {
      return !entry.mode;
    }).map(function (entry) {
      return entry.path;
    });
    var toCreate = entries.filter(function (entry) {
      return bodec.isBinary(entry.content);
    });

    if (!toCreate.length) return next();
    var done = false;
    var left = entries.length;
    toCreate.forEach(function (entry) {
      repo.saveAs("blob", entry.content, function (err, hash) {
        if (done) return;
        if (err) {
          done = true;
          return callback(err);
        }
        delete entry.content;
        entry.hash = hash;
        left--;
        if (!left) next();
      });
    });

    function next(err) {
      if (err) return callback(err);
      if (toDelete && toDelete.length) {
        return slowUpdateTree(entries, toDelete, callback);
      }
      return fastUpdateTree(entries, callback);
    }
  }

  function fastUpdateTree(entries, callback) {
    var request = { tree: entries.map(mapTreeEntry) };
    if (entries.base) request.base_tree = entries.base;

    apiRequest("POST", "/repos/:root/git/trees", request, onWrite);

    function onWrite(err, xhr, result) {
      if (err) return callback(err);
      if (xhr.status < 200 || xhr.status >= 300) {
        return callback(new Error("Invalid HTTP response: " + xhr.status + " " + result.message));
      }
      return callback(null, result.sha, decoders.tree(result));
    }
  }

  // Github doesn't support deleting entries via the createTree API, so we
  // need to manually create those affected trees and modify the request.
  function slowUpdateTree(entries, toDelete, callback) {
    callback = singleCall(callback);
    var root = entries.base;

    var left = 0;

    // Calculate trees that need to be re-built and save any provided content.
    var parents = {};
    toDelete.forEach(function (path) {
      var parentPath = path.substr(0, path.lastIndexOf("/"));
      var parent = parents[parentPath] || (parents[parentPath] = {
        add: {}, del: []
      });
      var name = path.substr(path.lastIndexOf("/") + 1);
      parent.del.push(name);
    });
    var other = entries.filter(function (entry) {
      if (!entry.mode) return false;
      var parentPath = entry.path.substr(0, entry.path.lastIndexOf("/"));
      var parent = parents[parentPath];
      if (!parent) return true;
      var name = entry.path.substr(entry.path.lastIndexOf("/") + 1);
      if (entry.hash) {
        parent.add[name] = {
          mode: entry.mode,
          hash: entry.hash
        };
        return false;
      }
      left++;
      repo.saveAs("blob", entry.content, function(err, hash) {
        if (err) return callback(err);
        parent.add[name] = {
          mode: entry.mode,
          hash: hash
        };
        if (!--left) onParents();
      });
      return false;
    });
    if (!left) onParents();

    function onParents() {
      Object.keys(parents).forEach(function (parentPath) {
        left++;
        // TODO: remove this dependency on pathToEntry
        repo.pathToEntry(root, parentPath, function (err, entry) {
          if (err) return callback(err);
          var tree = entry.tree;
          var commands = parents[parentPath];
          commands.del.forEach(function (name) {
            delete tree[name];
          });
          for (var name in commands.add) {
            tree[name] = commands.add[name];
          }
          repo.saveAs("tree", tree, function (err, hash, tree) {
            if (err) return callback(err);
            other.push({
              path: parentPath,
              hash: hash,
              mode: modes.tree
            });
            if (!--left) {
              other.base = entries.base;
              if (other.length === 1 && other[0].path === "") {
                return callback(null, hash, tree);
              }
              fastUpdateTree(other, callback);
            }
          });
        });
      });
    }
  }


  function readRef(ref, callback) {
    if (!callback) return readRef.bind(repo, ref);
    if (ref === "HEAD") ref = "refs/heads/master";
    if (!(/^refs\//).test(ref)) {
      return callback(new TypeError("Invalid ref: " + ref));
    }
    return apiRequest("GET", "/repos/:root/git/" + ref, onRef);

    function onRef(err, xhr, result) {
      if (err) return callback(err);
      if (xhr.status === 404) return callback();
      if (xhr.status < 200 || xhr.status >= 300) {
        return callback(new Error("Invalid HTTP response: " + xhr.status + " " + result.message));
      }
      return callback(null, result.object.sha);
    }
  }

  function updateRef(ref, hash, callback, force) {
    if (!callback) return updateRef.bind(repo, ref, hash);
    if (!(/^refs\//).test(ref)) {
      return callback(new Error("Invalid ref: " + ref));
    }
    return apiRequest("PATCH", "/repos/:root/git/" + ref, {
      sha: hash,
      force: !!force
    }, onResult);

    function onResult(err, xhr, result) {
      if (err) return callback(err);
      if (xhr.status === 422 && result.message === "Reference does not exist") {
        return apiRequest("POST", "/repos/:root/git/refs", {
          ref: ref,
          sha: hash
        }, onResult);
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        return callback(new Error("Invalid HTTP response: " + xhr.status + " " + result.message));
      }
      if (err) return callback(err);
      callback(null, hash);
    }

  }

};

// GitHub has a nasty habit of stripping whitespace from messages and losing
// the timezone.  This information is required to make our hashes match up, so
// we guess it by mutating the value till the hash matches.
// If we're unable to match, we will just force the hash when saving to the cache.
function fixDate(type, value, hash) {
  if (type !== "commit" && type !== "tag") return;
  // Add up to 3 extra newlines and try all 30-minutes timezone offsets.
  var clone = JSON.parse(JSON.stringify(value));
  for (var x = 0; x < 3; x++) {
    for (var i = -720; i < 720; i += 30) {
      if (type === "commit") {
        clone.author.date.offset = i;
        clone.committer.date.offset = i;
      }
      else if (type === "tag") {
        clone.tagger.date.offset = i;
      }
      if (hash !== hashAs(type, clone)) continue;
      // Apply the changes and return.
      value.message = clone.message;
      if (type === "commit") {
        value.author.date.offset = clone.author.date.offset;
        value.committer.date.offset = clone.committer.date.offset;
      }
      else if (type === "tag") {
        value.tagger.date.offset = clone.tagger.date.offset;
      }
      return true;
    }
    clone.message += "\n";
  }
  return false;
}

function mapTreeEntry(entry) {
  if (!entry.mode) throw new TypeError("Invalid entry");
  var mode = modeToString(entry.mode);
  var item = {
    path: entry.path,
    mode: mode,
    type: modeToType[mode]
  };
  // Magic hash for empty file since github rejects empty contents.
  if (entry.content === "") entry.hash = emptyBlob;

  if (entry.hash) item.sha = entry.hash;
  else item.content = entry.content;
  return  item;
}

function encodeCommit(commit) {
  var out = {};
  out.message = commit.message;
  out.tree = commit.tree;
  if (commit.parents) out.parents = commit.parents;
  else if (commit.parent) out.parents = [commit.parent];
  else commit.parents = [];
  if (commit.author) out.author = encodePerson(commit.author);
  if (commit.committer) out.committer = encodePerson(commit.committer);
  return out;
}

function encodeTag(tag) {
  return {
    tag: tag.tag,
    message: tag.message,
    object: tag.object,
    tagger: encodePerson(tag.tagger)
  };
}

function encodePerson(person) {
  return {
    name: person.name,
    email: person.email,
    date: encodeDate(person.date)
  };
}

function encodeTree(tree) {
  return {
    tree: Object.keys(tree).map(function (name) {
      var entry = tree[name];
      var mode = modeToString(entry.mode);
      return {
        path: name,
        mode: mode,
        type: modeToType[mode],
        sha: entry.hash
      };
    })
  };
}

function encodeBlob(blob) {
  if (typeof blob === "string") return {
    content: bodec.encodeUtf8(blob),
    encoding: "utf-8"
  };
  if (bodec.isBinary(blob)) return {
    content: bodec.toBase64(blob),
    encoding: "base64"
  };
  throw new TypeError("Invalid blob type, must be binary or string");
}

function modeToString(mode) {
  var string = mode.toString(8);
  // Github likes all modes to be 6 chars long
  if (string.length === 5) string = "0" + string;
  return string;
}

function decodeCommit(result) {
  return {
    tree: result.tree.sha,
    parents: result.parents.map(function (object) {
      return object.sha;
    }),
    author: pickPerson(result.author),
    committer: pickPerson(result.committer),
    message: result.message
  };
}

function decodeTag(result) {
  return {
    object: result.object.sha,
    type: result.object.type,
    tag: result.tag,
    tagger: pickPerson(result.tagger),
    message: result.message
  };
}

function decodeTree(result) {
  var tree = {};
  result.tree.forEach(function (entry) {
    tree[entry.path] = {
      mode: parseInt(entry.mode, 8),
      hash: entry.sha
    };
  });
  return tree;
}

function decodeBlob(result) {
  if (result.encoding === 'base64') {
    return bodec.fromBase64(result.content.replace(/\n/g, ''));
  }
  if (result.encoding === 'utf-8') {
    return bodec.fromUtf8(result.content);
  }
  throw new Error("Unknown blob encoding: " + result.encoding);
}

function pickPerson(person) {
  return {
    name: person.name,
    email: person.email,
    date: parseDate(person.date)
  };
}

function parseDate(string) {
  // TODO: test this once GitHub adds timezone information
  var match = string.match(/(-?)([0-9]{2}):([0-9]{2})$/);
  var date = new Date(string);
  var timezoneOffset = 0;
  if (match) {
    timezoneOffset = (match[1] === "-" ? 1 : -1) * (
      parseInt(match[2], 10) * 60 + parseInt(match[3], 10)
    );
  }
  return {
    seconds: date.valueOf() / 1000,
    offset: timezoneOffset
  };
}

function encodeDate(date) {
  var seconds = date.seconds - (date.offset) * 60;
  var d = new Date(seconds * 1000);
  var string = d.toISOString();
  var hours = (date.offset / 60)|0;
  var minutes = date.offset % 60;
  string = string.substring(0, string.lastIndexOf(".")) +
    (date.offset > 0 ? "-" : "+") +
    twoDigit(hours) + ":" + twoDigit(minutes);
  return string;
}

// Run some quick unit tests to make sure date encoding works.
[
  { offset: 300, seconds: 1401938626 },
  { offset: 400, seconds: 1401938626 }
].forEach(function (date) {
  var verify = parseDate(encodeDate(date));
  if (verify.seconds !== date.seconds || verify.offset !== date.offset) {
    throw new Error("Verification failure testing date encoding");
  }
});

function twoDigit(num) {
  if (num < 10) return "0" + num;
  return "" + num;
}

function singleCall(callback) {
  var done = false;
  return function () {
    if (done) return console.warn("Discarding extra callback");
    done = true;
    return callback.apply(this, arguments);
  };
}

function hashAs(type, body) {
  var buffer = frame({type: type, body: body});
  return sha1(buffer);
}

},{"../lib/xhr":13,"bodec":15,"git-sha1":16,"js-git/lib/modes":17,"js-git/lib/object-codec":18}],15:[function(require,module,exports){
module.exports=require(11)
},{"/Users/gregor/Dropbox/Dev/DdDev/backbone-github/node_modules/js-git/node_modules/bodec/bodec.js":11,"_process":2}],16:[function(require,module,exports){
module.exports=require(12)
},{"/Users/gregor/Dropbox/Dev/DdDev/backbone-github/node_modules/js-git/node_modules/git-sha1/git-sha1.js":12,"_process":2}],17:[function(require,module,exports){
module.exports=require(4)
},{"/Users/gregor/Dropbox/Dev/DdDev/backbone-github/node_modules/js-git/lib/modes.js":4}],18:[function(require,module,exports){
module.exports=require(5)
},{"./modes":17,"/Users/gregor/Dropbox/Dev/DdDev/backbone-github/node_modules/js-git/lib/object-codec.js":5,"bodec":15}]},{},[1]);
