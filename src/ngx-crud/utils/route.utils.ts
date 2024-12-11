import {Injector} from "@angular/core";
import {Route, UrlMatchResult, UrlSegment, UrlSegmentGroup} from "@angular/router";
import {ObjectUtils, StateService, StringUtils} from "@stemy/ngx-utils";

import {CrudRouteMethod, CrudRouteRequest, ICrudRequestType, ICrudRouteContext} from "../common-types";

export function defaultRouteMatcher(segments: UrlSegment[], group: UrlSegmentGroup, route: Route): UrlMatchResult {
    const firstSegment = group.segments[0];
    return !firstSegment || (firstSegment.path == "admin" && segments[0] == firstSegment) ? null : {consumed: segments};
}

export async function getRequestPath(endpoint: string, item: Record<string, any>, reqType: CrudRouteRequest, method: CrudRouteMethod, injector: Injector, importExport?: string): Promise<string> {
    const id = (!item ? null : item._id || item.id) || `new/default`;
    switch (method) {
        case "delete":
            return `${endpoint}/${id}`;
        case "import":
        case "export":
            return `/${id}/${method}-${importExport}`;
    }
    if (reqType === "edit") {
        return `${endpoint}/${id}`;
    }
    return (reqType === "list") !== (method === "request") ? `${endpoint}/${id}` : endpoint;
}

export function getRequestType(requestType: string | ICrudRequestType, primary: string): string {
    const requestTypes: ICrudRequestType = (typeof requestType == "string") ? {list: requestType}: requestType;
    if (ObjectUtils.isString(requestTypes.prefixed) && requestTypes.prefixed) {
        return requestTypes[primary] || StringUtils.ucFirst(primary) + requestTypes.prefixed;
    }
    const reqType = requestTypes[primary] || requestTypes.add || requestTypes.edit || requestTypes.list;
    if (!reqType) {
        throw new Error(`At least one of the requestTypes should be provided: "list, add, edit" in crud route`);
    }
    return reqType;
}

export async function getNavigateBackPath(endpoint: string, reqType: CrudRouteRequest, context: ICrudRouteContext, injector: Injector): Promise<Array<string | UrlSegment>> {
    const state = injector.get(StateService);
    const path: Array<string | UrlSegment> = [endpoint];
    let snapshot = state.snapshot?.parent;
    while (snapshot) {
        path.unshift(...snapshot.url.map(s => s.path));
        snapshot = snapshot.parent;
    }
    return path;
}
