// Style for the application
require('./css/main.css')

// Evaluates item-mirror in the global context
require('script!./scripts/item-mirror.js')

// Forces jQuery to evaluate in the global context for compatability reasons
require('expose?$!jquery')

// Now load our main file, and actually do stuff
var main = require('./scripts/main.js')
main()
