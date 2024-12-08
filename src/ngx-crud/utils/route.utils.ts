import {Injector} from "@angular/core";
import {Route, UrlMatchResult, UrlSegment, UrlSegmentGroup} from "@angular/router";
import {ObjectUtils, StringUtils} from "@stemy/ngx-utils";

import {CrudRouteMethod, CrudRouteRequest, ICrudRequestType} from "../common-types";

export function defaultRouteMatcher(segments: UrlSegment[], group: UrlSegmentGroup, route: Route): UrlMatchResult {
    const firstSegment = group.segments[0];
    return !firstSegment || (firstSegment.path == "admin" && segments[0] == firstSegment) ? null : {consumed: segments};
}

export async function getRequestPath(id: string, reqType: CrudRouteRequest, method: CrudRouteMethod, injector: Injector, importExport?: string): Promise<string> {
    switch (method) {
        case "delete":
            return `/${id}`;
        case "import":
        case "export":
            return `/${id}/${method}-${importExport}`;
    }
    id = !id ? `/new/default` : `/${id}`;
    if (reqType === "edit") {
        return id;
    }
    return (reqType === "list") !== (method === "request") ? id : ``;
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
