"use strict";
/*
    Dawdling.js
    - Mousemove record cursor point (x,y).
    - Keep a running average of pixels per [time metric].
    - Keep a running average of pixels moved vs. optimal path between logical actions.
    - Determine how to detect logical actions via mouse.

    - 30% increase in pixels moved = negative emotion
    - 17% slower trajectory = negative emotion
*/

(() => {
    const EMOTIONAL_DISTANCE = 1.30; // 30% further.
    const EMOTIONAL_VELOCITY = 0.83; // 17% slower.
    const ACTION_DELAY = 200; // 200ms before considering a mouseEvent to be its own action.

    let store = [];

    init();

    function init() {
        document.body.addEventListener("mousemove", (e) => {
            store.push({
                x: e.x,
                y: e.y,
                timestamp: Date.now()
            });
            debounce(
                compareActions,
                1000
            )();
        });
    }

    /*
        Calculate Metrics from a mousemove event store.
        
        Returns object:
            "distance": in pixels.
            "duration": in milliseconds.
            "velocity": in pixels per millisecond.
    */
    function calcMetrics(eventStore) {
        let
            metrics = {
                distance: 0,
                duration: 0
            };

        for (let i = 1; i < eventStore.length; i++) {
            metrics.distance += distance(eventStore[i - 1], eventStore[i]);
            metrics.duration += eventStore[i].timestamp - eventStore[i - 1].timestamp;
            metrics.velocity = metrics.distance / metrics.duration;
        }

        return metrics;
    }

    /*
        Checks metrics between two stores to see if the latter has fallen into
        an emotional zone on either distance or velocity.

        Returns Object:
            "distancePercentage": percentage,
            "velocityPercentage": percentage,
            "distanceInZone": boolean,
            "velocityInZone": boolean
    */
    function checkZones(eventStore1, eventStore2) {
        let
            metrics1 = calcMetrics(eventStore1),
            metrics2 = calcMetrics(eventStore2),
            zones = {};

        zones.distancePercentage = (metrics2.distance / metrics1.distance);
        zones.velocityPercentage = (metrics2.velocity / metrics1.velocity);
        zones.distanceInZone = zones.distancePercentage > EMOTIONAL_DISTANCE;
        zones.velocityInZone = zones.velocityPercentage < EMOTIONAL_VELOCITY;

        return zones;
    }

    function compareActions() {
        let actions = splitStoreIntoActions(store);

        if (actions.length > 1) {
            let zones = checkZones(
                actions.slice(0, actions.length - 2),
                actions[actions.length - 1]
            );
        }

    }

    /*
        Dispatch a dawdle event.
    */
    function dispatchEvent(data) {
        var event = new Event('dawdle', data);
        document.documentElement.dispatchEvent(event);
    }

    /*
        Gets or concats data to the local store.
    */
    function localStore(data) {
        let localStore = localStorage.getItem('dawdle-store') || [];

        if (data == 'undefined' || data == null) {
            localStore.concat(data);
            localStorage.setItem('dawdle-store', JSON.stringify(localStore));
        }

        return localStore;
    }

    /*
        Splits a store into logical actions by looking for pauses.
    */
    function splitStoreIntoActions(eventStore) {
        let
            actions = [],
            actionLastIndex = 0,
            lastTimestamp = 0;

        for (let i = 0; i < eventStore.length; i++) {
            // If the duraction of time between this event and the last
            // we are seeing the beginning of a new action.
            if (eventStore[i].timestamp - lastTimestamp > ACTION_DELAY) {
                actions.push(eventStore.slice(actionLastIndex, i));
                actionLastIndex = i;
            }

            lastTimestamp = eventStore[i].timestamp;
        }
        return actions;
    }

    /*
        Calculate the distance between two points.
    */
    function distance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
        );
    }

    /*
        Returns a function, that, as long as it continues to be invoked, will not
        be triggered. [Courtesy of Underscore.js]
    */
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };
})();
