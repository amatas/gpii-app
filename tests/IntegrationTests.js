/**
 * PSP Integration Test Utilities
 *
 * Utilities for starting and running the PSP integration tests. Provide means for
 * prepending and appending necessary sequence elements to the test definitions and
 * for bootstraping the test application instance.
 * Copyright 2017 Raising the Floor - International
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 * The research leading to these results has received funding from the European Union's
 * Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.
 * You may obtain a copy of the License at
 * https://github.com/GPII/universal/blob/master/LICENSE.txt
 */

"use strict";

require("gpii-windows/index.js"); // loads gpii-universal as well

var fluid = require("infusion"),
    kettle = fluid.registerNamespace("kettle"),
    gpii = fluid.registerNamespace("gpii");

fluid.require("%gpii-universal/gpii/node_modules/testing");

gpii.loadTestingSupport();

require("./DialogManagerTestDefs.js");
require("./IntegrationTestDefs.js");
require("./QssTestDefs.js");
require("./SequentialDialogsTestDefs.js");
require("./SettingsBrokerTestDefs.js");
require("./StorageTestDefs.js");
require("./SurveysConnectorTestDefs.js");
require("./SurveyTriggerManagerTestsDefs.js");
require("./ShortcutsManagerTestDefs.js");
require("./UserErrorsHandlerTestDefs.js");
require("./SiteConfigurationHandlerTestDefs.js");
require("./WebviewTestDefs.js");
require("./GpiiConnectorTestDefs.js");
require("./PspTestDefs.js");
require("./TimerTestDefs.js");

// TODO: Review this following CI run.
//fluid.setLogging(fluid.logLevel.FATAL);

fluid.registerNamespace("gpii.tests.app");

/*
 * Preceding items for every test sequence.
 */
gpii.tests.app.startSequence = [
    { // This sequence point is required because of a QUnit bug - it defers the start of sequence by 13ms "to avoid any current callbacks" in its words
        func: "{testEnvironment}.events.constructServer.fire"
    },
    {
        event: "{testEnvironment}.events.startupComplete",
        listener: "fluid.identity"
    }
];

/*
 * Items added after every test sequence.
 */
gpii.tests.app.endSequence = [];

/*
 * We might need to conditionally make some options distributions that should affect all test sequences.
 * Every test sequence specifies a configuration file to be used for creating the gpii-app.
 * As we can't easily change all test sequences configuration files to some containing desired distribution
 * we can use this property to do so.
 *
 * This is extremely useful in the case of coverage collecting for the renderer processes
 * as we need to distribute options only if we are running instrumented code (coverage data
 * is to be collected).
 */
gpii.tests.app.testsDistributions = {};


/**
 * Used to disable the system language listener and set a fixed language.
 */
fluid.defaults("gpii.tests.app.mockedSystemLanguageListener", {
    gradeNames: ["fluid.modelComponent"],

    model: {
        installedLanguages: {},
        configuredLanguage: "en-US"
    }
});

/**
 * Attach instances that are needed in test cases.
 * @param {Component} testCaseHolder - The overall test cases holder
 * @param {Component} flowManager - The `gpii.flowManager`
 */
gpii.tests.app.receiveApp = function (testCaseHolder, flowManager) {
    testCaseHolder.flowManager = flowManager;
    testCaseHolder.app = flowManager.app;
};

// This is a fork of kettle.test.testDefToCaseHolder which is written in a non-reusable style
// See: https://issues.fluidproject.org/browse/KETTLE-60
gpii.tests.app.testDefToCaseHolder = function (configurationName, testDefIn) {
    var testDef = fluid.copy(testDefIn);
    var sequence = testDef.sequence;
    delete testDef.sequence;
    delete testDef.config;
    // We eliminate this since we need to wait longer for the app to be started
    // as well as the server
    // sequence.unshift.apply(sequence, kettle.test.startServerSequence);
    sequence.unshift.apply(sequence, gpii.tests.app.startSequence);
    sequence.push.apply(sequence, gpii.tests.app.endSequence);
    testDef.modules = [{
        name: configurationName + " tests",
        tests: [{
            name: testDef.name,
            expect: testDef.expect,
            sequence: sequence
        }]
    }];
    return testDef;
};

