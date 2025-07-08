import {
    ActivatedRouteSnapshot,
    createUrlTreeFromSnapshot,
    Route,
    UrlMatchResult,
    UrlSegment,
    UrlSegmentGroup,
    UrlSerializer, UrlTree
} from "@angular/router";
import {ObjectUtils, StringUtils} from "@stemy/ngx-utils";

import {
    CrudRouteMethod,
    CrudRouteRequest,
    CrudDataType,
    ICrudRouteActionContext,
    ICrudRouteSettings
} from "../common-types";

export function checkIsDialog(snapshot: ActivatedRouteSnapshot): boolean {
    return snapshot.data.mode === 'dialog'
        || (snapshot.data.settings as ICrudRouteSettings)?.mode === 'dialog';
}

export function getSnapshotTree(snapshot: ActivatedRouteSnapshot, path: string | any[], replace: boolean = false): UrlTree {
    const commands = (Array.isArray(path) ? path : path.split("/")).filter(s => !!s);
    if (replace && snapshot.url.length > 0) {
        commands.unshift(snapshot.url.map(() => "..").join("/"));
    }
    return createUrlTreeFromSnapshot(snapshot, commands);
}

export function getSnapshotPath(snapshot: ActivatedRouteSnapshot, serializer: UrlSerializer,
                                path: string | any[], replace: boolean = false): string {
    return serializer.serialize(getSnapshotTree(snapshot, path, replace));
}

export function getRoutePath(ctx: ICrudRouteActionContext, path: string | any[], replace: boolean = false): string {
    return getSnapshotPath(ctx.snapshot, ctx.injector.get(UrlSerializer), path, replace);
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

export function getDataTransferType(dataType: string | CrudDataType, primary: string): string {
    const requestTypes: CrudDataType = (typeof dataType == "string") ? {list: dataType}: dataType;
    if (ObjectUtils.isString(requestTypes.prefixed) && requestTypes.prefixed) {
        return requestTypes[primary] || StringUtils.ucFirst(primary) + requestTypes.prefixed;
    }
    const reqType = requestTypes[primary] || requestTypes.add || requestTypes.edit || requestTypes.list;
    if (!reqType) {
        throw new Error(`At least one of the requestTypes should be provided: "list, add, edit" in crud route`);
    }
    return reqType;
}

export function getNavigateBackPath(context: ICrudRouteActionContext): string {
    const settings = context.routeData.settings as ICrudRouteSettings;
    switch (settings.mode) {
        case 'dialog':
            return getRoutePath(context, "", true);
        case 'inline':
            const id = context.entity?.id || context.entity?._id;
            return getRoutePath(context, !id ? "list" : `edit/${id}`, true);
    }
    return getRoutePath(context, context.endpoint, true);
}
