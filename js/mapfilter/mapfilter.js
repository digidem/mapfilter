'use strict';

var Collection = require('./collection.js');
var MonitoringPoint = require('./monitoring_point.js');
var AppView = require('./appview.js');

module.exports = window.mapFilter = function(options) {

    var appView = new AppView({

        el: options.el,

        collection: new Collection(void 0, {
                        model: MonitoringPoint,
                        url: options.url,
                        comparator: 'start'
                    }),

        filters: options.filters,

        // Initial map center point (TODO: set this & zoom based on data bounds)
        mapCenter: [2.6362, -59.4801],

        // Initial map zoom
        mapZoom: 10,

        tileUrl: options.tileUrl,

        bingKey: options.bingKey
    });

    return appView;
};