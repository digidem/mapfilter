// MapFilter.ContinuousFilterView
// ------------------------------

// The ContinuousFilterView is used for filtering via date or integer fields.
// **TODO** currently only supports date fields.
// It shows the currently selected range and the GraphPane which displays
// a barchart that allows a filter range to be selected.
MapFilter.ContinuousFilterView = Backbone.View.extend({

    events: {
        "click .select_range": "showGraphPane"
    },

    className: 'filter',

    // Pass the `options.field` to filter by, and a reference to the GraphPane
    // with `options.graphPane`
    initialize: function(options) {
        this.field = options.field;
        this.graphPane = options.graphPane;
        this.$el.attr("id", this.field);
        this.format = d3.time.format("%d %b %Y");

        this.template = _.template($("#template-continuous-filter").html());
        this.dimension = this.collection.dimension(function(d) { return new Date(d.attributes[options.field]); });
        this.group = this.dimension.group(d3.time.day);
        this.listenTo(this.collection, "filtered firstfetch", this.render);
    },

    // Simply renders the template and sets the view element html.
    render: function() {
        if (!this.dimension.top(1).length) return this;

        var startDate = this.format(this.dimension.bottom(1)[0].getDate()),
            endDate = this.format(this.dimension.top(1)[0].getDate());

        this.$el.html(this.template({
            filterRange: startDate + " &mdash; " + endDate
        }));
        return this;
    },

    showGraphPane: function(e) {
        e.stopPropagation();
        this.graphPane.open();
    }
});
