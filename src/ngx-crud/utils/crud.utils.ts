import {Type} from "@angular/core";
import {Route, Router} from "@angular/router";
import {API_SERVICE, AuthGuard, IRoute, ObjectUtils} from "@stemy/ngx-utils";
import {} from "@stemy/ngx-dynamic-form";

import {
    CrudButtonPropSetting,
    CrudRouteRequest,
    GetDataType,
    CrudDataType,
    ICrudRouteActionContext,
    ICrudRouteData,
    ICrudRouteOptions,
    ICrudRouteParams,
    ICrudRouteSettings,
    CrudTreeItem
} from "../common-types";
import {getDataTransferType, getNavigateBackPath, getRequestPath, getRoutePath} from "./route.utils";
import {ContextResolverService} from "../services/context-resolver.service";

import {EmptyComponent} from "../components/base/empty.component";
import {CrudWrapperComponent} from "../components/crud-wrapper/crud-wrapper.component";
import {CrudChildWrapperComponent} from "../components/crud-child-wrapper/crud-child-wrapper.component";
import {CrudService} from "../services/crud.service";

export async function defaultCrudAction(ctx: ICrudRouteActionContext, item: any, button: string) {
    const router = ctx.injector.get(Router);
    const snapshot = ctx.context.snapshot;
    const route = !item ? button : `${button}/${item._id || item.id}`;
    const outlet = snapshot.data.actionOutlet || "primary";
    const path = getRoutePath(ctx, [{outlets: {[outlet]: route}}]);
    await router.navigateByUrl(path);
}

export async function defaultLeaveFunction(ctx: ICrudRouteActionContext, tree: CrudTreeItem[]): Promise<boolean> {
    if (ctx && ObjectUtils.isFunction(ctx.onLeave)) {
        return ctx.onLeave(tree);
    }
    return true;
}

async function returnCb(data?: any): Promise<any> {
    return data;
}

function noopCb(): any {
}

export function selectBtnProp<T extends string>(prop: CrudButtonPropSetting<T>, ctx: ICrudRouteActionContext, action: string, value: T, item?: any): T {
    prop = ObjectUtils.isFunction(prop) ? prop(ctx, item, action) : prop;
    return ObjectUtils.isString(prop) && prop
        ? prop as T : prop !== false ? value : null;
}

export function createCrudSettings(
    id: string, endpoint: string, primaryRequest: CrudRouteRequest,
    getDataType: GetDataType, params?: ICrudRouteParams, component?: Type<any>
): ICrudRouteSettings {
    return {
        id,
        endpoint,
        primaryRequest,
        getDataType,
        component,
        mode: params?.mode || "routes",
        useTabs: params?.useTabs || false,
        hideMain: params?.hideMain || false,
        addButton: params?.addButton ?? true,
        addAction: params?.addAction || defaultCrudAction,
        viewButton: params?.viewButton || false,
        viewAction: params?.viewAction || defaultCrudAction,
        editButton: params?.editButton,
        editAction: params?.editAction || defaultCrudAction,
        deleteButton: params?.deleteButton,
        deleteAction: params?.deleteAction,
        saveButton: params?.saveButton,
        api: params?.api || {
            useToken: API_SERVICE
        },
        actionsTitle: params?.actionsTitle || "",
        customActions: params?.customActions || [],
        customButtons: params?.customButtons || [],
        labelPrefix: params?.labelPrefix || "",
        filter: params?.filter || false,
        // In case if filter is enabled it should also be enabled explicitly to display both,
        // if not then it should be explicitly disabled to make it disappear
        query: params?.filter ? params.query || false : params?.query !== false,
        guards: params?.guards || [],
        onLeave: params?.onLeave || defaultLeaveFunction,
        importExports: primaryRequest == "edit" ? (params?.importExports || []) : [],
        loadContext: params?.loadContext || returnCb,
        rowAction: params?.rowAction || null,
        formContext: params?.formContext || null,
        getRequestPath: params?.getRequestPath || getRequestPath,
        getBackPath: params?.getBackPath || getNavigateBackPath,
        customizeListColumn: params?.customizeListColumn || returnCb,
        customizeFormLabel: params?.customizeFormLabel,
        customizeFormField: params?.customizeFormField,
        customizeFormData: params?.customizeFormData || returnCb,
        customizeSerializedData: params?.customizeSerializedData || returnCb,
        updateAdditionalResources: params?.updateAdditionalResources || noopCb,
        listDependencies: params?.listDependencies || [],
        itemsListed: params?.itemsListed || noopCb,
        itemsPerPage: params?.itemsPerPage || 25,
        orderBy: params?.orderBy || "",
        orderDescending: params?.orderDescending || false,
        queryForm: params?.queryForm || false,
        displayMeta: params?.displayMeta || false,
        onDragStart: params?.onDragStart,
        onDragEnter: params?.onDragEnter,
        onDrop: params?.onDrop,
        onFormChanged: params?.onFormChanged,
    };
}

