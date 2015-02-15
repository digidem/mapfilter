'use strict';

var _ = require('lodash');
var MapPane = require('../map_pane/map_pane.js');
var InfoPane = require('../info_pane/info_pane.js');

module.exports = require('backbone').View.extend({

    events: {
        "click .print": "print",
        "click .cancel": "cancel",
        "click input[value=show-large-map]": "showMap",
        "click input[value=show-info]": "showInfo"
    },

    initialize: function(options) {
        this.infoPanesByCid = {};
        this.template = JST['print-pane'];

        this.$el.html(this.template({
            infoPanes: []
        }));

        this.$filterPanesEl = this.$('#info-panes-print');

        this.mapPane = new MapPane({
            el: this.$('#map-print'),
            center: options.center,
            zoom: options.zoom,
            tileUrl: options.tileUrl,
            collection: this.collection,
            bingKey: options.bingKey,
            scrollWheelZoom: false
        });


        this.listenTo(this.collection, "firstfetch filtered", this.render);
        // this.$el.append(this.infoPrintView.render().el);
    },

    render: function() {
        this.mapPane.map.invalidateSize();
        // Change map bounds if any records are currently filtered
        if (this.collection.dimensionByCid.groupAll().value())
            this.mapPane.map.fitBounds(this.collection.filteredBounds());

        this.$filterPanesEl.html("");

        this.collection.groupByCid.all().forEach(function(d) {
            var cid = d.key,
                model = this.collection.get(cid);

            // Only show info for unfiltered records
            if (d.value > 0) {
                var infoPane = this.infoPanesByCid[cid] || new InfoPane({
                    className: "info-print-view",
                    model: model
                }).render();

                infoPane.$(".map-icon").html($(model.icon).html());
                infoPane.$(".map-icon").addClass($(model.icon).attr("class"));

                this.infoPanesByCid[cid] = infoPane;
                this.$filterPanesEl.append(infoPane.el);
            }
        }, this);
    },

    print: function() {
        window.stop();
        window.print();
        this.cancel();
    },

    cancel: function() {
        $("#map").removeClass("hide");
        $("#filter-pane").removeClass("hide");
        $("#info-pane").removeClass("hide");

        $("#print-header").addClass("hide");
        $("#print-pages").addClass("hide");
    },

    showMap: function() {
        this.$(".first-page").toggle();
    },

    showInfo: function() {
        this.$filterPanesEl.toggle();
    }
});
