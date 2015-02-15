// taken from https://github.com/mWater/offline-leaflet-map/blob/master/src/OfflineLayer.coffee#L156

// get tile ids for lat long range -> get time images
module.exports = tileCoordsForMap

function tileCoordsForMap(map) {
  var data = _getTileImages(map)
  var array = []
  for (key in data) {
    var pos = data[key]
    array.push([pos.x, pos.y, pos.z])
  }
  return array
}

// disect this
function _getTileImages(map) {
  var arrayLength, bounds, i, j, map, maxX, maxY, minX, minY, point, roundedTileBounds, startingZoom, tileBounds, tileImagesToQuery, tileSize, tilesInScreen, x, y, _i, _j, _k, _ref, _ref1, _ref2, _ref3;

  tileImagesToQuery = {};
  zoomLevelLimit = 14 //map.getMaxZoom()
  startingZoom = 9 //map.getZoom();
  bounds = map.getPixelBounds();
  tileSize = 256 //_getTileSize();

  // bounds are rounded down since a tile cover all the pixels from it's rounded down value until the next tile
  roundedTileBounds = L.bounds(
    bounds.min.divideBy(tileSize)._floor(),
    bounds.max.divideBy(tileSize)._floor()
  );

  tilesInScreen = [];
  for (y = roundedTileBounds.min.y, maxY = roundedTileBounds.max.y; y <= maxY; y++) {
    for (x = roundedTileBounds.min.x, maxX = roundedTileBounds.max.x; x <= maxX; x++) {
      tilesInScreen.push(new L.Point(x, y));
    }
  }

  // We will use the exact bound values to test if sub tiles are still inside these bounds.
  // The idea is to avoid caching images outside the screen.
  tileBounds = L.bounds(
    bounds.min.divideBy(tileSize),
    bounds.max.divideBy(tileSize)
  );

  minY = tileBounds.min.y;
  maxY = tileBounds.max.y;
  minX = tileBounds.min.x;
  maxX = tileBounds.max.x;
  for (var i = 0, len = tilesInScreen.length; i < len; i++) {
    point = tilesInScreen[i];
    x = point.x;
    y = point.y;
    _getZoomedInTiles(x, y, startingZoom, zoomLevelLimit, tileImagesToQuery, minY, maxY, minX, maxX);
    // _getZoomedOutTiles(x, y, startingZoom, 0, tileImagesToQuery, minY, maxY, minX, maxX);
  }
  return tileImagesToQuery;
}

// recursively adds zoomed in tile coords
function _getZoomedInTiles(x, y, currentZ, maxZ, tileImagesToQuery, minY, maxY, minX, maxX) {
  _getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, true);
  if (currentZ < maxZ) {
    minY *= 2;
    maxY *= 2;
    minX *= 2;
    maxX *= 2;
    _getZoomedInTiles(x * 2, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
    _getZoomedInTiles(x * 2 + 1, y * 2, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
    _getZoomedInTiles(x * 2, y * 2 + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
    _getZoomedInTiles(x * 2 + 1, y * 2 + 1, currentZ + 1, maxZ, tileImagesToQuery, minY, maxY, minX, maxX);
  }
}

// recursively adds zoomed out tile coords
function _getZoomedOutTiles(x, y, currentZ, finalZ, tileImagesToQuery, minY, maxY, minX, maxX) {
  _getTileImage(x, y, currentZ, tileImagesToQuery, minY, maxY, minX, maxX, false);
  if (currentZ > finalZ) {
    minY /= 2;
    maxY /= 2;
    minX /= 2;
    maxX /= 2;
    return _getZoomedOutTiles(Math.floor(x / 2), Math.floor(y / 2), currentZ - 1, finalZ, tileImagesToQuery, minY, maxY, minX, maxX);
  }
}

// fills in a tile reference
function _getTileImage(x, y, z, tileImagesToQuery, minY, maxY, minX, maxX) {
  var key;
  if (
    x < Math.floor(minX) ||
    x > Math.floor(maxX) ||
    y < Math.floor(minY) ||
    y > Math.floor(maxY)
  ){
    return;
  }
  key = _createTileKey(x, y, z);
  if (!tileImagesToQuery[key]) {
    return tileImagesToQuery[key] = {
      // key: key,
      x: x,
      y: y,
      z: z,
    };
  }
}

// xyz to key
function _createTileKey(x, y, z) {
  var tilePoint;
  tilePoint = _createNormalizedTilePoint(x, y, z);
  return tilePoint.x + ", " + tilePoint.y + ", " + tilePoint.z;
}

// no idea
function _createNormalizedTilePoint(x, y, z) {
  var nbTilesAtZoomLevel;
  nbTilesAtZoomLevel = Math.pow(2, z);
  while (x > nbTilesAtZoomLevel) {
    x -= nbTilesAtZoomLevel;
  }
  while (x < 0) {
    x += nbTilesAtZoomLevel;
  }
  while (y > nbTilesAtZoomLevel) {
    y -= nbTilesAtZoomLevel;
  }
  while (y < 0) {
    y += nbTilesAtZoomLevel;
  }
  return {
    x: x,
    y: y,
    z: z,
  };
}