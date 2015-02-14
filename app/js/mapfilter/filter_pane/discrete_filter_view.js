// MapFilter.DiscreteFilterView
// ----------------------------

// Creates a view to filter the collection by a discrete field
// (i.e. a string value or list of space-separated tags).
// Pass `options.field` with the name of the field/attribute to filter on.
'use strict';

var _ = require('lodash');

module.exports = require('backbone').View.extend({

    events: {
        "click .select_all": "selectAll",
        "click .select_one": "selectOne",
        "click": "updateFilter"
    },

    className: "filter",

    initialize: function(options) {
        var field = this.field = options.field;
        this.$el.attr("id", field);

        // The template a partial are coded into the html
        this.template = JST['discrete-filter'];
        this.checkboxTemplate = JST['checkbox'];


        // `v` is the row in the dataset
        // `p` is `{}` for the first execution (passed from reduceInitial).
        // For every subsequent execution it is the value returned from reduceAdd of the prev row
        function reduceAdd(p, v) {
            v.get(field).split(" ").forEach(function(val) {
                p[val] = (p[val] || 0) + 1; //increment counts
            });
            return p;
        }

        function reduceRemove(p, v) {
            v.get(field).split(" ").forEach(function(val) {
                p[val] -= 1;
            });
            return p;
        }

        // this is how our reduce function is seeded. similar to how inject or fold
        // works in functional languages. this map will contain the final counts
        // by the time we are done reducing our entire data set.
        function reduceInitial() {
            return {};
        }

        // Create a dimension on the field for filtering
        this.dimension = this.collection.dimension(function(d) { return d.get(field); });

        // This reduces the collection down to an object with a key for each
        // unique value of the filter field, with the value as the count
        // of the number of models with that field.
        this.groupAll = this.dimension.groupAll().reduce(reduceAdd, reduceRemove, reduceInitial);

        // When the collection first loads or models change, re-render the filter
        this.listenTo(this.collection, 'firstfetch change', this.render);

        this.render();
    },

    // Renders the template with a list of checkboxes for each value to filter on
    render: function() {
        // If there is no data, noop
        if (!this.dimension.group().size()) return this;

        var checkboxes = [];

        // Create an array of checkboxes for each unique value of the filter field
        _.forEach(this.groupAll.value(), function(v, k) {
            checkboxes.push(this.checkboxTemplate({
                key: k,
                text: t(this.field + "." + k),
                labelClass: (this.field === "happening") ? "label" : "",
                className: "checkbox " + k
            }));
        }, this);

        // Render the filter's template
        this.$el.html(this.template({
            title: t("filters." + this.field),
            checkboxes: checkboxes
        }));

        return this;
    },

    // Select all items in this filter
    selectAll: function() {
        this.$("input").prop("checked", true);
    },

    // Select a single value for this filter and unselect others
    selectOne: function(e) {
        this.$("input").prop("checked", false);
        $(e.target).parents(".checkbox").find("input").prop("checked", true);
    },

    // Update the filter on the collection whenever the selection changes
    updateFilter: function() {
        var selected = [];

        // Create an array of selected values
        this.$("input:checked").each(function() {
            selected.push($(this).attr("value"));
        });

        // Set a filter to match values including lists of
        // space-separated tags
        this.dimension.filter(function(d) {
            return _.intersection(d.split(" "), selected).length ? true : false;
        });

        // Trigger an event on the collection so that other views can
        // update with the new filtered collection
        this.collection.trigger("filtered");
    }
});
