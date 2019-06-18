/**
 * PSP utility functions
 *
 * A set of utility function used throughout the components used in the main process of the PSP.
 * Copyright 2016 Steven Githens
 * Copyright 2016-2017 OCAD University
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 * The research leading to these results has received funding from the European Union's
 * Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.
 * You may obtain a copy of the License at
 * https://github.com/GPII/universal/blob/master/LICENSE.txt
 */
"use strict";

var os            = require("os");
var fluid         = require("infusion");
var electron      = require("electron");
var child_process = require("child_process");

var gpii = fluid.registerNamespace("gpii");
fluid.registerNamespace("gpii.app");

/**
 * Returns whether the underlying OS is Windows 10 or not.
 * @return {Boolean} `true` if the underlying OS is Windows 10 or
 * `false` otherwise.
 */
gpii.app.isWin10OS = function () {
    var osRelease = os.release(),
        delimiter = osRelease.indexOf("."),
        majorVersion = osRelease.slice(0, delimiter);
    return majorVersion === "10";
};

/**
 * This namespace contains useful functions for computing the position and
 * dimensions of a `BrowserWindow`.
 */
fluid.registerNamespace("gpii.browserWindow");

/**
 * Computes the new dimensions of a `BrowserWindow` so that all its content
 * is vertically fully visible on the screen.
 * @param {Number} width - The width of the `BrowserWindow`.
 * @param {Number} height - The height of the `BrowserWindow`.
 * @param {Number} offsetX - The x offset from the right edge of the screen.
 * @param {Number} offsetY - The y offset from the bottom edge of the screen.
 * @return {{width: Number, height: Number}} The desired window size.
 */
gpii.browserWindow.computeWindowSize = function (width, height, offsetX, offsetY) {
    // ensure proper values are given
    offsetY = Math.max(0, (offsetY || 0));

    var screenSize = electron.screen.getPrimaryDisplay().workAreaSize,
        maxHeight = screenSize.height - offsetY;
    height = Math.min(height, maxHeight);

    return {
        width:  Math.round(width),
        height: Math.round(height)
    };
};

/**
 * Computes the position of a window given its dimensions and the offset which
 * the windows should have relative to the bottom right corner of the screen.
 * It ensures that the window is not positioned vertically outside of the
 * screen.
 * @param {Number} width - The width of the `BrowserWindow`.
 * @param {Number} height - The height of the `BrowserWindow`.
 * @param {Number} offsetX - The x offset from the right edge of the screen.
 * @param {Number} offsetY - The y offset from the bottom edge of the screen.
 * @return {{x: Number, y: Number}} The desired window position.
 */
gpii.browserWindow.computeWindowPosition = function (width, height, offsetX, offsetY) {
    // ensure proper values are given
    offsetX = Math.max(0, (offsetX || 0));
    offsetY = Math.max(0, (offsetY || 0));

    var screenSize = electron.screen.getPrimaryDisplay().workArea;

    // position relatively to the bottom right corner
    // note that as offset is positive we're restricting window
    // from being position outside the screen
    var desiredX = Math.round(screenSize.width - (width + offsetX));
    var desiredY = Math.round(screenSize.height - (height + offsetY));

    // avoids overflowing at the top
    desiredY = Math.max(desiredY, 0);

    // Electron has issues positioning a `BrowserWindow` whose x or y coordinate is
    // -0 (event though +0 === -0). Hence, this safety check.
    desiredX = desiredX || 0;
    desiredY = desiredY || 0;

    return {
        // Offset it to factor in the start of the work area, which takes into account docked windows like magnifier and
        // Read&Write.
        x: desiredX + screenSize.x,
        y: desiredY + screenSize.y
    };
};

/**
 * Computes the position of a window given its dimensions so that it is
 * positioned centrally on the screen.
 * @param {Number} width - The width of the `BrowserWindow`.
 * @param {Number} height - The height of the `BrowserWindow`..
 * @return {{x: Number, y: Number}} The desired window position.
 */
gpii.browserWindow.computeCentralWindowPosition = function (width, height) {
    var screenSize = electron.screen.getPrimaryDisplay().workAreaSize,
        desiredX = Math.round((screenSize.width - width) / 2),
        desiredY = Math.round((screenSize.height - height) / 2);

    desiredX = Math.max(desiredX, 0);
    desiredY = Math.max(desiredY, 0);

    return {
        x: desiredX,
        y: desiredY
    };
};

/**
 * Gets the desired bounds (i.e. the coordinates and dimensions) of an
 * Electron `BrowserWindow` given its width, height and offset from the
 * bottom right corner of the screen so that the window is positioned in
 * the lower right corner of the primary display.
 * @param {Number} width - The width of the `BrowserWindow`.
 * @param {Number} height - The height of the `BrowserWindow`.
 * @param {Number} offsetX - The x offset from the right edge of the screen.
 * @param {Number} offsetY - The y offset from the bottom edge of the screen.
 * @return {{x: Number, y: Number, width: Number, height: Number}} The
 * desired coordinates, width and height of the `BrowserWindow`.
 */
