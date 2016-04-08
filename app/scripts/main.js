/*
 * name: main.js
 * Authors: Tanner Garrett, Brandon Thepvongsa
 * Description: JavaScript used to create the functionality of FolderDocs
*/

var googAuth

var $ = require('jquery')
// Load configuration details from another file
var config = require('./config')

var im,
  store,
  rootMirror,
  previous,
  associations,
  dropboxClientCredentials,
  selectedAssociation

var authenticatedClient = null

function getClient () {
  return authenticatedClient
}

// Constructs the root ItemMirror object from the root of the Dropbox.
function constructIMObject (store) {
  im = new ItemMirror('Thisisastring', function (error, newMirror) {
    if (error) {
      console.log(error)
    } else {
      im = newMirror
      // if(pathURI == "/") {
      //     handleLastNavigated(newMirror)
      // }
      // Check to see which of the returned items is the correct store, and navigate into that mirror
      if (store) {
        associations = im.listAssociations()
        for (var i = 0; i < associations.length; i++) {
          var displayText = im.getAssociationDisplayText(associations[i])
          if (displayText == store) {
            navigateMirror(associations[i])
          }
        }
      } else {
        refreshIMDisplay()
      }
    }
  })
}

function refreshIMDisplay () {
  // Hides the jumbotron if we are already connected to Dropbox
  if (getClient()) {
    $('.jumbotron').hide()
  }

  var entryDisplayName
  $('#groupingItems').empty()
  $('#nonGroupingItems').empty()

  associations = im.listAssociations()
  var length = associations.length

  // Grab associations and organize them by type
  var groupingItems = []
  var nonGroupingItems = []
  for (var i = 0; i < length; i++) {
    if (im.isAssociationAssociatedItemGrouping(associations[i])) {
      groupingItems.push(associations[i])
    } else {
      nonGroupingItems.push(associations[i])
    }
  }

  printAssociations(im.listAssociations())
  createClickHandlers()
}

function printAssociations (associationList, div) {
  console.log('ASSOCIATIONS:')
  associationList.map(function(assoc) {
    console.log(assoc)
    console.log(im.getAssociationDisplayText(assoc))
  })
}

// Creates the JS click handlers for the various associations and links
// Also creates the handlers for the textbox editing of associations
function createClickHandlers () {
  $('#previous-link').on('click', navigatePrevious)
  $('#root-link').on('click', navigateRoot)
}

// Handles the logic and timing of the single vs double clicks on
// display text. Single clicks select the association in preperation
// to enter edit mode upon another single click, double clicks navigate
// to that itemmirror object
function handleDisplaytextClicks () {
  var DELAY = 350, clicks = 0, timer = null
  $('.association-row').on('click', function (e) {
    clicks++ // count clicks
    var element = $(this)
    // Check if the element has been selected already
    var alreadySelected = element.hasClass('selected-association')
    selectAssociation(element)
    if (clicks === 1) {
      timer = setTimeout(function () {
        // Single click case
        clicks = 0 // reset counter
        // If element has been selected already, open edit box
        if (alreadySelected) { editboxAssociation(element); }
      }, DELAY)
    // If element is a grouping item
    } else if (im.isAssociationAssociatedItemGrouping(element.attr('data-guid'))) {
      // Double click case
      clearTimeout(timer); // prevent single-click action
      var element = $(this)
      var guid = element.attr('data-guid')
      navigateMirror(guid)
      clicks = 0 // reset counter
    }})
    .on('dblclick', function (e) {
      e.preventDefault() // prevent default dblclick event
    })
}

// Selects an itemMirror associaton 
function selectAssociation (element) {
  if (selectedAssociation) {
    selectedAssociation.removeClass('selected-association')
  }
  element.addClass('selected-association')
  selectedAssociation = element
}

// Takes in the row element of the clicked association, selects it
// by saving the guid as the currently selected guid and highlights
// the association in view by placing a border around it.
function editboxAssociation (element) {
  if (element.hasClass('selected-association')) {
    // The clicked element is the currently selected element, let's
    // toggle into edit
    var guid = element.attr('data-guid')
    var textbox = $('#' + guid)
    $("h4[data-guid='" + guid + "']").show()
    textbox.show()
    textbox.putCursorAtEnd()
  }
}

// Saves the current itemMirror object
function saveMirror () {
  im.save(function (error) {
    if (error) {
      console.log('Save Error: ' + error)
    } else {
      console.log('Successfully saved.')
    }
  })
}