// Also a fork from kettle
// See: https://issues.fluidproject.org/browse/KETTLE-60
gpii.tests.app.testDefToServerEnvironment = function (testDef) {
    var configurationName = testDef.configType || kettle.config.createDefaults(testDef.config);
    return {
        type: "kettle.test.serverEnvironment",
        options: {
            configurationName: configurationName,
            components: {
                tests: {
                    options: gpii.tests.app.testDefToCaseHolder(configurationName, testDef)
                }
            },
            distributeOptions: gpii.tests.app.testsDistributions,
            events: {
                couchStarted:   null,
                pspStarted:     null,
                noUserLoggedIn: null,
                startupComplete: {
                    events: {
                        couchStarted:   "couchStarted",
                        pspStarted:     "pspStarted",
                        noUserLoggedIn: "noUserLoggedIn"
                    }
                }
            },
            listeners: {
                couchStarted: {
                    funcName: "fluid.log",
                    args: ["Couch Started"]
                },
                pspStarted: {
                    funcName: "fluid.log",
                    args: ["PSP Started"]
                },
                noUserLoggedIn: {
                    funcName: "fluid.log",
                    args: ["No User Logged in"]
                }
            }
        }
    };
};

// Also a fork from kettle
// See: https://issues.fluidproject.org/browse/KETTLE-60
gpii.tests.app.bootstrapServer = function (testDefs, transformer) {
    return kettle.test.bootstrap(testDefs, fluid.makeArray(transformer).concat([gpii.tests.app.testDefToServerEnvironment]));
};

/*
 * In case we're running tests with coverage data collecting,
 * we'd need to collect coverage data for the renderer as well.
 * This allows running the tests without coverage collecting.
 */
if (gpii.tests.app.isInstrumented) {
    /*
     * Run coverage collecting for the BrowserWindow-s.
     *
     * NOTE: This should be required last as it overrides existing items, such as `gpii.tests.app.endSequence`
     */
    fluid.require("%gpii-app/tests/lib/enableRendererCoverage.js");
}


gpii.tests.app.bootstrapServer([
    //fluid.copy(gpii.tests.app.testDefs), // OK
    //fluid.copy(gpii.tests.dev.testDefs), // OK
    //fluid.copy(gpii.tests.psp.testDefs), // OK
    //fluid.copy(gpii.tests.timer.testDefs), // OK
    //fluid.copy(gpii.tests.dialogManager.testDefs), // OK
    //fluid.copy(gpii.tests.qss.testDefs), // OK
    //fluid.copy(gpii.tests.sequentialDialogs.testDefs), // OK
    //fluid.copy(gpii.tests.shortcutsManager.testDefs), // OK
    //fluid.copy(gpii.tests.settingsBroker.testDefs), // OK
    /*

        06:51:52.863:  jq: FAIL: Module "gpii.tests.dynamicSurveyConnector.config tests" Test name "Dynamic survey connector integration tests" - Message: Unexpected failure in test case (see following log for more details): Cannot read property 'supportedSettings' of undefined

     */
    //fluid.copy(gpii.tests.surveys.dynamicSurveyConnectorTestDefs), // NOT OK: Seems to hang. See error above.
    //fluid.copy(gpii.tests.surveyTriggerManager.testDefs), // OK
    //fluid.copy(gpii.tests.siteConfigurationHandler.testDefs), // OK
    //fluid.copy(gpii.tests.storage.testDefs), // OK
    fluid.copy(gpii.tests.userErrorsHandler.testDefs), // NOT OK: Seems to hang.
    //fluid.copy(gpii.tests.gpiiConnector.testDefs), // OK
    //fluid.copy(gpii.tests.webview.testDefs) // OK
]);
