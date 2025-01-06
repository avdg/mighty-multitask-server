import {
    loginRouteHandler,
    logoutRouteHandler,
    checkAuthRouteHandler,
    checkPermissionsRouteHandler
} from "./api/auth.js";
import { accountCreateHandle } from "./api/account.js";
import { addAccuntCredentialHandler } from "../routers/api/accountCredentials.js";

export default {
    apiPathHandlers: {
        'account/create': accountCreateHandle,

        'auth': checkAuthRouteHandler,
        'auth/login': loginRouteHandler,
        'auth/logout': logoutRouteHandler,
        'auth/checkPermission': checkPermissionsRouteHandler,

        'credentials/add': addAccuntCredentialHandler,
    }
}