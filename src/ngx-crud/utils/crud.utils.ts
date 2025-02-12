import {Type} from "@angular/core";
import {Route, Router} from "@angular/router";
import {AuthGuard, IRoute, ObjectUtils} from "@stemy/ngx-utils";
import {DynamicFormControlComponent} from "@stemy/ngx-dynamic-form";

import {
    CrudButtonPropSetting,
    CrudRouteRequest,
    GetDataType,
    ICrudDataType,
    ICrudRouteActionContext,
    ICrudRouteData,
    ICrudRouteOptions,
    ICrudRouteSettings,
    ICrudTreeItem
} from "../common-types";
import {getDataTransferType, getNavigateBackPath, getRequestPath, getSnapshotPath} from "./route.utils";
import {ContextResolverService} from "../services/context-resolver.service";

import {CrudWrapperComponent} from "../components/base/crud-wrapper.component";
import {EmptyComponent} from "../components/base/empty.component";
import {CrudChildWrapperComponent} from "../components/crud-child-wrapper/crud-child-wrapper.component";
import {CrudService} from "../services/crud.service";

export async function defaultCrudAction(ctx: ICrudRouteActionContext, item: any, button: string) {
    const router = ctx.injector.get(Router);
    const snapshot = ctx.context.snapshot;
    const route = !item ? button : `${button}/${item._id || item.id}`;
    const outlet = snapshot.data.actionOutlet;
    const path = getSnapshotPath(snapshot, !outlet ? route : `(${outlet}:${route})`);
    await router.navigateByUrl(path);
}

export async function defaultLeaveFunction(ctx: ICrudRouteActionContext, tree: ICrudTreeItem[]): Promise<boolean> {
    if (ctx && ObjectUtils.isFunction(ctx.onLeave)) {
        return ctx.onLeave(tree);
    }
    return true;
}

async function returnCb(data?: any): Promise<any> {
    return data;
}

function noopCb(): any {}

function dragCb(): boolean {
    return false;
}

function leaveCb(): boolean {
    return false;
}

function getNullFormComponent(): Type<DynamicFormControlComponent> {
    return null;
}

export function selectBtnProp<T extends string>(prop: CrudButtonPropSetting<T>, ctx: ICrudRouteActionContext, action: string, value: T, item?: any): T {
    prop = ObjectUtils.isFunction(prop) ? prop(ctx, item, action) : prop;
    return ObjectUtils.isString(prop) && prop
        ? prop as T : prop !== false ? value : null;
}

export function createCrudSettings(
    id: string, endpoint: string, primaryRequest: CrudRouteRequest,
    getDataType: GetDataType, options?: ICrudRouteOptions
): ICrudRouteSettings {
    return {
        id,
        endpoint,
        getDataType,
        primaryRequest,
        mode: options?.mode || "routes",
        addButton: options?.addButton,
        addAction: options?.addAction || defaultCrudAction,
        viewButton: options?.viewButton || false,
        viewAction: options?.viewAction || defaultCrudAction,
        editButton: options?.editButton,
        editAction: options?.editAction || defaultCrudAction,
        deleteButton: options?.deleteButton,
        deleteAction: options?.deleteAction,
        saveButton: options?.saveButton,
        actionsTitle: options?.actionsTitle || "",
        customActions: options?.customActions || [],
        customButtons: options?.customButtons || [],
        labelPrefix: options?.labelPrefix || "",
        filter: options?.filter || false,
        // In case if filter is enabled it should also be enabled explicitly to display both,
        // if not then it should be explicitly disabled to make it disappear
        query: options?.filter ? options.query || false : options?.query !== false,
        guards: options?.guards || [],
        onLeave: options?.onLeave || defaultLeaveFunction,
        importExports: primaryRequest == "edit" ? (options?.importExports || []) : [],
        loadContext: options?.loadContext || returnCb,
        formValueChange: options?.formValueChange || noopCb,
        getFormComponent: options?.getFormComponent || getNullFormComponent,
        rowAction: options?.rowAction || null,
        formContext: options?.formContext || null,
        getRequestPath: options?.getRequestPath || getRequestPath,
        getBackPath: options?.getBackPath || getNavigateBackPath,
        customizeListColumn: options?.customizeListColumn || returnCb,
        customizeFormModel: options?.customizeFormModel,
        customizeFormData: options?.customizeFormData || returnCb,
        customizeSerializedData: options?.customizeSerializedData || returnCb,
        updateAdditionalResources: options?.updateAdditionalResources || noopCb,
        listDependencies: options?.listDependencies || [],
        itemsListed: options?.itemsListed || noopCb,
        itemsPerPage: options?.itemsPerPage || 25,
        queryForm: options?.queryForm || false,
        displayMeta: options?.displayMeta || false,
        onDragStart: options?.onDragStart || dragCb,
        onDragEnter: options?.onDragEnter || dragCb,
        onDrop: options?.onDrop || dragCb,
    };
}

