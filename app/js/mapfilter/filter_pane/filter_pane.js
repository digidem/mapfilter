// MapFilter.FilterPane
// --------------------

// The FilterPane shows the list of filters that can be used to explore data.
// It creates a filter view for each filter in the array `options.filters`
// which should have the following properties:
//
// - `field` is the field/attribute to filter by
// - `type` should be `discrete` for string data and `continuous` for numbers or dates
// - `expanded` sets whether the filter view is expanded or collapsed by default
'use strict';

var GraphPane = require('./graph_pane.js');
var ContinuousFilterView = require('./continuous_filter_view.js');
var DiscreteFilterView = require('./discrete_filter_view.js');

module.exports = require('backbone').View.extend({

    events: {
        "click .print-preview": "showPrintPreview"
    },

    initialize: function(options) {
        var filters = options.filters || [];

        // Initialize a graph pane to hold charts for continuous filters
        this.graphPane = new GraphPane({
            collection: this.collection
        });

        // Append the graph parent to this pane's parent
        this.$el.append(this.graphPane.render().el);

        this.$filters = $('<form class="form"/>').appendTo(this.el);

        // Loop through each filter and add a view to the pane
        filters.forEach(function(filter) {
            this.addFilter(filter);
        }, this);

        this.$filters.append(
            '<div>' +
            '<button type="button" class="btn btn-primary print">Print</button> ' +
            '<button type="button" class="btn btn-default print-preview">Print Preview</button>' +
            '</div>');
    },

    // Add a filter on a field to the filter pane.
    addFilter: function(options) {
        var filterView;

        if (!options.field) {
            console.error(t("error.filter_missing"));
            return;
        }

        // Initialize a ContinuousFilterView or DiscreteFilterView
        // ContinousFilterView is linked to the GraphPane which will show
        // the bar chart for selecting ranges of data
        if (options.type === "continuous") {
            filterView = new ContinuousFilterView({
                collection: this.collection,
                field: options.field,
                expanded: options.expanded || false,
                graphPane: this.graphPane
            });
        } else {
            filterView = new DiscreteFilterView({
                collection: this.collection,
                field: options.field,
                expanded: options.expanded || false
            });
        }

        this.$filters.append(filterView.render().el);
    },

    // hide elements
    showPrintPreview: function() {
        $("#map").addClass("hide");
        $("#filter-pane").addClass("hide");
        $("#info-pane").addClass("hide");

        $("#print-header").removeClass("hide");
        $("#print-pages").removeClass("hide");
    }
});
