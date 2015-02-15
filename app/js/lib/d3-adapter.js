/**
 * D3 Adapter 0.1
 * For all details and documentation:
 * http://github.com/akre54/backbone-d3
 *
 * Based on the Backbone Mootools Adapter:
 * http://github.com/inkling/backbone-mootools
 *
 * Copyright 2013 Adam Krebs
 * Copyright 2011 Inkling Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


// This file provides a basic jQuery to d3 Adapter. It allows us to run Backbone.js
// with minimal modifications.
(function(window) {
  'use strict'

  var D3Adapter = function(elements) {
    this.d3Selection = elements.nodeType ?
            d3.select(elements) : d3.selectAll(elements);

    var nodes = this.d3Selection[0];

    this.length = nodes.length;
    _.each(nodes, function(el, i) { this[i] = el; }, this);
  };

  _.extend(D3Adapter.prototype, {

    length: 0,
    d3Selection: null,

    attr: function(map) {
      var ret = this.d3Selection.attr.apply(this.d3Selection, arguments);
      return typeof map == 'object' ? this : ret;
    },

    each: function(cb) {
      var elements = this.toArray();
      for (var i = 0, l = this.length; i < l; i++) {
        cb(this[i], i, elements);
      };
    },

    find: function(selector) {
      return new D3Adapter(this.d3Selection.selectAll(selector)[0]);
    },

    get: function(index) {
      return index == null ?

        // Return a 'clean' array
        this.toArray() :

        // Return just the object
        (index < 0 ? this[this.d3Selection.length + index] : this[index]);
    },

    html: function(htmlString) {
      return this.d3Selection.html.apply(this.d3Selection, arguments);
    },

    has: function(selector) {
      return !!this.d3Selection.select(selector).length;
    },

    // Currently *very* basic. Compares tagNames
    is: function(selector) {
      selector = selector.toLowerCase();
      for (var i = 0, l = this.length; i < l; i++) {
        if (selector !== this[i].tagName.toLowerCase()) return false;
      }
      return true;
    },

    on: function(eventName, selector, method) {
      if (typeof selector == 'function') {
        method = selector;
        selector = null;
      }

      var context = selector ? this.find(selector) : this;
      context.d3Selection.on(eventName, function() {
        method(d3.event);
      });
      return this;
    },

    off: function(eventName) {
      this.d3Selection.on(eventName, null);
      return this;
    },

    remove: function() {
      this.d3Selection.remove();
      return this;
    },

    text: function(text) {
      return this.d3Selection.text.apply(this, arguments);
    },

    toArray: function() {
      return [].slice.call(this);
    },

    trigger: function(eventName) {
      this.each(function(el) {
        var detached, rootEl, evt;

        // fix for broken bubbling: needs to be in the DOM to work. TODO
        if (detached = !document.body.contains(el)) {
          rootEl = el;
          while (rootEl.parentNode) rootEl = rootEl.parentNode;
          document.body.appendChild(rootEl);
        }

        evt = document.createEvent('UIEvents');
        evt.initUIEvent(eventName, true, true, el, 1);
        el.dispatchEvent(evt);

        if (detached) document.body.removeChild(rootEl);
      });

      return this;
    },

    // Alias for this.on
    unbind: function() {
      return this.off.apply(this, arguments);
    }
  });

  // JQuery Selector Methods
  //
  // jQuery(html) - Returns an HTML element wrapped in a D3Adapter.
  // jQuery(expression) - Returns a D3Adapter containing an element set corresponding the
  //     elements selected by the expression.
  // jQuery(expression, context) - Returns a D3Adapter containing an element set corresponding
  //     to applying the expression in the specified context.
  // jQuery(element) - Wraps the provided element in a D3Adapter and returns it.
  //
  // @return D3Adapter an adapter element containing the selected/constructed
  //     elements.
  window.jQuery = window.$ = function(expression, context) {
    var elements;

    // Handle jQuery(html).
    if (typeof expression === 'string') {
      if (expression.charAt(0) === '<' && expression.charAt(expression.length - 1) === '>') {
        var container = document.createElement('div');
        container.innerHTML = expression;
        elements = container.childNodes;

        // handle $('<div>', {attrs})
        if (_.isObject(context)) {
          _.each(elements, function(el) {
            _.extend(el, context);
          });
        }
        return new D3Adapter(elements);
      } else {
        // Handle jQuery(expression) and jQuery(expression, context).
        context = context || document;
        elements = expression;
        return new D3Adapter(elements);
      }
    } else if (typeof expression == 'object') {
      if (expression instanceof D3Adapter) {
        // Handle jQuery(D3Adapter)
        return expression;
      } else {
        // Handle jQuery(element).
        return new D3Adapter(expression);
      }
    }
  };

  // jQuery.ajax
  //
  // Maps a jQuery ajax request to a d3.xhr and sends it.
  window.jQuery.ajax = function(params) {
    _.defaults(params, {
      success: _.identity,
      error: _.identity
    });

    var xhr = d3.xhr(params.url, params.contentType);
    xhr.on('beforesend', params.beforeSend);

    return xhr.send(params.type, params.data, function(error, json) {
      if (error) {
        params.error(error);
      } else {
        params.success(json);
      }
    });
  };

})(window);