gpii.browserWindow.computeWindowBounds = function (width, height, offsetX, offsetY) {
    // restrict offset to be positive
    var position = gpii.browserWindow.computeWindowPosition(width, height, offsetX, offsetY);
    var size = gpii.browserWindow.computeWindowSize(width, height, offsetX, offsetY);

    return {
        x:      position.x,
        y:      position.y,
        width:  size.width,
        height: size.height
    };
};

/**
 * Sends a message to the given Electron `BrowserWindow`.
 * @param {Object} browserWindow - An Electron `BrowserWindow` object
 * @param {String} messageChannel - The channel to which the message should be sent
 * @param {String} message - The message to be sent.
 */
gpii.app.notifyWindow = function (browserWindow, messageChannel, message) {
    if (browserWindow) {
        browserWindow.webContents.send(messageChannel, message);
    }
};

/**
 * Checks if a hash is not empty, i.e. if it contains at least one key.
 * Note that the values are not examined.
 * @param {Object} hash - An arbitrary object.
 * @return {Boolean} `true` is the hash has at least one key and `false` otherwise.
 */
gpii.app.isHashNotEmpty = function (hash) {
    return hash && fluid.keys(hash).length > 0;
};

/**
 * Determines if a point is contained within a rectangle (including whether it
 * lies on any of the rectangle's sides).
 * @param {Object} point - The point to check
 * @param {Number} point.x - The x coordinate of the point.
 * @param {Number} point.y - The y coordinate of the point.
 * @param {Object} rectangle - The rectangle which is to be checked.
 * @param {Number} rectangle.x - The x coordinate of the rectangle.
 * @param {Number} rectangle.y - The y coordinate of the rectangle.
 * @param {Number} rectangle.width - The width of the rectangle.
 * @param {Number} rectangle.height - The height of the rectangle.
 * @return {Boolean} - `true` if the point is contained within the specified
 * rectangle and `false` otherwise.
 */
gpii.app.isPointInRect = function (point, rectangle) {
    return rectangle.x <= point.x && point.x <= rectangle.x + rectangle.width &&
           rectangle.y <= point.y && point.y <= rectangle.y + rectangle.height;
};

/**
 * Checks if the buttonList attribute exists in the siteConfig object
 * @param {Object} siteConfig - instance of the siteConfig object
 * @returns {Boolean}
 */
gpii.app.isButtonList = function(siteConfig) {
    return fluid.isValue(siteConfig.buttonList);
};

/**
 * Looks for a `id` and matches it to the provided string
 * return empty array when there is no button found
 * @param {String} buttonId - the `id` of the button
 * @param {Array} availableButtons - the full settings list
 * @returns {Array}
 */
gpii.app.findButtonId = function(buttonId, availableButtons) {
    var returnData = [];  // returning empty array by default

    if (fluid.isValue(buttonId) && fluid.isValue(availableButtons)) {
        fluid.each(availableButtons, function(button) {
            if (fluid.isValue(button.id)) {
                if (button.id === buttonId) {
                    returnData = button; // returning the button data
                }
            }
        });
    }
    return returnData;
};

/**
 * Filters the full button list based on the provided array of `id` attributes
 * @param {Array} siteConfigButtonList - basic array of strings
 * @param {Object[]} availableButtons - all available buttons found in settings.json
 * @returns {Object[]} - filtered version of available buttons (same structure)
 */
gpii.app.filterButtonList = function(siteConfigButtonList, availableButtons) {
    var matchedList = [], // these buttons are explicitly selected in the
                          // siteConfig, added in the same order
        afterList = [],   // all the buttons that don't have `id` at all,
                          // they are added at the end of the list
        tabindex = 100;   // starting tabindex, adding +10 of each new item

    // creating the matchedList
    // looking for `id` and if matches adding it
    fluid.each(siteConfigButtonList, function(buttonId) {
        var matchedButton = gpii.app.findButtonId(buttonId, availableButtons);
        if (matchedButton !== []) {
            // adding the proper tabindex
            matchedButton.tabindex = tabindex;
            tabindex += 10; // increasing the tabindex
            // adding button to the matched ones
            matchedList.push(matchedButton);
        }
    });

    // creating the afterList
    // looking for all of other buttons that don't have `id` at all
    fluid.each(availableButtons, function(afterButton) {
        if (!fluid.isValue(afterButton.id)) { // there is no `id`, adding it
            // adding the proper index
            afterButton.tabindex = tabindex;
            tabindex += 10; // increasing the tabindex
            // adding button to the matched ones
            afterList.push(afterButton);
        }
    });

    return matchedList.concat(afterList);
};

/**
 * A custom function for handling activation of the "Open USB" QSS button.
 *
 * In most cases, there's only a single USB drive. But if there's more than one USB drive,
 * then those that do not contain the token file are shown.
 */
gpii.app.openUSB = function() {
    gpii.windows.getUserUsbDrives().then(function (paths) {
        fluid.each(paths, function (path) {
            child_process.exec("explorer.exe \"" + path + "\"");
        });
    });
};