export function createCrudRoute(id: string,
                                path: string,
                                settings: ICrudRouteSettings,
                                data?: ICrudRouteData,
                                children: IRoute[] = [],
                                outlet: string = "primary"): IRoute {
    return {
        path,
        component: children?.length > 0 ? CrudChildWrapperComponent : CrudWrapperComponent,
        canActivate: [AuthGuard],
        canDeactivate: [CrudService],
        data: {
            id,
            page: id,
            guards: settings.guards || [],
            children,
            settings,
            ...(data || {})
        },
        resolve: {
            context: ContextResolverService
        },
        children,
        outlet
    };
}

export function createCrudRoutes(id: string, endpoint: string, dataType: string | CrudDataType | GetDataType, options?: ICrudRouteOptions): IRoute[] {
    options = options || {};
    const params = Object.entries(options.defaultParams || {});
    const mode = options.mode || "routes";
    const isInline = mode !== "routes";
    const listOutlet = isInline ? "primary" : options.outlet;
    const formOutlet = isInline ? options.outlet || "after" : options.outlet;
    const path = endpoint.includes(":") ? endpoint : id;
    const subPath = mode !== "routes" ? `` : `${path}/`;
    const getDataType = ObjectUtils.isFunction(dataType)
        ? dataType as GetDataType
        : (ctx => getDataTransferType(dataType, ctx.primaryRequest)) as GetDataType
    const listRoutes: Route[] = mode === "dialog"
        ? [
            {
                path: "",
                pathMatch: "full",
                redirectTo: "list",
                outlet: formOutlet
            },
            {
                path: "list",
                outlet: formOutlet,
                component: EmptyComponent,
                data: {
                    empty: true
                }
            }
        ] : [
            {
                path: "",
                pathMatch: "full",
                redirectTo: "add",
                outlet: formOutlet
            }
        ];
    const formRoutes = [
        createCrudRoute(
            `add-${id}`,
            `${subPath}add`,
            createCrudSettings(id, endpoint, options.addRequest || "add", getDataType, options, options.addComponent),
            {
                mode: "none",
                page: id,
            },
            [
                ...(options.addChildren || []),
                ...(options.formChildren || []),
            ],
            formOutlet
        ),
        createCrudRoute(
            `edit-${id}`,
            `${subPath}edit/:id`,
            createCrudSettings(id, endpoint, options.editRequest || "edit", getDataType, options, options.editComponent),
            {
                mode: "none",
                page: id,
            },
            [
                ...(options.editChildren || []),
                ...(options.formChildren || []),
            ],
            formOutlet
        ),
        createCrudRoute(
            `view-${id}`,
            `${subPath}view/:id`,
            createCrudSettings(id, endpoint, options.viewRequest || "edit", getDataType, options, options.viewComponent),
            {
                mode: "none",
                page: id,
            },
            options.viewChildren || [],
            formOutlet
        )
    ];
    let defaultPath = `${path}`;
    params.forEach(([key, value]) => {
        defaultPath = defaultPath.replace(`:${key}`, `${value}`);
    });
    return [
        createCrudRoute(
            id,
            path,
            createCrudSettings(id, endpoint, "list", getDataType, options, options.listComponent),
            {
                name: options.menu !== false && !defaultPath.includes(":") ? `menu.${id}` : null,
                icon: options.icon,
                actionOutlet: isInline ? formOutlet : "primary",
                mode,
                defaultPath
            },
            isInline ? [
                ...listRoutes,
                ...formRoutes,
                ...(options.listChildren || [])
            ] : (options.listChildren || []),
            listOutlet
        ),
        ...(isInline ? [] : formRoutes)
    ];
}
