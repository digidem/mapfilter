// MapFilter.Collection
// --------------------

// This collection of models (data records) extends  
// [crossfilter()](http://square.github.io/crossfilter/) 
// to allow fast filtering by different filters / dimensions
'use strict';

var Backbone = require('backbone');
Backbone.$ = $;
var crossfilter = require('crossfilter');

var config = require('../../config.json');
var sync = require('backbone-github')({ githubToken: config.githubToken });

module.exports = Backbone.Collection.extend({

    initialize: function(models, options) {
        // Pass the url endpoint for this collection in the options hash
        if (options.url) this.url = options.url;
        
        // Initialize a new [crossfilter](http://square.github.io/crossfilter/) instance
        this.crossfilter = crossfilter();

        // Stores a reference to each dimension created on the crossfilter
        this.dimensions = [];

        // Crossfilter dimension based on model cid (Backbone's internal id
        // assigned to new models)
        this.dimensionByCid = this.crossfilter.dimension(function(d) {
            return d.cid;
        });

        // This will group models by cid, which is unique, which means that
        // each group will have a count of 0 or 1 depending on whether
        // the model matches the filters set on the other crossfilter dimensions
        this.groupByCid = this.dimensionByCid.group();

        this.resetFilter();
        this.on("change remove reset", this.resetFilter);
        this.on("add firstfetch", this.addToFilter);
    },

    sync: function() {
        return sync.apply(this, arguments);
    },

    // A wrapper for `crossfilter().dimension` which stores a reference
    // to the dimension which allows for the crossfilter to be reset later 
    dimension: function(value) {
        var dimension = this.crossfilter.dimension(value);
        this.dimensions.push(dimension);
        return dimension;
    },

    // Clears the filters on all the dimensions and removes all records
    // and re-adds them (`crossfilter().remove` only removes unfiltered records) 
    resetFilter: function() {
        this.dimensions.forEach(function(dimension) {
            dimension.filterAll();
        });
        this.crossfilter.remove();
        this.addToFilter(this.models);
        return this;
    },

    // Adds either a single model or a collection of models to the crossfilter 
    addToFilter: function(records) {
        if (records instanceof Backbone.Collection)
            records = records.models;
        return this.crossfilter.add(records);
    },

    filteredBounds: function() {
        var bounds = [[], []];

        this.groupByCid.all().forEach(function(d) {
            var coords = this.get(d.key).coordinates();

            if (d.value === 0 || isNaN(coords[0]) || isNaN(coords[1])) return;

            if (bounds[0].length === 0) {
                bounds[0] = coords.slice(0);
                bounds[1] = coords.slice(0);
            } else {
                bounds[0][0] = Math.min(coords[0], bounds[0][0]);
                bounds[0][1] = Math.min(coords[1], bounds[0][1]);
                bounds[1][0] = Math.max(coords[0], bounds[1][0]);
                bounds[1][1] = Math.max(coords[1], bounds[1][1]);
            }
        }, this);

        return bounds;
    }
});
