var fs = require('fs'),
    YAML = require('js-yaml');

var locale = YAML.load(fs.readFileSync('data/locale.yaml', 'utf8'));

function stringify(o) {
    return JSON.stringify(o, null, 4);
}

fs.writeFileSync('data/locale.js', "window.locale.en = " + stringify(locale));