export function createCrudRoute(id: string,
                                path: string,
                                component: Type<any>,
                                settings: ICrudRouteSettings,
                                data?: ICrudRouteData,
                                children?: IRoute[],
                                outlet?: string): IRoute {
    return {
        path,
        component,
        canActivate: [AuthGuard],
        canDeactivate: [CrudService],
        data: {
            id,
            guards: settings.guards || [],
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

export function createCrudRoutes(id: string, endpoint: string, dataType: string | ICrudDataType | GetDataType, options?: ICrudRouteOptions): IRoute[] {
    options = options || {};
    const params = Object.entries(options.defaultParams || {});
    const mode = options.mode || 'routes';
    const isInline = mode !== 'routes';
    const listWrapper = isInline || options.listChildren
        ? CrudChildWrapperComponent : CrudWrapperComponent;
    const formWrapper = options.formChildren
        ? CrudChildWrapperComponent : CrudWrapperComponent;
    const listOutlet = isInline ? 'primary' : options.outlet;
    const formOutlet = isInline ? options.outlet || 'after' : options.outlet;
    const path = endpoint.includes(':') ? endpoint : id;
    const subPath = mode !== 'routes' ? `` : `${path}/`;
    const getDataType = ObjectUtils.isFunction(dataType)
        ? dataType as GetDataType
        : (ctx => getDataTransferType(dataType, ctx.primaryRequest)) as GetDataType
    const listRoutes: Route[] = mode === 'dialog'
        ? [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'list',
                outlet: formOutlet
            },
            {
                path: 'list',
                outlet: formOutlet,
                component: EmptyComponent,
                data: {
                    empty: true
                }
            }
        ] : [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'add',
                outlet: formOutlet
            }
        ];
    const formRoutes = [
        createCrudRoute(
            `add-${id}`,
            `${subPath}add`,
            options.addComponent || formWrapper,
            createCrudSettings(id, endpoint, options.addRequest || "add", getDataType, options),
            {
                mode: 'none'
            },
            options.formChildren,
            formOutlet
        ),
        createCrudRoute(
            `edit-${id}`,
            `${subPath}edit/:id`,
            options.editComponent || formWrapper,
            createCrudSettings(id, endpoint, options.editRequest || "edit", getDataType, options),
            {
                mode: 'none'
            },
            options.formChildren,
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
            options.listComponent || listWrapper,
            createCrudSettings(id, endpoint, "list", getDataType, options),
            {
                name: options.menu !== false && !defaultPath.includes(":") ? `menu.${id}` : null,
                icon: options.icon,
                actionOutlet: formOutlet,
                mode,
                defaultPath
            },
            isInline ? [
                ...listRoutes,
                ...formRoutes,
                ...(options.listChildren || [])
            ] : options.listChildren,
            listOutlet
        ),
        ...(isInline ? [] : formRoutes)
    ];
}
