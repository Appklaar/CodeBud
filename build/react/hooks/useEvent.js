"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEvent = void 0;
const react_1 = require("react");
const Connector_1 = require("./../../Connector");
const random_1 = require("./../../helpers/random");
const useEvent = (handler, instructionIds) => {
    // ComponentDidMount
    (0, react_1.useEffect)(() => {
        const listenerKey = (0, random_1.getId)();
        const innerHandler = (event) => {
            if (instructionIds.includes(event.instructionId))
                handler(event);
        };
        Connector_1.Connector.addEventListener(listenerKey, innerHandler);
        // ComponentWillUnmount
        return () => {
            Connector_1.Connector.removeEventListener(listenerKey);
        };
    }, []);
};
exports.useEvent = useEvent;
