/**
 * Pterodactyl Bedrock Bridge - Type Definitions
 * Vollständige Typdefinitionen für alle API Objekte
 */
// ==================== HTTP TYPES ====================
export var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "Get";
    HttpMethod["POST"] = "Post";
    HttpMethod["PATCH"] = "PATCH";
    HttpMethod["PUT"] = "Put";
    HttpMethod["DELETE"] = "Delete";
    HttpMethod["HEAD"] = "Head";
})(HttpMethod || (HttpMethod = {}));
export var WebSocketEvent;
(function (WebSocketEvent) {
    WebSocketEvent["AUTH"] = "auth";
    WebSocketEvent["SEND_COMMAND"] = "send command";
    WebSocketEvent["SET_STATE"] = "set state";
    WebSocketEvent["CONSOLE_OUTPUT"] = "console output";
    WebSocketEvent["STATUS"] = "status";
    WebSocketEvent["STATS"] = "stats";
    WebSocketEvent["JWT_ERROR"] = "jwt error";
    WebSocketEvent["DAEMON_MESSAGE"] = "daemon message";
})(WebSocketEvent || (WebSocketEvent = {}));
export var ServerPowerState;
(function (ServerPowerState) {
    ServerPowerState["START"] = "start";
    ServerPowerState["STOP"] = "stop";
    ServerPowerState["RESTART"] = "restart";
    ServerPowerState["KILL"] = "kill";
})(ServerPowerState || (ServerPowerState = {}));
// ==================== GUI TYPES ====================
export var FormAction;
(function (FormAction) {
    FormAction[FormAction["NONE"] = -1] = "NONE";
    FormAction[FormAction["SERVERS_LIST"] = 0] = "SERVERS_LIST";
    FormAction[FormAction["SERVER_DETAILS"] = 1] = "SERVER_DETAILS";
    FormAction[FormAction["CONSOLE"] = 2] = "CONSOLE";
    FormAction[FormAction["FILES"] = 3] = "FILES";
    FormAction[FormAction["DATABASES"] = 4] = "DATABASES";
    FormAction[FormAction["BACKUPS"] = 5] = "BACKUPS";
    FormAction[FormAction["SCHEDULES"] = 6] = "SCHEDULES";
    FormAction[FormAction["USERS"] = 7] = "USERS";
    FormAction[FormAction["POWER_CONTROL"] = 8] = "POWER_CONTROL";
    FormAction[FormAction["SETTINGS"] = 9] = "SETTINGS";
})(FormAction || (FormAction = {}));
export var PowerAction;
(function (PowerAction) {
    PowerAction["START"] = "start";
    PowerAction["STOP"] = "stop";
    PowerAction["RESTART"] = "restart";
    PowerAction["KILL"] = "kill";
})(PowerAction || (PowerAction = {}));
//# sourceMappingURL=index.js.map