// MonitoringPoint
// ---------------

// MonitoringPoint extends `Backbone.Model` with accessor methods
// which format the model attributes for use in the view templates.
// If the fields on the model should change, you can just change these
// methods without needing to modify the rest of the application.
'use strict';

module.exports = require('backbone').Model.extend({

	idAttribute: "_uuid",

	// Override the default Backbone `get()` so that `undefined`
	// attributes are returned as 'not_recorded'
	get: function(attr) {
      return this.attributes[attr] || "not_recorded";
    },

    // Should return a [lat, lon] array for the point
    coordinates: function() {
		var coords = this.get("_geolocation");
		coords[0] = parseFloat(coords[0]);
		coords[1] = parseFloat(coords[1]);
		return coords;
    },

	getWhat: function() {
		return this._getOther("happening", "happening_other");
	},

	getImpacts: function() {
		return this._getOther("impacts", "impacts_other");
	},

	// Creates a formatted, readable string for the location
	getLocation: function() {
		var location = this.get("myarea");
		var titleOrExtension = "";

		if (this.get("landtitle") == "yes") {
			titleOrExtension = "land title";
		} else if (this.get("customary") == "yes") {
			titleOrExtension = "extension area";
		}
		location = (location && location !== "other") ? "<em>" + t(location) + "</em> in " : "";
		location += "<em>" + t(this.get("myarea_village")) + "</em> " + titleOrExtension;
		return location;
	},

	getPlacename: function() {
		var placename = this.get("placename");
		if (placename === "not_recorded") placename = this.get("myarea");
		return this._toSentenceCase(placename);
	},

	getWho: function() {
		return this._getOther("people", "people_other");
	},

	getWhen: function() {
		return this.get("today");
	},

	getDate: function() {
		var d = this.get("today").split("-");
		return new Date(d[0], d[1]-1, d[2]);
	},

	getImgUrl: function() {
		if (this.get("_attachments").length === 0) return;
		return 'https://formhub.org/attachment/?media_file=' + this.get("_attachments")[0];
	},

	// Takes a field that is a space-separated list of values, which may include "other"
	// and formats that field together with the "other" field into a comma-separated
	// list of readable text.
	_getOther: function(attr, attr_other) {
		var value = this.get(attr);
		var output = [];

		value.split(" ").forEach(function(v, i) {
			if (v === "other") {
				output[i] = this._toSentenceCase(this.get(attr_other));
			} else {
				output[i] =  t(attr + "." + v);
			}
		}, this);

		return output.join(", ");
	},

	// Converts a string to sentence case
	_toSentenceCase: function(s) {
		s = s || "";
		// Matches the first letter in the string and the first letter that follows a
		// period (and 1 or more spaces) and transforms that letter to uppercase.
		return s.replace(/(^[a-z])|(\.\s*[a-z])/g, function(s) { return s.toUpperCase(); });
	}
});
