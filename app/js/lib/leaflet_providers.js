(function () {
	'use strict';

	L.TileLayer.Provider = L.TileLayer.extend({
		initialize: function (arg, options) {
			var providers = L.TileLayer.Provider.providers;

			var parts = arg.split('.');

			var providerName = parts[0];
			var variantName = parts[1];

			if (!providers[providerName]) {
				throw 'No such provider (' + providerName + ')';
			}

			var provider = {
				url: providers[providerName].url,
				options: providers[providerName].options
			};

			// overwrite values in provider from variant.
			if (variantName && 'variants' in providers[providerName]) {
				if (!(variantName in providers[providerName].variants)) {
					throw 'No such name in provider (' + variantName + ')';
				}
				var variant = providers[providerName].variants[variantName];
				provider = {
					url: variant.url || provider.url,
					options: L.Util.extend({}, provider.options, variant.options)
				};
			} else if (typeof provider.url === 'function') {
				provider.url = provider.url(parts.splice(1).join('.'));
			}

			// replace attribution placeholders with their values from toplevel provider attribution,
			// recursively
			var attributionReplacer = function (attr) {
				if (attr.indexOf('{attribution.') === -1) {
					return attr;
				}
				return attr.replace(/\{attribution.(\w*)\}/,
					function (match, attributionName) {
						return attributionReplacer(providers[attributionName].options.attribution);
					}
				);
			};
			provider.options.attribution = attributionReplacer(provider.options.attribution);

			// Compute final options combining provider options with any user overrides
			var layerOpts = L.Util.extend({}, provider.options, options);
			L.TileLayer.prototype.initialize.call(this, provider.url, layerOpts);
		}
	});

	/**
	 * Definition of providers.
	 * see http://leafletjs.com/reference.html#tilelayer for options in the options map.
	 */

	//jshint maxlen:220
	L.TileLayer.Provider.providers = {
		
		MapBox: {
			url: function (id) {
				return 'http://{s}.tiles.mapbox.com/v3/' + id + '/{z}/{x}/{y}.png';
			},
			options: {
				attribution:
					'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a> &mdash; ' +
					'Map data {attribution.OpenStreetMap}',
				subdomains: 'abcd'
			}
		},
		
		CloudMade: {
			url: 'http://{s}.tile.cloudmade.com/{apiKey}/{styleID}/256/{z}/{x}/{y}.png',
			options: {
				attribution:
					'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
					'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
					'Map tile imagery © <a href="http://cloudmade.com">CloudMade</a>',
				minZoom: 0,
				apiKey: 'abc', // Sign up for an API key at http://cloudmade.com/ - first 500,000 tile requests are free
				styleID: '1'
			},
			variants: {
				standardResolution: {
					maxZoom: 18
				},
				highResolution: {
					url: 'http://{s}.tile.cloudmade.com/{apiKey}/{styleID}@2x/256/{z}/{x}/{y}.png',
					maxZoom: 19
				}
			}
		}
	};

	L.tileLayer.provider = function (provider, options) {
		return new L.TileLayer.Provider(provider, options);
	};

	L.Control.Layers.Provided = L.Control.Layers.extend({
		initialize: function (base, overlay, options) {
			var first;

			var labelFormatter = function (label) {
				return label.replace(/\./g, ': ').replace(/([a-z])([A-Z])/g, '$1 $2');
			};

			if (base.length) {
				(function () {
					var out = {},
					    len = base.length,
					    i = 0;

					while (i < len) {
						if (typeof base[i] === 'string') {
							if (i === 0) {
								first = L.tileLayer.provider(base[0]);
								out[labelFormatter(base[i])] = first;
							} else {
								out[labelFormatter(base[i])] = L.tileLayer.provider(base[i]);
							}
						}
						i++;
					}
					base = out;
				}());
				this._first = first;
			}

			if (overlay && overlay.length) {
				(function () {
					var out = {},
					    len = overlay.length,
					    i = 0;

					while (i < len) {
						if (typeof base[i] === 'string') {
							out[labelFormatter(overlay[i])] = L.tileLayer.provider(overlay[i]);
						}
						i++;
					}
					overlay = out;
				}());
			}
			L.Control.Layers.prototype.initialize.call(this, base, overlay, options);
		},
		onAdd: function (map) {
			this._first.addTo(map);
			return L.Control.Layers.prototype.onAdd.call(this, map);
		}
	});

	L.control.layers.provided = function (baseLayers, overlays, options) {
		return new L.Control.Layers.Provided(baseLayers, overlays, options);
	};
}());

