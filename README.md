MapFilter
=========

Mapfilter is an online/offline web tool for visualizing, exploring, filtering and print or web publishing of monitoring data.

Architecture
----------------

MapFilter is built on [backbone.js](http://backbonejs.org/) and uses [Crossfilter](http://square.github.io/crossfilter/) for fast filtering of data by different attributes.

Data is currently stored as static geojson files on Github.com.

User Requirements
--------------------------

1. **Needs to be fast on a slow internet connection**. The Formhub interface is excruciatingly slow on the satellite connection in Sholinab.
2. **Needs to work offline**. The internet connection is unreliable, and is only in one village. The Wapichan need to be able to carry their laptop to different villages and meetings and have the data ready to show.
3. **Easily view and print data from monitoring trips**. The monitors go out on trips for several days where they document what is happening in a particular area. When they return they need to easily see the information from that trip and print it out so they can leave a copy with the village council.
4. **Offline sync with ODK Collect**. Currently ODK syncs online first, then Mapfilter syncs the online data offline. Ideally there would be a way to transfer data directly to mapfilter without an internet connection.

Features to add
---------------------

Features to add (in addition to implementing tests and cleaning up bugs):

1. **Backbone sync**

    Right now the app just consumes static json files from Github with no offline storage. We need to implement an offline backbone sync adapter, using either github or couchdb as a data store (see xxx ODK implementation on couchdb)

2. **Backend implementation**

    Currently the app is set up to just consume a static json file, which is stored on Github. Given the potential size of the dataset, static files on Github may be the best choice for a backend. Another option would be Couchdb, which can sync with Backbone with PouchDB. We could implement a custom sync with an existing ODK server app, but that would be more work. I have a working webapp for syncing Formhub or ODK Aggregate with Github.

3. **Chrome webapp**

    Wrap up the webapp as a chrome app, facilitating user access and allowing better offline functionality (see below).

4. **Identify "trips"**

    Groups of points collected on consecutive days by the same monitors will all be from the same trip. Often the users will want to see data from a particular trip. We should be able to automatically identify these clusters and allow the user to select trips to view.

5. **Add current view description**

    Right now the bar across the top always shows the same thing. It should update to show the current view.

6. **Editing data**

    Often when reviewing the data from monitors there are spelling mistakes, errors, or new data that needs to be added. We need to add the ability to edit data and, ideally, track change history.

7. **Offline map tiles**

    We need a way of showing the map tiles offline. Downloading a local cache would take too long on the satellite connection. We need a way to import a folder of map tiles or an mbtiles file into the app.

8. **Offline images**

    The way Formhub stores images is very slow and with no cache headers. We need a way to sync images in the background and store them offline.