// Refreshes the itemMirror object
function refreshMirror () {
  im.refresh(function (error) {
    if (error) {
      console.log('Refresh error:' + error)
    }
  })
}

// Attempts to navigate and display a new itemMirror association
function navigateMirror (guid) {
  im.createItemMirrorForAssociatedGroupingItem(guid, function (error, newMirror) {
    if (!error) {
      im = newMirror
      refreshIMDisplay()
    } else {
      console.log(error)
    }
  })
}

// Navigates and refreshes the display to the previous mirror
function navigatePrevious () {
  var previous = im.getCreator()

  if (previous) {
    im = previous
    refreshIMDisplay()
  }
}

// Navigates to the root mirror
function navigateRoot () {
  if (rootMirror) {
    im = rootMirror
    refreshIMDisplay()
  }
}

// Attempts to save the order of the associations by matching
// each associations guid with the array of guids returned on a reordering drop.
function saveOrder () {
  var displayedAssocs = $('#groupingItems').sortable('toArray', {attribute: 'data-guid'})
  // Loop through each association
  for (var i = 0; i < associations.length; i++) {
    // Loop through each association we grabbed from the drop event
    for (var k = 0; k < displayedAssocs.length; k++) {
      // Find where the guids match, k will equal the proper order placement
      // when we find a match
      if (associations[i] == displayedAssocs[k]) {
        im.setAssociationNamespaceAttribute('order', k, associations[i], 'folder-docs')
      }
    }
  }
  // After we've set all the proper namespace attributes, let's save the itemMirror
  saveMirror()
}

// This is the only function we export, it basically does everything
module.exports = function () {
  // Asynchronously loads the gapi Google client library
  // Needed for now because we can't load through HMTL and use the modules
  require('google-client-api')(function (gapi) {
    $(document).ready(function () {
      // $("#gdriveButton").on("click", connectDrive)
      // Solution is to not have so many callbacks before actually calling window.open. 
      // If we can reduce the callbacks the window will appear without any issue
      $('#gdriveButton').click(function () {
        authorizeDrive(function (auth) {
          // Use this button to bind the authorization object
          googAuth = auth
          console.log('Auth set to: ' + auth)
        })
        $(this).html("<img src='./images/spinner.gif' alt='spinner' />")
        setTimeout(function () {
          $('#gdriveButton').remove()
          $('#buttons').append("<button class='btn btn-default' id='gSignInButton'>Sign in to Google Drive</button>")
          $('#gSignInButton').click(function () {
            $(this).html("<img src='./images/spinner.gif' alt='spinner' />")
            console.log('Checking Auth')
            if (googAuth.isSignedIn.get()) {
              loadDriveAPI()
            } else {
              console.log('Attempting Sign In')
              // Need to have them sign in
              googAuth.signIn().then(function () {
                loadDriveAPI()
              }, function (error) {
                // Failed to authenticate for some reason
                googleAuth.reject(error)
              })
            }
          })
        }, 1000)
      })

      // Loads the drive API, and resolves the promise
      function loadDriveAPI () {
        gapi.client.load('drive', 'v2', function () {
          // Once this callback is executed, that means we've authorized just as expected
          // and can therefore resolve the promise
          connectDrive()
        })
      }

      // Directs the client to Google Drive's authentication page to sign in.
      function connectDrive () {
        console.log('Attempting to connect')
        store = 'Google Drive'

        console.log('Successful Authentication!')
        authenticatedClient = gapi.client
        // Now we start dealing with item-mirror
        constructIMObject(store)
      }

      // This function returns a promise that handles our authentication
      function authorizeDrive (next) {
        console.log('Authorizing Drive')
        // Your Client ID can be retrieved from your project in the Google
        // Developer Console, https://console.developers.google.com
        var CLIENT_ID = '681676105907-omec1itmltlnknrdfo150qcn7pdt95ri.apps.googleusercontent.com'
        // Need full permissions for everything to work. This is the easiest option
        var SCOPES = ['https://www.googleapis.com/auth/drive']

        // Load the newer version of the API, the old version is a pain to deal with
        gapi.load('auth2', function () {
          gapi.auth2.init({
            'client_id': CLIENT_ID,
            'scope': SCOPES.join(' '),
            'immediate': true
          })

          next(gapi.auth2.getAuthInstance())
        })
      }
    })
  })
}
