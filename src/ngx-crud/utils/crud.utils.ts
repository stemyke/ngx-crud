import {Type} from "@angular/core";
import {Router} from "@angular/router";
import {AuthGuard, IRoute, ObjectUtils} from "@stemy/ngx-utils";
import {DynamicFormControlComponent} from "@stemy/ngx-dynamic-form";

import {
    CrudButtonPropSetting,
    CrudRouteRequest,
    ICrudRequestType,
    ICrudRouteActionContext,
    ICrudRouteData,
    ICrudRouteOptions,
    ICrudRouteSettings
} from "../common-types";
import {getNavigateBackPath, getRequestPath, getSnapshotPath} from "./route.utils";
import {ContextResolverService} from "../services/context-resolver.service";

import {CrudChildWrapperComponent} from "../components/base/crud-child-wrapper.component";
import {CrudWrapperComponent} from "../components/base/crud-wrapper.component";

export async function defaultCrudAction(ctx: ICrudRouteActionContext, item: any, button: string) {
    const router = ctx.injector.get(Router);
    const snapshot = ctx.context.snapshot;
    const path = getSnapshotPath(snapshot, !item ? button : `${button}/${item._id || item.id}`);

    console.log(path);

    await router.navigateByUrl(path);
}

async function returnCb(data?: any): Promise<any> {
    return data;
}

function noopCb(): any {}

function dragCb(): boolean {
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

export function createCrudSettings(id: string, endpoint: string, requestType: string | ICrudRequestType, primaryRequest: CrudRouteRequest = "list", options?: ICrudRouteOptions): ICrudRouteSettings {
    return {
        id,
        endpoint,
        requestType,
        primaryRequest,
        addButton: options?.addButton,
        addAction: options?.addAction || defaultCrudAction,
        viewButton: options?.viewButton || false,
        viewAction: options?.viewAction || defaultCrudAction,
        editButton: options?.editButton,
        editAction: options?.editAction || defaultCrudAction,
        deleteButton: options?.deleteButton,
        deleteAction: options?.deleteAction,
        saveButton: options?.saveButton,
        customActions: options?.customActions || [],
        customButtons: options?.customButtons || [],
        labelPrefix: options?.labelPrefix || "",
        filter: options?.filter !== false,
        guards: options?.guards || [],
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
        itemsPerPage: options?.itemsPerPage || 12,
        filterForm: options?.filterForm || false,
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

export function createCrudRoutes(id: string, endpoint: string, requestType: string | ICrudRequestType, options?: ICrudRouteOptions): IRoute[] {
    const params = Object.entries(options?.defaultParams || {});
    const listWrapper = options?.listChildren ? CrudChildWrapperComponent : CrudWrapperComponent;
    const formWrapper = options?.formChildren ? CrudChildWrapperComponent : CrudWrapperComponent;

    let defaultPath = `${endpoint}`;
    params.forEach(([key, value]) => {
        defaultPath = defaultPath.replace(`:${key}`, `${value}`);
    });
    return [
        createCrudRoute(
            id,
            endpoint,
            options?.listComponent || listWrapper,
            createCrudSettings(id, endpoint, requestType, "list", options),
            {
                name: options?.menu !== false && !defaultPath.includes(":") ? `menu.${id}` : null,
                icon: options?.icon,
                defaultPath
            },
            options?.listChildren,
            options?.outlet
        ),
        createCrudRoute(
            `add-${id}`,
            `${endpoint}/add`,
            options?.addComponent || formWrapper,
            createCrudSettings(id, endpoint, requestType, options?.addRequest || "add", options),
            {},
            options?.formChildren,
            options?.outlet
        ),
        createCrudRoute(
            `edit-${id}`,
            `${endpoint}/edit/:id`,
            options?.editComponent || formWrapper,
            createCrudSettings(id, endpoint, requestType, options?.editRequest || "edit", options),
            {},
            options?.formChildren,
            options?.outlet
        )
    ];
}
