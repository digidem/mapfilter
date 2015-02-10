/**
 * Shows a readable description of the current filters in place
 * TODO: Finish this
 */
'use strict';

module.exports = require('backbone').View.extend({

    render: function() {
        this.$el.html("Showing <strong>all activities</strong> by <strong>all monitors</strong> on <strong>all dates</strong>");
        return this;
    },

    constructFilterText: function() {

    }
});
