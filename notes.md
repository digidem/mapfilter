map filter

node-webkit that can update its code

build:
  - containers
    - webapp
    - nw.js

ux:
  summarizing / analyzing data:
    - data is collected in clusters
    - date range -> data subset -> group observations into trips by monitor -> date range of trips
  current filter info:
    - [ ] label for current filter "showing $N points from $M monitors"
    - [ ] show date range selected not dates of last and first points selected
  i18n:
    - [ ] templates (semi-present)
    - [ ] hard to genericize
map:
  - [ ] cache all tiles for area
  - [ ] load via mb-tiles (sqllite)

data-sources:
  - observations
    - local fs
      - [ ] via token
    - github
      - [x] via token
      - [ ] via oauth?
  - map tiles
    - bing
    - leaflet
    - local fs


digidem/html5-image-cache via DOM manip observer
mapbox/hubdb - use github as db
mWater/offline-leaflet-map - save tiles at current view and inward OfflineLayer.coffee#L226

(1) tying together the work of kelly and beau
(2) moving to node-webkit or chrome app


(1) move everything offline


build:
  wrap in chrome app container
  grab image tiles
  grab known data


- [x] gulp build system
- [x] gulp fix live reload
- [x] build to chrome app
- [x] fix time filter bar (i broke it)
- [x] gh-pages publish
- [ ] use a single index.html ?
- [ ] combine dev and webapp ?
- [ ] config - make sure we're using for keys
- [ ] dev doc + try fresh clone

- [ ] chrome-fs
- [ ] try html5-img-cache in chrome app



