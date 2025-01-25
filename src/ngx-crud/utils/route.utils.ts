import {Injector} from "@angular/core";
import {ActivatedRouteSnapshot, Route, UrlMatchResult, UrlSegment, UrlSegmentGroup} from "@angular/router";
import {ObjectUtils, StringUtils} from "@stemy/ngx-utils";

import {
    CrudRouteMethod,
    CrudRouteRequest,
    ICrudDataType, ICrudRouteActionContext,
    ICrudRouteContext,
    ICrudRouteSettings
} from "../common-types";

export function getSnapshotPath(snapshot: ActivatedRouteSnapshot, additional: string = "", replace: boolean = false): string {
    let path = "";
    while (snapshot) {
        const segments = snapshot.url.map(s => s.path);
        if (additional) {
            if (replace) {
                segments.length = 0;
            }
            segments.push(additional);
        }
        let subPath = segments.join('/');
        path = !path ? subPath : `${subPath}/${path}`;
        if (snapshot.outlet && snapshot.outlet !== "primary") {
            path = `(${snapshot.outlet}:${path})`;
        }
        snapshot = snapshot.parent;
        additional = "";
    }
    return path;
}

export function defaultRouteMatcher(segments: UrlSegment[], group: UrlSegmentGroup, route: Route): UrlMatchResult {
    const firstSegment = group.segments[0];
    return !firstSegment || (firstSegment.path == "admin" && segments[0] == firstSegment) ? null : {consumed: segments};
}

export function getRequestPath(ctx: ICrudRouteActionContext, reqType: CrudRouteRequest, method: CrudRouteMethod, ie?: string): string {
    const entity = ctx.entity;
    const id = (!entity ? null : entity.id || entity._id) || `new/default`;
    switch (method) {
        case "delete":
            return `${ctx.endpoint}/${id}`;
        case "import":
        case "export":
            return `/${id}/${method}-${ie}`;
    }
    if (reqType === "edit") {
        return `${ctx.endpoint}/${id}`;
    }
    return (reqType === "list") !== (method === "request") ? `${ctx.endpoint}/${id}` : ctx.endpoint;
}

export function getDataTransferType(dataType: string | ICrudDataType, primary: string): string {
    const requestTypes: ICrudDataType = (typeof dataType == "string") ? {list: dataType}: dataType;
    if (ObjectUtils.isString(requestTypes.prefixed) && requestTypes.prefixed) {
        return requestTypes[primary] || StringUtils.ucFirst(primary) + requestTypes.prefixed;
    }
    const reqType = requestTypes[primary] || requestTypes.add || requestTypes.edit || requestTypes.list;
    if (!reqType) {
        throw new Error(`At least one of the requestTypes should be provided: "list, add, edit" in crud route`);
    }
    return reqType;
}

export function getNavigateBackPath(context: ICrudRouteContext, endpoint: string): string {
    const settings = context.routeData.settings as ICrudRouteSettings;
    switch (settings.mode) {
        case 'dialog':
            return getSnapshotPath(context.snapshot, 'list', true);
        case 'inline':
            const id = context.entity?.id || context.entity?._id;
            return getSnapshotPath(context.snapshot, !id ? 'list' : `edit/${id}`, true);
    }
    return getSnapshotPath(context.snapshot, endpoint, true);
}
