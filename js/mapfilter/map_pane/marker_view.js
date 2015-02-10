// MapFilter.MarkerView
// --------------------

// MapFilter MarkerView manages the markers displayed on the map. It should be 
// initialized with a reference to the model and to the map in the options hash
'use strict';

module.exports = require('backbone').View.extend({

    events: {
        "mouseover": "onMouseOver",
        "mouseout": "onMouseOut",
        "click": "onClick"
    },

    // The default icon is an svg icon wrapped in a div
    icon: L.divIcon({
        html: '<svg><g transform="translate(4,4.5)">' +
              '<path class="outline" d="M 17,8 C 17,13 11,21 8.5,23.5 C 6,21 0,13 0,8 C 0,4 4,-0.5 8.5,-0.5 C 13,-0.5 17,4 17,8 z"/>' +
              '<path class="fill" d="M 17,8 C 17,13 11,21 8.5,23.5 C 6,21 0,13 0,8 C 0,4 4,-0.5 8.5,-0.5 C 13,-0.5 17,4 17,8 z"/>' +
              '</g></svg>' +
              '<div class="marker-text"/>',
        iconSize: [25, 34],
        iconAnchor: [25 / 2, 30],
        className: "marker"
    }),

    initialize: function(options) {
        var loc = this.model.coordinates();

        // Sometimes models (monitoring reports) do not have coordinates
        if (!loc[0] || !loc[1]) loc = [0, 0];

        this.appView = options.appView;

        // Create a new marker with the default icon and add to the map
        this.marker = L.marker(loc, {
            icon: this.icon
        }).addTo(options.map);

        // Store a reference the icon div from this view's `el`
        this.setElement(this.marker._icon);
        this.$markerText = this.$(".marker-text");

        // Store a reference to the marker icon on the model - used for info view when printing
        this.model.icon = this.el;

        // Add className from the model's "happening" field
        // **TODO** remove this dependency and color markers from array of colors
        this.$el.addClass(this.model.get("happening"));

        // Reference the marker's current z-index (we change the z-index later
        // when the markers are filtered, so unfiltered markers appear on top)
        this._lastZIndex = this.marker.options.zIndexOffset;
    },

    // TODO: remove/update this 
    render: function() {
        $(".marker-text", this.el).html("");
        this.marker.update();
    },

    // Removes this marker from the map 
    remove: function() {
        this.marker._map.removeLayer(this.marker);
    },

    // When the mouse is over the marker, show the info pane 
    onMouseOver: function(e) {
        e.stopPropagation();
        this.$el.addClass("hover");
        this.appView.infoPane.show({
            model: this.model
        });
    },

    // Hide the infopane when the mouse leaves the marker 
    onMouseOut: function() {
        this.$el.removeClass("hover");
        this.appView.infoPane.hide();
    },

    // When you click the marker, make the infoPane "stick" open
    // until you click on another marker 
    onClick: function(e) {
        e.stopPropagation();
        this.$el.toggleClass("clicked");
        this.appView.infoPane.toggle({
            model: this.model,
            sticky: true,
            iconView: this
        });
    },

    // Shows or 'hides' a marker (hiding actually just reduces opacity
    // and send the marker behind shown markers)
    // `shown` is a boolean for whether the marker should be shown
    show: function(shown, i) {
        if (shown) {
            this.$el.removeClass("filtered");
            this.marker.setZIndexOffset(this._lastZIndex);
            if (typeof i !== "undefined") {
                this.$markerText.html(String.fromCharCode(65 + i));
            }
        } else {
            this.$el.addClass("filtered");
            // Move 'hidden' markers behind the others
            this._lastZIndex = this.marker.options.zIndexOffset;
            this.marker.setZIndexOffset(-99999);
            this.$markerText.html("");
        }
    }
});
